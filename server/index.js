require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// ── Sentry error monitoring (must init before everything else) ────
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initSharedTables } = require('./db/database');
const { initAuthTables, cleanExpiredTokens } = require('./services/auth');
const { initBillingTables } = require('./services/stripe');
const { requireAuth } = require('./middleware/requireAuth');
const { requireWorkspace } = require('./middleware/requireWorkspace');
const { errorHandler } = require('./middleware/errorHandler');
const { logger, requestIdMiddleware } = require('./services/logger');
const { apiResponse } = require('./middleware/apiResponse');
const { pagination } = require('./middleware/pagination');
const { requireRole } = require('./middleware/requireRole');
const { db } = require('./db/database');

// ── Production env var validation ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const recommended = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CORS_ORIGIN'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`FATAL: Missing required env vars in production: ${missing.join(', ')}`);
    process.exit(1);
  }
  const missingRec = recommended.filter(k => !process.env[k]);
  if (missingRec.length) {
    console.warn(`WARNING: Missing recommended env vars: ${missingRec.join(', ')}`);
  }
}

const app = express();

// Modules that require owner or admin role
const ADMIN_MODULES = new Set([
  'team', 'integrations', 'api-manager', 'webhooks', 'workflow-builder',
  'autopilot', 'automation-settings',
]);
const PORT = process.env.PORT || 3000;

// CORS — allow Vercel frontend in production, localhost in dev
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: corsOrigins.length ? corsOrigins : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./routes/billing').webhookHandler);

app.set('trust proxy', 1);
app.use('/api/creative', express.json({ limit: '20mb' }));
app.use('/api/video', express.json({ limit: '20mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", ...corsOrigins],
      mediaSrc: ["'self'", "blob:", "https:"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later', code: 'RATE_LIMIT_EXCEEDED' },
}));
app.use(compression());

// Attach unique request ID to every request
app.use(requestIdMiddleware);

// Standardized API response helpers (res.success, res.paginated, res.error)
app.use(apiResponse);

// Pagination middleware — parses ?page=&limit= into req.pagination
app.use(pagination);

// CSRF protection — validate Origin/Referer on all state-changing requests
app.use((req, res, next) => {
  // Skip safe methods and webhook endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path === '/api/billing/webhook') return next();

  // Validate Origin/Referer matches allowed origins (all environments)
  const origin = req.headers.origin || req.headers.referer;
  const host = req.headers.host;
  const ownOrigins = host ? [`https://${host}`, `http://${host}`] : [];
  const allAllowed = [...corsOrigins, ...ownOrigins];
  if (origin && !allAllowed.some(o => origin.startsWith(o))) {
    return res.status(403).json({ error: 'Invalid origin', code: 'CSRF_REJECTED' });
  }
  next();
});

// ── Async startup ─────────────────────────────────────────────────
async function startServer() {

// Initialize database tables
await initSharedTables();
await initAuthTables();
await initBillingTables();

// Run all database migrations (idempotent — tracked in schema_migrations table)
const { runAllMigrations } = require('./db/migrations/runner');
await runAllMigrations();

// Auth routes (public — no auth required)
app.use('/api/auth', require('./routes/auth'));

// Workspace routes (require auth but NOT workspace context)
app.use('/api/workspaces', require('./routes/workspaces'));

// GDPR routes (require auth but NOT workspace context)
app.use('/api/gdpr', require('./routes/gdpr'));

// Scrape route (require auth but NOT workspace context — scrapes public URLs)
const scrapeRoutes = require('./services/scraper').router;
app.use('/api/scrape', requireAuth, scrapeRoutes);

// Protect all other API routes with auth + workspace
app.use('/api', async (req, res, next) => {
  // Allow unauthenticated access to auth routes (already handled above)
  // and to the modules registry (used by landing page)
  if (req.path === '/modules' || req.path === '/health') return next();
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireWorkspace(req, res, next);
  });
});

// Billing routes (authenticated, behind workspace middleware)
app.use('/api/billing', require('./routes/billing').router);

// Auto-discover and mount modules
const modulesDir = path.join(__dirname, 'modules');
const moduleEntries = fs.readdirSync(modulesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const loadedModules = [];

for (const moduleName of moduleEntries) {
  const manifestPath = path.join(modulesDir, moduleName, 'index.js');
  if (!fs.existsSync(manifestPath)) continue;

  try {
    const mod = require(manifestPath);
    if (mod.initDatabase) await mod.initDatabase();
    if (mod.getRouter) {
      const prefix = mod.apiPrefix || `/api/${moduleName}`;
      if (ADMIN_MODULES.has(moduleName)) {
        app.use(prefix, requireRole('owner', 'admin'), mod.getRouter());
      } else {
        app.use(prefix, mod.getRouter());
      }
    }
    loadedModules.push({ id: mod.id || moduleName, name: mod.name || moduleName });
    console.log(`  Module loaded: ${mod.name || moduleName}`);
  } catch (err) {
    console.error(`  Failed to load module "${moduleName}":`, err.message);
  }
}

// Module registry endpoint
app.get('/api/modules', async (req, res) => {
  res.json(loadedModules);
});

// Activity log endpoint
const { getRecentActivity } = require('./db/database');
app.get('/api/activity', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(await getRecentActivity(limit, req.workspace?.id));
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    modules: loadedModules.length,
  });
});

// Admin cleanup endpoint — POST /api/admin/cleanup-storage
app.post('/api/admin/cleanup-storage', requireAuth, async (req, res) => {
  const maxAgeDays = req.query.days !== undefined ? parseInt(req.query.days) : 7;
  const result = cleanupOldMedia(maxAgeDays);
  res.json({ ok: true, ...result, freedMB: (result.freed / 1024 / 1024).toFixed(1) });
});

// Catch-all 404 for unmatched /api/* routes
app.all('/api/*', async (req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// Serve generated media — UUIDs in filenames act as access tokens
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
const setCors = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};
app.use('/videos', setCors, express.static(path.join(dataDir, 'videos'), { maxAge: '1d' }));
app.use('/uploads/brand-media', setCors, express.static(path.join(dataDir, 'uploads', 'brand-media'), { maxAge: '1d' }));
app.use('/uploads/creatives', setCors, express.static(path.join(dataDir, 'uploads', 'creatives'), { maxAge: '1d' }));

// Serve static frontend only when running locally (Vercel handles this in production)
if (!process.env.RAILWAY_ENVIRONMENT) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist, { maxAge: '1y', immutable: true }));
  app.get('*', async (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// Sentry error handler (must be before custom error handler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler (must be last)
app.use(errorHandler);

// Clean up expired refresh tokens every hour
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

// Send trial expiration reminder emails (runs daily)
const { sendTrialExpiring } = require('./services/email');
async function checkTrialExpirations() {
  try {
    const rows = await db.prepare(`
      SELECT s.user_id, s.trial_ends_at, u.email, u.display_name
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'trialing' AND s.trial_ends_at IS NOT NULL
    `).all();

    const now = Date.now();
    for (const row of rows) {
      const trialEnd = new Date(row.trial_ends_at).getTime();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      // Send reminders at 3 days and 1 day before expiration
      if (daysLeft === 3 || daysLeft === 1) {
        sendTrialExpiring(row.email, row.display_name, daysLeft).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('Trial expiration check failed', { message: err.message });
  }
}
setInterval(checkTrialExpirations, 24 * 60 * 60 * 1000); // every 24 hours
checkTrialExpirations(); // run once on startup

// ── Media storage cleanup ──────────────────────────────────────────
// Deletes old generated videos to prevent ENOSPC.
// Creative images (uploads/creatives/) are NOT cleaned — they appear in the history tab.
function cleanupOldMedia(maxAgeDays = 7) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const dirs = [
    path.join(dataDir, 'videos'),
  ];
  let deleted = 0;
  let freed = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      // Never delete brand-media or protected dirs — only generated files
      const fp = path.join(dir, file);
      try {
        const stat = fs.statSync(fp);
        if (stat.isFile() && stat.mtimeMs < cutoff) {
          freed += stat.size;
          fs.unlinkSync(fp);
          deleted++;
        }
      } catch { /* ignore locked/missing */ }
    }
  }
  if (deleted > 0) {
    logger.info(`[cleanup] Removed ${deleted} old media files, freed ${(freed / 1024 / 1024).toFixed(1)} MB`);
  }
  return { deleted, freed };
}

// Run cleanup on startup and daily
cleanupOldMedia(7);
setInterval(() => cleanupOldMedia(7), 24 * 60 * 60 * 1000);

// Start the automation rule engine
const { startRuleEngine } = require('./services/ruleEngine');
startRuleEngine();

// Start the ads optimizer (polls metrics + AI analysis every 6 hours)
const { startAdsOptimizer } = require('./modules/paid-advertising/services/adsOptimizer');
startAdsOptimizer();

const server = app.listen(PORT, () => {
  logger.info(`Overload server running on http://localhost:${PORT}`, { modules: loadedModules.length });
});

return server;
} // end startServer()

let server;
startServer()
  .then(s => { server = s; })
  .catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });

// ── Graceful shutdown ──────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) server.close(() => {
    logger.info('HTTP server closed');
    db.close().catch(() => {});
    logger.info('Database connection closed');
    process.exit(0);
  });
  // Force exit after 10 s if connections linger
  setTimeout(() => { process.exit(1); }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Process-level error safety nets ────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { stack: err.stack, message: err.message });
  db.close().catch(() => {})
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

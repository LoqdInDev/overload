require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

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
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true,
}));

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./routes/billing').webhookHandler);

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                 // 1000 requests per window per IP (app uses frequent polling)
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

// CSRF protection via double-submit cookie pattern for state-changing requests
app.use((req, res, next) => {
  // Skip non-state-changing methods and webhook endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path === '/api/billing/webhook') return next();

  // In production, validate Origin/Referer matches allowed origins
  if (process.env.NODE_ENV === 'production') {
    const origin = req.headers.origin || req.headers.referer;
    if (origin && !corsOrigins.some(o => origin.startsWith(o))) {
      return res.status(403).json({ error: 'Invalid origin', code: 'CSRF_REJECTED' });
    }
  }
  next();
});

// Initialize database tables
initSharedTables();
initAuthTables();
initBillingTables();

// Run all database migrations (idempotent — tracked in schema_migrations table)
const { runAllMigrations } = require('./db/migrations/runner');
runAllMigrations();

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
app.use('/api', (req, res, next) => {
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
    if (mod.initDatabase) mod.initDatabase();
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
app.get('/api/modules', (req, res) => {
  res.json(loadedModules);
});

// Activity log endpoint
const { getRecentActivity } = require('./db/database');
app.get('/api/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(getRecentActivity(limit, req.workspace?.id));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    modules: loadedModules.length,
  });
});

// Catch-all 404 for unmatched /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// Serve generated media — UUIDs in filenames act as access tokens
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
app.use('/videos', express.static(path.join(dataDir, 'videos'), { maxAge: '1d' }));
app.use('/uploads/brand-media', express.static(path.join(dataDir, 'uploads', 'brand-media'), { maxAge: '1d' }));
app.use('/uploads/creatives', express.static(path.join(dataDir, 'uploads', 'creatives'), { maxAge: '1d' }));

// Serve static frontend only when running locally (Vercel handles this in production)
if (!process.env.RAILWAY_ENVIRONMENT) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist, { maxAge: '1y', immutable: true }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// Global error handler (must be last)
app.use(errorHandler);

// Clean up expired refresh tokens every hour
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

// Start the automation rule engine
const { startRuleEngine } = require('./services/ruleEngine');
startRuleEngine();

const server = app.listen(PORT, () => {
  logger.info(`Overload server running on http://localhost:${PORT}`, { modules: loadedModules.length });
});

// ── Graceful shutdown ──────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    try { db.close(); } catch (_) { /* already closed */ }
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
  try { db.close(); } catch (_) { /* ignore */ }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

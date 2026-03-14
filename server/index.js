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
  const required = ['JWT_SECRET'];
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    console.error('FATAL: Missing DATABASE_URL or PGHOST — cannot connect to database');
    process.exit(1);
  }
  const recommended = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CORS_ORIGIN', 'ADMIN_EMAILS'];
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
  'team', 'integrations', 'workflow-builder',
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

// Request access logging
app.use((req, res, next) => {
  if (req.path === '/api/health') return next(); // skip health check noise
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

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

// Initialize database tables (auth first — users table is referenced by workspace_members)
await initAuthTables();
await initSharedTables();
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
  let dbStatus = 'ok';
  let dbLatency = 0;
  try {
    const start = Date.now();
    await db.prepare('SELECT 1').get();
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = 'error';
  }
  const mem = process.memoryUsage();
  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    modules: loadedModules.length,
    database: { status: dbStatus, latencyMs: dbLatency },
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1048576),
      heapTotalMB: Math.round(mem.heapTotal / 1048576),
      rssMB: Math.round(mem.rss / 1048576),
    },
  });
});

// Admin cleanup endpoint — POST /api/admin/cleanup-storage
app.post('/api/admin/cleanup-storage', requireAuth, async (req, res) => {
  const maxAgeDays = req.query.days !== undefined ? parseInt(req.query.days) : 7;
  const result = cleanupOldMedia(maxAgeDays);
  res.json({ ok: true, ...result, freedMB: (result.freed / 1024 / 1024).toFixed(1) });
});

// Admin-only middleware (locked to platform owner via env var)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const requireSuperAdmin = (req, res, next) => {
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(req.user?.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  logger.info(`[Admin] ${req.user.email} accessed ${req.method} ${req.path}`, { userId: req.user.id });
  next();
};

// Admin: DB size analysis
app.get('/api/admin/db-size', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const tables = await db.pool.query(`
      SELECT schemaname, tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
      FROM pg_tables WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    const dbSize = await db.pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size, pg_database_size(current_database()) AS db_bytes`);
    const rowCounts = await db.pool.query(`
      SELECT relname AS tablename, n_live_tup AS estimated_rows
      FROM pg_stat_user_tables ORDER BY n_live_tup DESC
    `);
    res.json({ database: dbSize.rows[0], tables: tables.rows, rowCounts: rowCounts.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: DB backup (JSON dump of all tables)
app.get('/api/admin/db-backup', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const tablesResult = await db.pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    const backup = {};
    for (const { tablename } of tablesResult.rows) {
      const data = await db.pool.query(`SELECT * FROM "${tablename}"`);
      backup[tablename] = data.rows;
    }
    res.setHeader('Content-Disposition', `attachment; filename="overload-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(backup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: Volume/disk usage breakdown
app.get('/api/admin/disk-usage', requireAuth, requireSuperAdmin, async (req, res) => {
  const volDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
  function dirSize(dir) {
    let total = 0, count = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fp = path.join(dir, e.name);
        if (e.isFile()) { total += fs.statSync(fp).size; count++; }
        else if (e.isDirectory()) { const sub = dirSize(fp); total += sub.bytes; count += sub.files; }
      }
    } catch { /* dir may not exist */ }
    return { bytes: total, files: count };
  }
  const dirs = [
    { name: 'Creative Images', path: 'uploads/creatives' },
    { name: 'Brand Media', path: 'uploads/brand-media' },
    { name: 'Videos', path: 'videos' },
    { name: 'PostgreSQL Data', path: 'pgdata' },
  ];
  const results = dirs.map(d => {
    const full = path.join(volDir, d.path);
    const info = dirSize(full);
    return { name: d.name, path: d.path, bytes: info.bytes, files: info.files, size: info.bytes > 1048576 ? (info.bytes / 1048576).toFixed(1) + ' MB' : (info.bytes / 1024).toFixed(1) + ' KB' };
  });
  // Also get total volume usage
  const volTotal = dirSize(volDir);
  res.json({ volumePath: volDir, total: { bytes: volTotal.bytes, files: volTotal.files, size: volTotal.bytes > 1048576 ? (volTotal.bytes / 1048576).toFixed(1) + ' MB' : (volTotal.bytes / 1024).toFixed(1) + ' KB' }, directories: results });
});

// Admin: Purge files from a volume directory
app.post('/api/admin/purge-dir', requireAuth, requireSuperAdmin, async (req, res) => {
  const { dir } = req.body;
  const allowed = ['uploads/creatives', 'videos'];
  if (!dir || !allowed.includes(dir)) return res.status(400).json({ error: 'Invalid directory' });
  const volDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
  const target = path.join(volDir, dir);
  let deleted = 0, freed = 0;
  try {
    if (fs.existsSync(target)) {
      const files = fs.readdirSync(target);
      for (const f of files) {
        const fp = path.join(target, f);
        try {
          const stat = fs.statSync(fp);
          if (stat.isFile()) { freed += stat.size; fs.unlinkSync(fp); deleted++; }
        } catch { /* skip */ }
      }
    }
    // Also clean DB references for creatives
    if (dir === 'uploads/creatives') {
      await db.pool.query(`DELETE FROM cd_images`);
      await db.pool.query(`DELETE FROM cd_projects`);
    }
    res.json({ ok: true, deleted, freedMB: (freed / 1048576).toFixed(1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// Start the integration sync scheduler (syncs Shopify data every 30 minutes)
const { startSyncScheduler } = require('./services/syncScheduler');
startSyncScheduler();

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

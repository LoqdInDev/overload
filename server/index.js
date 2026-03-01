require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initSharedTables } = require('./db/database');
const { initAuthTables, cleanExpiredTokens } = require('./services/auth');
const { requireAuth } = require('./middleware/requireAuth');
const { requireWorkspace } = require('./middleware/requireWorkspace');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
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
app.use(express.json({ limit: '10mb' }));

// Initialize database tables
initSharedTables();
initAuthTables();

// Run workspace migration (idempotent — adds workspace_id to tables that lack it)
const { runMigration } = require('./db/migrations/add-workspace-id');
runMigration();

// Auth routes (public — no auth required)
app.use('/api/auth', require('./routes/auth'));

// Workspace routes (require auth but NOT workspace context)
app.use('/api/workspaces', require('./routes/workspaces'));

// Protect all other API routes with auth + workspace
app.use('/api', (req, res, next) => {
  // Allow unauthenticated access to auth routes (already handled above)
  // and to the modules registry (used by landing page)
  if (req.path === '/modules') return next();
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireWorkspace(req, res, next);
  });
});

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
      app.use(prefix, mod.getRouter());
    }
    loadedModules.push({ id: mod.id || moduleName, name: mod.name || moduleName });
    console.log(`  Module loaded: ${mod.name || moduleName}`);
  } catch (err) {
    console.error(`  Failed to load module "${moduleName}":`, err.message);
  }
}

// Shared API routes
const scrapeRoutes = require('./services/scraper').router;
app.use('/api/scrape', scrapeRoutes);

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

// Serve generated videos and brand media (use volume in production)
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
app.use('/videos', express.static(path.join(dataDir, 'videos')));
app.use('/uploads/brand-media', express.static(path.join(dataDir, 'uploads', 'brand-media')));
app.use('/uploads/creatives', express.static(path.join(dataDir, 'uploads', 'creatives')));

// Serve static frontend only when running locally (Vercel handles this in production)
if (!process.env.RAILWAY_ENVIRONMENT) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
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

app.listen(PORT, () => {
  console.log(`\n  Overload server running on http://localhost:${PORT}`);
  console.log(`  ${loadedModules.length} module(s) active\n`);
});

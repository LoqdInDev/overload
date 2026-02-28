const express = require('express');
const { db } = require('../../../db/database');
const pm = require('../../../services/platformManager');

const router = express.Router();

// Overview stats — counts per module
router.get('/overview', (req, res) => {
  const wsId = req.workspace.id;
  const stats = db.prepare(`
    SELECT module_id, COUNT(*) as count
    FROM activity_log
    WHERE workspace_id = ?
    GROUP BY module_id
    ORDER BY count DESC
  `).all(wsId);

  const total = stats.reduce((sum, s) => sum + s.count, 0);

  res.json({ total, modules: stats });
});

// Activity feed with pagination
router.get('/activity', (req, res) => {
  const wsId = req.workspace.id;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const moduleId = req.query.module;

  let query = 'SELECT * FROM activity_log WHERE workspace_id = ?';
  const params = [wsId];

  if (moduleId) {
    query += ' AND module_id = ?';
    params.push(moduleId);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const activity = db.prepare(query).all(...params);
  res.json(activity);
});

// Daily breakdown for charts
router.get('/daily', (req, res) => {
  const wsId = req.workspace.id;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const moduleId = req.query.module;

  let query = `
    SELECT date(created_at) as date, module_id, COUNT(*) as count
    FROM activity_log
    WHERE created_at >= datetime('now', '-${days} days') AND workspace_id = ?
  `;

  const params = [wsId];
  if (moduleId) {
    query += ' AND module_id = ?';
    params.push(moduleId);
  }

  query += ' GROUP BY date(created_at), module_id ORDER BY date ASC';

  const daily = db.prepare(query).all(...params);
  res.json(daily);
});

// Module-specific stats
router.get('/module/:moduleId', (req, res) => {
  const wsId = req.workspace.id;
  const { moduleId } = req.params;

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM activity_log WHERE module_id = ? AND workspace_id = ?'
  ).get(moduleId, wsId);

  const actions = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM activity_log
    WHERE module_id = ? AND workspace_id = ?
    GROUP BY action
    ORDER BY count DESC
  `).all(moduleId, wsId);

  const recent = db.prepare(`
    SELECT * FROM activity_log
    WHERE module_id = ? AND workspace_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(moduleId, wsId);

  res.json({
    module_id: moduleId,
    total: total.count,
    actions,
    recent,
  });
});

// ══════════════════════════════════════════════════════
// Real Platform Analytics Routes
// ══════════════════════════════════════════════════════

// GET /platforms - pull analytics from connected platforms
router.get('/platforms', async (req, res) => {
  try {
    const { provider, startDate, endDate, period } = req.query;
    const results = {};

    const socialProviders = ['twitter', 'linkedin', 'meta', 'google', 'tiktok', 'pinterest'];
    const providers = provider ? [provider] : socialProviders;

    for (const pid of providers) {
      if (!pm.isConnected(pid)) continue;
      try {
        results[pid] = await pm.socialAnalytics(pid, { startDate, endDate, period });
      } catch (e) {
        results[pid] = { error: e.message };
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Platform analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/ads - pull ad metrics from connected ad platforms
router.get('/platforms/ads', async (req, res) => {
  try {
    const { startDate, endDate, customerId, adAccountId } = req.query;
    const results = {};

    if (pm.isConnected('google')) {
      try {
        results.google = await pm.adsCampaigns('google', { customerId });
      } catch (e) { results.google = { error: e.message }; }
    }

    if (pm.isConnected('meta')) {
      try {
        results.meta = await pm.adsCampaigns('meta', { adAccountId });
      } catch (e) { results.meta = { error: e.message }; }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/connected - list which platforms are connected
router.get('/platforms/connected', (req, res) => {
  try {
    const connected = pm.getConnectedProviders();
    res.json({ success: true, data: connected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

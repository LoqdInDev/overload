const express = require('express');
const { db } = require('../../../db/database');
const pm = require('../../../services/platformManager');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

const router = express.Router();

// Overview stats — counts per module, optional date range
router.get('/overview', (req, res) => {
  const wsId = req.workspace.id;
  const { start_date, end_date, days } = req.query;

  let dateCond = '';
  const params = [wsId];
  if (start_date) { dateCond += ' AND created_at >= ?'; params.push(start_date); }
  else if (days) { const safeDays = Math.min(Math.max(parseInt(days) || 7, 1), 365); dateCond += ` AND created_at >= datetime('now', '-${safeDays} days')`; }
  if (end_date) { dateCond += ' AND created_at <= ?'; params.push(end_date); }

  const stats = db.prepare(`
    SELECT module_id, COUNT(*) as count
    FROM activity_log
    WHERE workspace_id = ?${dateCond}
    GROUP BY module_id
    ORDER BY count DESC
  `).all(...params);

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  res.json({ total, modules: stats, period: days ? `Last ${days} days` : start_date ? `${start_date} to ${end_date || 'now'}` : 'All time' });
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
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 90);
  const moduleId = req.query.module;

  let query = `
    SELECT date(created_at) as date, module_id, COUNT(*) as count
    FROM activity_log
    WHERE created_at >= datetime('now', '-' || ? || ' days') AND workspace_id = ?
  `;

  const params = [days, wsId];
  if (moduleId) {
    query += ' AND module_id = ?';
    params.push(moduleId);
  }

  query += ' GROUP BY date(created_at), module_id ORDER BY date ASC';

  const daily = db.prepare(query).all(...params);
  res.json(daily);
});

// Module-specific stats with optional date range
router.get('/module/:moduleId', (req, res) => {
  const wsId = req.workspace.id;
  const { moduleId } = req.params;
  const { start_date, end_date, days } = req.query;

  let dateCond = '';
  const baseParams = [moduleId, wsId];
  const dateParams = [];
  if (start_date) { dateCond += ' AND created_at >= ?'; dateParams.push(start_date); }
  else if (days) { const safeDays = Math.min(Math.max(parseInt(days) || 7, 1), 365); dateCond += ` AND created_at >= datetime('now', '-${safeDays} days')`; }
  if (end_date) { dateCond += ' AND created_at <= ?'; dateParams.push(end_date); }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM activity_log WHERE module_id = ? AND workspace_id = ?${dateCond}`
  ).get(...baseParams, ...dateParams);

  const actions = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM activity_log
    WHERE module_id = ? AND workspace_id = ?${dateCond}
    GROUP BY action
    ORDER BY count DESC
  `).all(...baseParams, ...dateParams);

  const recent = db.prepare(`
    SELECT * FROM activity_log
    WHERE module_id = ? AND workspace_id = ?${dateCond}
    ORDER BY created_at DESC
    LIMIT 10
  `).all(...baseParams, ...dateParams);

  res.json({ module_id: moduleId, total: total.count, actions, recent });
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

// POST /detect-anomaly — detect metric anomalies
router.post('/detect-anomaly', async (req, res) => {
  const { metric_name, current_value, historical_average, standard_deviation } = req.body;
  if (!metric_name) return res.status(400).json({ error: 'metric_name required' });

  try {
    const { text } = await generateTextWithClaude(`You are a data analyst. Analyze this metric for anomalies:

Metric: ${metric_name}
Current Value: ${current_value}
Historical Average: ${historical_average}
Standard Deviation: ${standard_deviation || 'Unknown'}

Return JSON:
{
  "is_anomaly": <true|false>,
  "severity": "none|low|medium|high",
  "z_score": <approximate z-score>,
  "explanation": "<2 sentences explaining what this means>",
  "likely_causes": ["<cause 1>", "<cause 2>"],
  "recommended_action": "<specific action to take>"
}

Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { res.json(JSON.parse(m[0])); } catch { res.status(500).json({ error: 'Failed to parse anomaly result' }); } }
      else res.status(500).json({ error: 'Failed to parse anomaly result' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate-insights — SSE: generate AI insights on analytics data
router.post('/generate-insights', (req, res) => {
  const { metrics, period } = req.body;
  if (!metrics?.length) { res.status(400).json({ error: 'metrics required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a marketing analytics expert. Generate actionable insights for this data:

Period: ${period || 'Last 30 days'}
Metrics: ${JSON.stringify(metrics)}

Write a structured analysis with:

## Performance Summary
(2-3 sentences on overall performance)

## Key Wins
(what's working well, be specific)

## Areas of Concern
(what needs attention, be specific)

## Top 3 Recommendations
(numbered, specific, actionable)

## Leading Indicators to Watch
(what to monitor going forward)

Be specific, data-driven, and actionable.`;

  generateTextWithClaude(prompt, {
    onChunk: (chunk) => sse.sendChunk(chunk),
  })
    .then(({ text }) => sse.sendResult({ content: text, done: true }))
    .catch((err) => sse.sendError(err));
});

module.exports = router;

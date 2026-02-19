const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate autopilot content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Autopilot`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('autopilot', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Autopilot generation error:', error);
    sse.sendError(error);
  }
});

// Get autopilot configuration
router.get('/config', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM ap_config ORDER BY created_at DESC LIMIT 1').get();
    res.json(config || {});
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch autopilot config' });
  }
});

// Create or update autopilot configuration
router.post('/config', (req, res) => {
  try {
    const { brand_id, modules_enabled, strategy, risk_level, status } = req.body;
    const result = db.prepare(
      'INSERT INTO ap_config (brand_id, modules_enabled, strategy, risk_level, status) VALUES (?, ?, ?, ?, ?)'
    ).run(brand_id, JSON.stringify(modules_enabled || []), strategy, risk_level || 'conservative', status || 'inactive');

    logActivity('autopilot', 'config', `Updated autopilot configuration`, 'Configuration');
    res.json({ id: result.lastInsertRowid, status: status || 'inactive' });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save autopilot config' });
  }
});

// Get autopilot actions
router.get('/actions', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM ap_actions';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const actions = db.prepare(query).all(...params);
    res.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// Approve a pending action
router.post('/actions/:id/approve', (req, res) => {
  try {
    const action = db.prepare('SELECT * FROM ap_actions WHERE id = ?').get(req.params.id);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    if (action.status !== 'pending') {
      return res.status(400).json({ error: 'Action is not pending approval' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE ap_actions SET status = ?, executed_at = ? WHERE id = ?')
      .run('approved', now, req.params.id);

    logActivity('autopilot', 'approve', `Approved action: ${action.description}`, 'Action approval');
    res.json({ id: action.id, status: 'approved', executed_at: now });
  } catch (error) {
    console.error('Error approving action:', error);
    res.status(500).json({ error: 'Failed to approve action' });
  }
});

// Get autopilot insights
router.get('/insights', (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = 'SELECT * FROM ap_insights WHERE 1=1';
    const params = [];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    query += ' ORDER BY created_at DESC';
    const insights = db.prepare(query).all(...params);
    res.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

module.exports = router;

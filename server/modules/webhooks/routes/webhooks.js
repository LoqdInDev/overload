const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered webhook config generation with SSE streaming
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Webhooks`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('webhooks', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Webhooks generation error:', error);
    sse.sendError(error);
  }
});

// GET /webhooks - List all webhooks
router.get('/webhooks', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const webhooks = db.prepare('SELECT * FROM wh_webhooks WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /webhooks - Create a new webhook
router.post('/webhooks', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, url, events, secret, status } = req.body;
    const result = db.prepare(
      'INSERT INTO wh_webhooks (name, url, events, secret, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, url, events ? JSON.stringify(events) : null, secret, status || 'active', wsId);
    logActivity('webhooks', 'create', `Created webhook: ${name}`, 'Webhook created', null, wsId);
    const webhook = db.prepare('SELECT * FROM wh_webhooks WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /webhooks/:id - Get a specific webhook with its logs
router.get('/webhooks/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const webhook = db.prepare('SELECT * FROM wh_webhooks WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    const logs = db.prepare('SELECT * FROM wh_webhook_logs WHERE webhook_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id, wsId);
    res.json({ success: true, data: { ...webhook, logs } });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /logs - List webhook delivery logs
router.get('/logs', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { webhook_id, limit } = req.query;
    let query = 'SELECT * FROM wh_webhook_logs WHERE workspace_id = ?';
    const params = [wsId];
    if (webhook_id) {
      query += ' AND webhook_id = ?';
      params.push(webhook_id);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);
    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

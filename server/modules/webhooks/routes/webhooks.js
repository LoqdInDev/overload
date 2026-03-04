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

// PUT /webhooks/:id - Update a webhook
router.put('/webhooks/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM wh_webhooks WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Webhook not found' });

    const { name, url, events, secret, status } = req.body;
    db.prepare(
      'UPDATE wh_webhooks SET name = ?, url = ?, events = ?, secret = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(name || existing.name, url || existing.url, events ? JSON.stringify(events) : existing.events, secret ?? existing.secret, status || existing.status, req.params.id, wsId);

    const webhook = db.prepare('SELECT * FROM wh_webhooks WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('webhooks', 'update', `Updated webhook: ${webhook.name}`, 'Webhook updated', null, wsId);
    res.json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /webhooks/:id - Delete a webhook
router.delete('/webhooks/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM wh_webhooks WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Webhook not found' });

    db.prepare('DELETE FROM wh_webhook_logs WHERE webhook_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM wh_webhooks WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('webhooks', 'delete', `Deleted webhook: ${existing.name}`, 'Webhook deleted', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
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

// POST /test-webhook — send a test payload to a webhook
router.post('/test-webhook', async (req, res) => {
  const { webhook_url, url, webhook_id, event_type } = req.body;
  const effectiveUrl = webhook_url || url;
  if (!effectiveUrl) return res.status(400).json({ error: 'url required' });

  const testPayload = {
    event: event_type || 'test.fired',
    timestamp: new Date().toISOString(),
    data: { test: true, message: 'Webhook test from Overload', id: Math.random().toString(36).slice(2) }
  };

  const startTime = Date.now();
  try {
    const response = await fetch(effectiveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Overload-Webhooks/1.0' },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000)
    });
    const latency = Date.now() - startTime;
    const responseText = await response.text().catch(() => '');

    res.json({ success: true, status_code: response.status, latency_ms: latency, response_preview: responseText.substring(0, 200), payload_sent: testPayload });
  } catch (err) {
    res.json({ success: false, error: err.message, latency_ms: Date.now() - startTime, payload_sent: testPayload });
  }
});

// GET /delivery-log — get webhook delivery history
router.get('/delivery-log', (req, res) => {
  const workspace_id = req.workspace.id;
  try {
    const logs = db.prepare(`
      SELECT * FROM wh_webhook_logs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(workspace_id);
    res.json({ logs: logs || [] });
  } catch {
    res.json({ logs: [] });
  }
});

// POST /delivery-log — get delivery log for a specific webhook
router.post('/delivery-log', (req, res) => {
  const workspace_id = req.workspace.id;
  const { webhook_id } = req.body;
  try {
    let logs;
    if (webhook_id) {
      logs = db.prepare(`SELECT * FROM wh_webhook_logs WHERE workspace_id = ? AND webhook_id = ? ORDER BY created_at DESC LIMIT 20`).all(workspace_id, webhook_id);
    } else {
      logs = db.prepare(`SELECT * FROM wh_webhook_logs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50`).all(workspace_id);
    }
    res.json({ logs: logs || [] });
  } catch {
    res.json({ logs: [] });
  }
});

module.exports = router;

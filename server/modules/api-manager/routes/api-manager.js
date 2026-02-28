const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered API config generation with SSE streaming
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for API Manager`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('api-manager', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('API Manager generation error:', error);
    sse.sendError(error);
  }
});

// GET /keys - List all API keys
router.get('/keys', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const keys = db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /keys - Create a new API key
router.post('/keys', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, key_hash, permissions, rate_limit } = req.body;
    const result = db.prepare(
      'INSERT INTO api_keys (name, key_hash, permissions, rate_limit, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, key_hash, permissions ? JSON.stringify(permissions) : null, rate_limit || 100, wsId);
    logActivity('api-manager', 'create', `Created API key: ${name}`, 'API key created', null, wsId);
    const key = db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: key });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /keys/:id - Get a specific API key details
router.get('/keys/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const key = db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!key) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    res.json({ success: true, data: key });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /logs - List API usage logs
router.get('/logs', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { key_id, limit } = req.query;
    let query = 'SELECT * FROM api_logs WHERE workspace_id = ?';
    const params = [wsId];
    if (key_id) {
      query += ' AND key_id = ?';
      params.push(key_id);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);
    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching API logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

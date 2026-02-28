const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered integration config generation with SSE streaming
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Integrations`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('integrations', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Integrations generation error:', error);
    sse.sendError(error);
  }
});

// GET /connections - List all connections
router.get('/connections', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const connections = db.prepare('SELECT * FROM int_connections WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /connections - Create a new connection
router.post('/connections', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { platform, name, status, api_key_hash, config } = req.body;
    const result = db.prepare(
      'INSERT INTO int_connections (platform, name, status, api_key_hash, config, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(platform, name, status || 'disconnected', api_key_hash, config ? JSON.stringify(config) : null, wsId);
    logActivity('integrations', 'create', `Created connection: ${name}`, 'Connection created', null, wsId);
    const connection = db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: connection });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /connections/:id - Get a specific connection with its sync logs
router.get('/connections/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const connection = db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }
    const sync_logs = db.prepare('SELECT * FROM int_sync_logs WHERE connection_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id, wsId);
    res.json({ success: true, data: { ...connection, sync_logs } });
  } catch (error) {
    console.error('Error fetching connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

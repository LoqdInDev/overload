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
    await logActivity('api-manager', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('API Manager generation error:', error);
    sse.sendError(error);
  }
});

// GET /keys - List all API keys
router.get('/keys', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const keys = await db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /keys - Create a new API key
router.post('/keys', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, key_hash, permissions, rate_limit } = req.body;
    const result = db.prepare(
      'INSERT INTO api_keys (name, key_hash, permissions, rate_limit, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, key_hash, permissions ? JSON.stringify(permissions) : null, rate_limit || 100, wsId);
    await logActivity('api-manager', 'create', `Created API key: ${name}`, 'API key created', null, wsId);
    const key = await db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: key });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /keys/:id - Get a specific API key details
router.get('/keys/:id', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const key = await db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
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
router.get('/logs', async (req, res) => {
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
    const logs = await db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching API logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /keys/:id - Update an API key
router.put('/keys/:id', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = await db.prepare('SELECT * FROM api_keys WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'API key not found' });

    const { name, permissions, rate_limit, status } = req.body;
    await db.prepare(
      'UPDATE api_keys SET name = ?, permissions = ?, rate_limit = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(name || existing.name, permissions ? JSON.stringify(permissions) : existing.permissions, rate_limit ?? existing.rate_limit, status || existing.status, req.params.id, wsId);

    const key = await db.prepare('SELECT id, name, permissions, rate_limit, usage_count, status, last_used, created_at FROM api_keys WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    await logActivity('api-manager', 'update', `Updated API key: ${key.name}`, 'API key updated', null, wsId);
    res.json({ success: true, data: key });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /keys/:id - Revoke/delete an API key
router.delete('/keys/:id', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = await db.prepare('SELECT * FROM api_keys WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'API key not found' });

    await db.prepare('DELETE FROM api_keys WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    await logActivity('api-manager', 'delete', `Deleted API key: ${existing.name}`, 'API key revoked', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /generate-docs — SSE: generate API documentation
router.post('/generate-docs', async (req, res) => {
  const { api_name, endpoints, base_url } = req.body;
  if (!api_name) { res.status(400).json({ error: 'api_name required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a technical writer. Generate comprehensive API documentation for:

API Name: ${api_name}
Base URL: ${base_url || 'https://api.example.com'}
Endpoints: ${JSON.stringify(endpoints || [])}

Generate documentation with:

# ${api_name} API Documentation

## Overview
(brief description)

## Authentication
(how to authenticate)

## Base URL
\`${base_url || 'https://api.example.com'}\`

## Endpoints
(for each endpoint provided: method, path, description, request parameters, response format with example)

## Error Codes
(standard HTTP errors + any custom ones)

## Code Examples
(curl and JavaScript fetch examples for the first endpoint)

## Rate Limits
(standard rate limiting info)

Make it professional and developer-friendly.`;

  try {
    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    sse.sendResult({ content: text });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

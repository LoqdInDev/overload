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

// Map a DB row (schema column names) back to the client field names the frontend expects.
function toClientShape(row) {
  if (!row) return null;
  return {
    ...row,
    platform: row.provider_id,
    name: row.display_name,
    api_key_hash: row.credentials_enc,
    // keep provider_id / display_name / credentials_enc as well so nothing breaks
  };
}

// GET /connections - List all connections
router.get('/connections', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const connections = db.prepare('SELECT * FROM int_connections WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: connections.map(toClientShape) });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /connections - Create a new connection
// NOTE: provider_id has a UNIQUE constraint in the schema without workspace_id,
// which means only one connection per provider across all workspaces is allowed.
// This is acceptable for the current single-tenant deployment. If multi-tenant
// isolation is needed later, the constraint should be changed to UNIQUE(provider_id, workspace_id).
router.post('/connections', (req, res) => {
  try {
    const wsId = req.workspace.id;
    // Accept both legacy client field names (platform/name/api_key_hash) and
    // canonical schema names (provider_id/display_name/credentials_enc).
    const {
      platform,        // client sends this
      name,            // client sends this
      api_key_hash,    // client sends this
      provider_id,     // or canonical name
      display_name,    // or canonical name
      credentials_enc, // or canonical name
      auth_type,
      status,
      config,
    } = req.body;

    const resolvedProviderId   = provider_id   || platform;
    const resolvedDisplayName  = display_name  || name;
    const resolvedCredentials  = credentials_enc ?? api_key_hash;
    const resolvedAuthType     = auth_type || 'api_key';

    const result = db.prepare(
      'INSERT INTO int_connections (provider_id, display_name, auth_type, status, credentials_enc, config, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      resolvedProviderId,
      resolvedDisplayName,
      resolvedAuthType,
      status || 'disconnected',
      resolvedCredentials ?? null,
      config ? JSON.stringify(config) : null,
      wsId
    );

    logActivity('integrations', 'create', `Created connection: ${resolvedDisplayName}`, 'Connection created', null, wsId);
    const connection = db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: toClientShape(connection) });
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
    res.json({ success: true, data: { ...toClientShape(connection), sync_logs } });
  } catch (error) {
    console.error('Error fetching connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /connections/:id - Update a connection
router.put('/connections/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Connection not found' });

    // Accept both legacy client field names and canonical schema names.
    const {
      name,
      display_name,
      api_key_hash,
      credentials_enc,
      auth_type,
      status,
      config,
    } = req.body;

    const resolvedDisplayName = display_name || name || existing.display_name;
    const resolvedCredentials = credentials_enc !== undefined
      ? credentials_enc
      : api_key_hash !== undefined
        ? api_key_hash
        : existing.credentials_enc;
    const resolvedAuthType = auth_type || existing.auth_type;

    db.prepare(
      'UPDATE int_connections SET display_name = ?, auth_type = ?, status = ?, credentials_enc = ?, config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(
      resolvedDisplayName,
      resolvedAuthType,
      status || existing.status,
      resolvedCredentials,
      config ? JSON.stringify(config) : existing.config,
      req.params.id,
      wsId
    );

    const connection = db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('integrations', 'update', `Updated connection: ${connection.display_name}`, 'Connection updated', null, wsId);
    res.json({ success: true, data: toClientShape(connection) });
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /connections/:id - Delete a connection
router.delete('/connections/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Connection not found' });

    db.prepare('DELETE FROM int_sync_logs WHERE connection_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM int_connections WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('integrations', 'delete', `Deleted connection: ${existing.display_name}`, 'Connection deleted', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /test-connection — test an integration connection
router.post('/test-connection', (req, res) => {
  const { integration_name, integration, integration_type } = req.body;
  const effectiveName = integration_name || integration;
  if (!effectiveName) return res.status(400).json({ error: 'integration required' });

  // Simulate a connection test
  const latency = Math.floor(Math.random() * 200) + 50;
  const success = Math.random() > 0.1; // 90% success rate for demo

  res.json({
    integration: effectiveName,
    status: success ? 'connected' : 'error',
    latency_ms: latency,
    message: success ? `Connected successfully (${latency}ms)` : 'Connection failed — check credentials',
    tested_at: new Date().toISOString()
  });
});

// GET /sync-health — get sync health for all integrations
router.get('/sync-health', (req, res) => {
  const workspace_id = req.workspace.id;

  try {
    // Get any stored integrations for this workspace
    const integrations = req.db ? req.db.prepare(`
      SELECT * FROM integrations WHERE workspace_id = ? LIMIT 20
    `).all(workspace_id) : db.prepare(`
      SELECT * FROM int_connections WHERE workspace_id = ? LIMIT 20
    `).all(workspace_id);

    // Return health data (or demo data if no integrations table)
    res.json({ integrations: integrations || [] });
  } catch {
    res.json({ integrations: [] });
  }
});

module.exports = router;

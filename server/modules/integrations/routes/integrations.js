const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { decrypt } = require('../../../services/encryption');

// POST /generate - AI-powered integration config generation with SSE streaming
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Integrations`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    await logActivity('integrations', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Integrations generation error:', error);
    sse.sendError(error);
  }
});

// Map a DB row (schema column names) back to the client field names the frontend expects.
// SECURITY: never send encrypted tokens/credentials to the frontend.
function toClientShape(row) {
  if (!row) return null;
  const { credentials_enc, access_token_enc, refresh_token_enc, ...safe } = row;
  return {
    ...safe,
    platform: row.provider_id,
    name: row.display_name,
    hasCredentials: !!credentials_enc,
  };
}

// GET /connections - List all connections
router.get('/connections', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const connections = await db.prepare('SELECT * FROM int_connections WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
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
router.post('/connections', async (req, res) => {
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

    await logActivity('integrations', 'create', `Created connection: ${resolvedDisplayName}`, 'Connection created', null, wsId);
    const connection = await db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: toClientShape(connection) });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /connections/:id - Get a specific connection with its sync logs
router.get('/connections/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const connection = await db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }
    const sync_logs = await db.prepare('SELECT * FROM int_sync_logs WHERE connection_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id, wsId);
    res.json({ success: true, data: { ...toClientShape(connection), sync_logs } });
  } catch (error) {
    console.error('Error fetching connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /connections/:id - Update a connection
router.put('/connections/:id', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = await db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
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

    await db.prepare(
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

    const connection = await db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    await logActivity('integrations', 'update', `Updated connection: ${connection.display_name}`, 'Connection updated', null, wsId);
    res.json({ success: true, data: toClientShape(connection) });
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /connections/:id - Delete a connection
router.delete('/connections/:id', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = await db.prepare('SELECT * FROM int_connections WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Connection not found' });

    await db.prepare('DELETE FROM int_sync_logs WHERE connection_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    await db.prepare('DELETE FROM int_connections WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    await logActivity('integrations', 'delete', `Deleted connection: ${existing.display_name}`, 'Connection deleted', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /test-connection — test an integration connection
router.post('/test-connection', async (req, res) => {
  const { platformId, integration_name, integration } = req.body;
  const effectiveId = platformId || integration_name || integration;
  if (!effectiveId) return res.status(400).json({ success: false, error: 'platformId required' });

  const wsId = req.workspace.id;

  try {
    // Look up the integration record from the database
    const conn = await db.prepare(
      'SELECT * FROM int_connections WHERE provider_id = ? AND workspace_id = ?'
    ).get(effectiveId, wsId);

    if (!conn || !conn.credentials_enc) {
      return res.json({ success: false, error: 'Not connected' });
    }

    // Decrypt credentials before use
    let creds;
    try { creds = decrypt(conn.credentials_enc); } catch { creds = conn.credentials_enc; }
    let config = {};
    try { config = conn.config ? JSON.parse(conn.config) : {}; } catch { /* ignore */ }

    const start = Date.now();
    const provider = (conn.provider_id || '').toLowerCase();

    if (provider === 'shopify') {
      // Shopify: needs shop domain from config and the API token as credentials
      const shop = config.shop || config.store || config.domain;
      if (!shop) {
        return res.json({ success: false, latency: Date.now() - start, error: 'Missing shop domain in config' });
      }
      const r = await fetch(`https://${shop}.myshopify.com/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': creds },
      });
      const latency = Date.now() - start;
      if (r.ok) {
        return res.json({ success: true, latency });
      }
      return res.json({ success: false, latency, error: `Shopify returned ${r.status}` });

    } else if (provider === 'google') {
      const r = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: { Authorization: `Bearer ${creds}` },
      });
      const latency = Date.now() - start;
      if (r.ok) {
        return res.json({ success: true, latency });
      }
      return res.json({ success: false, latency, error: `Google returned ${r.status}` });

    } else if (provider === 'meta' || provider === 'facebook') {
      const r = await fetch('https://graph.facebook.com/v19.0/me', {
        headers: { Authorization: `Bearer ${creds}` },
      });
      const latency = Date.now() - start;
      if (r.ok) {
        return res.json({ success: true, latency });
      }
      return res.json({ success: false, latency, error: `Meta returned ${r.status}` });

    } else {
      // Generic: check if token is expired via expires_at
      const latency = Date.now() - start;
      if (config.expires_at) {
        const expired = new Date(config.expires_at).getTime() < Date.now();
        if (expired) {
          return res.json({ success: false, latency, error: 'Token expired' });
        }
      }
      // Credentials exist and are not expired — consider it valid
      return res.json({ success: true, latency });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.json({ success: false, error: error.message });
  }
});

// GET /sync-health — get sync health for all integrations
router.get('/sync-health', async (req, res) => {
  const workspace_id = req.workspace.id;

  try {
    // Get any stored integrations for this workspace
    const integrations = req.db ? await req.db.prepare(`
      SELECT * FROM integrations WHERE workspace_id = ? LIMIT 20
    `).all(workspace_id) : await db.prepare(`
      SELECT * FROM int_connections WHERE workspace_id = ? LIMIT 20
    `).all(workspace_id);

    // Return health data (or demo data if no integrations table)
    res.json({ integrations: integrations || [] });
  } catch {
    res.json({ integrations: [] });
  }
});

// POST /sync - Trigger manual sync for all connected integrations
router.post('/sync', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { runScheduledSync } = require('../../../services/syncScheduler');
    await runScheduledSync();
    await logActivity('integrations', 'sync', 'Manual sync triggered', 'All connected platforms', null, wsId);
    res.json({ success: true, message: 'Sync completed for all connected platforms' });
  } catch (error) {
    console.error('Integration sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /sync-logs - Get recent sync history
router.get('/sync-logs', async (req, res) => {
  const wsId = req.workspace.id;
  try {
    const logs = await db.prepare(
      'SELECT * FROM int_sync_logs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(wsId);
    res.json({ success: true, data: logs || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;

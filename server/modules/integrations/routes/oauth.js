const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { encrypt, decrypt } = require('../../../services/encryption');
const { getAuthorizationUrl, exchangeCode, fetchProfile, storeTokens, refreshAccessToken, validateState } = require('../../../services/oauth');
const { PROVIDERS } = require('../providers');

// GET /providers — list all platforms with live connection status
router.get('/providers', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const connections = db.prepare('SELECT * FROM int_connections WHERE workspace_id = ?').all(wsId);
    const connMap = {};
    for (const c of connections) connMap[c.provider_id] = c;

    const providers = Object.values(PROVIDERS).map(p => {
      const conn = connMap[p.id];
      const hasEnvVars = p.authType === 'api_key' || (
        process.env[p.envClientId] && process.env[p.envClientSecret]
      );
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        authType: p.authType,
        requiresShop: p.requiresShop || false,
        credentials: p.credentials || null,
        configured: hasEnvVars,
        status: conn?.status || 'disconnected',
        accountName: conn?.account_name || null,
        accountId: conn?.account_id || null,
        connectedAt: conn?.connected_at || null,
        lastSync: conn?.last_sync || null,
        errorMessage: conn?.error_message || null,
      };
    });

    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /oauth/authorize/:providerId — generate auth URL
router.get('/oauth/authorize/:providerId', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { providerId } = req.params;
    const provider = PROVIDERS[providerId];
    if (!provider) return res.status(404).json({ success: false, error: 'Unknown provider' });
    if (provider.authType !== 'oauth2') return res.status(400).json({ success: false, error: 'Provider does not use OAuth2' });

    const extraParams = {};
    if (provider.requiresShop && req.query.shop) {
      extraParams.shop = req.query.shop;
    }

    const result = getAuthorizationUrl(providerId, extraParams);
    if (!result) return res.status(500).json({ success: false, error: 'Could not generate auth URL' });

    // For PKCE providers, store the codeVerifier in the state's extra_params
    if (result.codeVerifier) {
      const stateParam = new URL(result.url).searchParams.get('state');
      if (stateParam) {
        db.prepare('UPDATE int_oauth_states SET extra_params = ? WHERE state = ?')
          .run(JSON.stringify({ ...extraParams, codeVerifier: result.codeVerifier }), stateParam);
      }
    }

    res.json({ success: true, authUrl: result.url });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /oauth/callback — handle OAuth redirect from providers
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error: oauthError, error_description } = req.query;

  if (oauthError) {
    return res.send(callbackHTML(null, false, error_description || oauthError));
  }

  if (!code || !state) {
    return res.send(callbackHTML(null, false, 'Missing code or state parameter'));
  }

  const stateData = validateState(state);
  if (!stateData) {
    return res.send(callbackHTML(null, false, 'Invalid or expired state. Please try again.'));
  }

  const { providerId, extraParams } = stateData;

  try {
    const tokenData = await exchangeCode(providerId, code, extraParams);
    const profile = await fetchProfile(providerId, tokenData.access_token);
    storeTokens(providerId, tokenData, profile);
    logActivity('integrations', 'connect', `Connected ${PROVIDERS[providerId].name}`, profile?.name || 'OAuth');
    res.send(callbackHTML(providerId, true));
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.send(callbackHTML(providerId, false, error.message));
  }
});

// POST /connections/api-key — save API key credentials
router.post('/connections/api-key', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { providerId, credentials } = req.body;
    const provider = PROVIDERS[providerId];
    if (!provider) return res.status(404).json({ success: false, error: 'Unknown provider' });
    if (provider.authType !== 'api_key') return res.status(400).json({ success: false, error: 'Provider does not use API keys' });

    // Validate required fields
    for (const field of provider.credentials) {
      if (field.required && !credentials[field.key]) {
        return res.status(400).json({ success: false, error: `${field.label} is required` });
      }
    }

    // Test credentials if a test URL is configured
    if (provider.testUrl) {
      try {
        const testUrl = provider.testUrl.replace('{account_sid}', credentials.account_sid || '');
        const headers = provider.testHeaders
          ? provider.testHeaders(credentials)
          : provider.testAuth
            ? { 'Authorization': `Basic ${provider.testAuth(credentials)}` }
            : {};
        const testRes = await fetch(testUrl, { headers });
        if (!testRes.ok) {
          return res.status(400).json({ success: false, error: 'Invalid credentials — verification failed' });
        }
      } catch (testErr) {
        return res.status(400).json({ success: false, error: `Credential test failed: ${testErr.message}` });
      }
    }

    const encryptedCreds = encrypt(JSON.stringify(credentials));
    const existing = db.prepare('SELECT id FROM int_connections WHERE provider_id = ? AND workspace_id = ?').get(providerId, wsId);

    if (existing) {
      db.prepare(`
        UPDATE int_connections SET
          status = 'connected', credentials_enc = ?, error_message = NULL,
          connected_at = datetime('now'), updated_at = datetime('now')
        WHERE provider_id = ? AND workspace_id = ?
      `).run(encryptedCreds, providerId, wsId);
    } else {
      db.prepare(`
        INSERT INTO int_connections (provider_id, display_name, auth_type, status, credentials_enc, connected_at, workspace_id)
        VALUES (?, ?, 'api_key', 'connected', ?, datetime('now'), ?)
      `).run(providerId, provider.name, encryptedCreds, wsId);
    }

    logActivity('integrations', 'connect', `Connected ${provider.name}`, 'API Key', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('API key save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /connections/:providerId — disconnect
router.delete('/connections/:providerId', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { providerId } = req.params;
    const provider = PROVIDERS[providerId];
    if (!provider) return res.status(404).json({ success: false, error: 'Unknown provider' });

    db.prepare(`
      UPDATE int_connections SET
        status = 'disconnected',
        access_token_enc = NULL, refresh_token_enc = NULL,
        token_expires_at = NULL, token_scope = NULL,
        credentials_enc = NULL,
        account_name = NULL, account_id = NULL,
        error_message = NULL, connected_at = NULL,
        updated_at = datetime('now')
      WHERE provider_id = ? AND workspace_id = ?
    `).run(providerId, wsId);

    logActivity('integrations', 'disconnect', `Disconnected ${provider.name}`, '', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /connections/:providerId/test — test if connection is valid
router.post('/connections/:providerId/test', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { providerId } = req.params;
    const conn = db.prepare('SELECT * FROM int_connections WHERE provider_id = ? AND workspace_id = ?').get(providerId, wsId);
    if (!conn || conn.status === 'disconnected') {
      return res.json({ success: true, valid: false, error: 'Not connected' });
    }

    if (conn.auth_type === 'oauth2' && conn.access_token_enc) {
      const token = decrypt(conn.access_token_enc);
      const provider = PROVIDERS[providerId];
      if (provider.profileUrl) {
        const profileRes = await fetch(provider.profileUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (profileRes.ok) return res.json({ success: true, valid: true });
        // Try refresh
        try {
          await refreshAccessToken(providerId);
          return res.json({ success: true, valid: true, refreshed: true });
        } catch {
          return res.json({ success: true, valid: false, error: 'Token expired and refresh failed' });
        }
      }
      return res.json({ success: true, valid: true });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /connections/:providerId/refresh — force token refresh
router.post('/connections/:providerId/refresh', async (req, res) => {
  try {
    const { providerId } = req.params;
    await refreshAccessToken(providerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: generate callback HTML that sends postMessage to parent
function callbackHTML(providerId, success, errorMsg) {
  return `<!DOCTYPE html><html><head><title>Overload - Connection</title>
<style>
  body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0f; color: #e2e8f0; }
  .card { text-align: center; padding: 40px; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  .msg { font-size: 14px; color: #94a3b8; margin-top: 8px; }
  .close { margin-top: 20px; font-size: 12px; color: #475569; }
</style></head><body>
<div class="card">
  <div class="icon">${success ? '&#10003;' : '&#10007;'}</div>
  <h2>${success ? 'Connected!' : 'Connection Failed'}</h2>
  <p class="msg">${success ? 'You can close this window.' : (errorMsg || 'Something went wrong.')}</p>
  <p class="close">This window will close automatically...</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({
      type: 'oauth-callback',
      providerId: ${JSON.stringify(providerId)},
      success: ${success},
      error: ${JSON.stringify(errorMsg || null)}
    }, '*');
  }
  setTimeout(() => window.close(), 2000);
</script></body></html>`;
}

module.exports = router;

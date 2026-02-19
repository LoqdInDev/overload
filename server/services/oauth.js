const crypto = require('crypto');
const { PROVIDERS } = require('../modules/integrations/providers');
const { encrypt, decrypt } = require('./encryption');
const { db } = require('../db/database');

const CALLBACK_BASE = () => process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000';

function generateState(providerId, extraParams) {
  const state = crypto.randomUUID();
  db.prepare(
    'INSERT INTO int_oauth_states (state, provider_id, extra_params) VALUES (?, ?, ?)'
  ).run(state, providerId, extraParams ? JSON.stringify(extraParams) : null);
  // Clean up states older than 10 minutes
  db.prepare(
    "DELETE FROM int_oauth_states WHERE created_at < datetime('now', '-10 minutes')"
  ).run();
  return state;
}

function validateState(state) {
  const row = db.prepare('SELECT * FROM int_oauth_states WHERE state = ?').get(state);
  if (!row) return null;
  db.prepare('DELETE FROM int_oauth_states WHERE state = ?').run(state);
  return {
    providerId: row.provider_id,
    extraParams: row.extra_params ? JSON.parse(row.extra_params) : {},
  };
}

function getAuthorizationUrl(providerId, extraParams = {}) {
  const provider = PROVIDERS[providerId];
  if (!provider || provider.authType !== 'oauth2') return null;

  const clientId = process.env[provider.envClientId];
  if (!clientId) throw new Error(`Missing env var: ${provider.envClientId}`);

  const state = generateState(providerId, extraParams);
  const redirectUri = `${CALLBACK_BASE()}/api/integrations/oauth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    ...(provider.scopes.length > 0 ? { scope: provider.scopes.join(' ') } : {}),
    ...(provider.extraAuthParams || {}),
    ...extraParams,
  });

  // Handle platforms that use different param names
  if (provider.authParamMapping) {
    for (const [standard, custom] of Object.entries(provider.authParamMapping)) {
      const val = params.get(standard);
      if (val) { params.delete(standard); params.set(custom, val); }
    }
  }

  // Handle PKCE (Airtable)
  let codeVerifier = null;
  if (provider.usePKCE) {
    codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  const authUrl = provider.authUrlTemplate
    ? provider.authUrlTemplate.replace('{shop}', extraParams.shop || '')
    : provider.authUrl;

  return { url: `${authUrl}?${params.toString()}`, codeVerifier };
}

async function exchangeCode(providerId, code, extraParams = {}) {
  const provider = PROVIDERS[providerId];
  const clientId = process.env[provider.envClientId];
  const clientSecret = process.env[provider.envClientSecret];
  const redirectUri = `${CALLBACK_BASE()}/api/integrations/oauth/callback`;

  const tokenUrl = provider.tokenUrlTemplate
    ? provider.tokenUrlTemplate.replace('{shop}', extraParams.shop || '')
    : provider.tokenUrl;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  // Add PKCE code_verifier if needed
  if (extraParams.codeVerifier) {
    body.set('code_verifier', extraParams.codeVerifier);
  }

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  // Some providers (Notion) use Basic auth for token exchange
  if (provider.tokenAuthMethod === 'basic') {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  const response = await fetch(tokenUrl, { method: 'POST', headers, body: body.toString() });
  const data = await response.json();

  if (data.error) throw new Error(data.error_description || data.error);

  return data;
}

async function fetchProfile(providerId, accessToken) {
  const provider = PROVIDERS[providerId];
  if (!provider.profileUrl) return null;

  try {
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    const res = await fetch(provider.profileUrl, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return { name: data.name || data.email || null, id: data.id || data.sub || null };
  } catch {
    return null;
  }
}

function storeTokens(providerId, tokenData, profile) {
  const provider = PROVIDERS[providerId];
  const expiresAt = tokenData.expires_in
    ? Math.floor(Date.now() / 1000) + tokenData.expires_in
    : null;

  const existing = db.prepare('SELECT id FROM int_connections WHERE provider_id = ?').get(providerId);

  if (existing) {
    db.prepare(`
      UPDATE int_connections SET
        status = 'connected',
        access_token_enc = ?,
        refresh_token_enc = COALESCE(?, refresh_token_enc),
        token_expires_at = ?,
        token_scope = ?,
        account_name = COALESCE(?, account_name),
        account_id = COALESCE(?, account_id),
        error_message = NULL,
        connected_at = datetime('now'),
        updated_at = datetime('now')
      WHERE provider_id = ?
    `).run(
      encrypt(tokenData.access_token),
      tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
      tokenData.scope || null,
      profile?.name || null,
      profile?.id || null,
      providerId
    );
  } else {
    db.prepare(`
      INSERT INTO int_connections (provider_id, display_name, auth_type, status, access_token_enc, refresh_token_enc, token_expires_at, token_scope, account_name, account_id, connected_at)
      VALUES (?, ?, ?, 'connected', ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      providerId,
      provider.name,
      'oauth2',
      encrypt(tokenData.access_token),
      tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
      tokenData.scope || null,
      profile?.name || null,
      profile?.id || null
    );
  }
}

async function refreshAccessToken(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider || provider.authType !== 'oauth2') return null;

  const conn = db.prepare('SELECT * FROM int_connections WHERE provider_id = ?').get(providerId);
  if (!conn || !conn.refresh_token_enc) return null;

  const refreshToken = decrypt(conn.refresh_token_enc);
  const clientId = process.env[provider.envClientId];
  const clientSecret = process.env[provider.envClientSecret];

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await response.json();

  if (data.error) {
    db.prepare("UPDATE int_connections SET status = 'expired', error_message = ? WHERE provider_id = ?")
      .run(data.error_description || data.error, providerId);
    throw new Error(data.error_description || data.error);
  }

  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null;
  db.prepare(`
    UPDATE int_connections SET
      access_token_enc = ?,
      refresh_token_enc = COALESCE(?, refresh_token_enc),
      token_expires_at = ?,
      status = 'connected',
      error_message = NULL,
      updated_at = datetime('now')
    WHERE provider_id = ?
  `).run(
    encrypt(data.access_token),
    data.refresh_token ? encrypt(data.refresh_token) : null,
    expiresAt,
    providerId
  );

  return data.access_token;
}

async function getValidToken(providerId) {
  const conn = db.prepare('SELECT * FROM int_connections WHERE provider_id = ?').get(providerId);
  if (!conn || conn.status === 'disconnected') return null;

  if (conn.token_expires_at && conn.token_expires_at < Math.floor(Date.now() / 1000) + 300) {
    return await refreshAccessToken(providerId);
  }

  return decrypt(conn.access_token_enc);
}

module.exports = {
  getAuthorizationUrl,
  exchangeCode,
  fetchProfile,
  storeTokens,
  refreshAccessToken,
  getValidToken,
  validateState,
};

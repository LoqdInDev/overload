const { getValidToken } = require('./oauth');
const { decrypt } = require('./encryption');
const { db } = require('../db/database');
const platforms = require('./platforms');

// Map provider IDs to their platform wrapper modules
const PLATFORM_MAP = {
  twitter: platforms.twitter,
  linkedin: platforms.linkedin,
  meta: platforms.facebook,        // Meta OAuth -> Facebook/Instagram APIs
  google: platforms.youtube,        // Google OAuth -> YouTube + Google Ads
  tiktok: platforms.tiktok,
  pinterest: platforms.pinterest,
  shopify: platforms.shopify,
  mailchimp: platforms.mailchimp,
  hubspot: null,                    // future
  slack: null,                      // future
  amazon: null,                     // future
  notion: null,                     // future
  airtable: null,                   // future
  snapchat: null,                   // future
  intercom: null,                   // future
  bigcommerce: null,                // future
  stripe: null,                     // future
};

// Ad platform wrappers (separate from social)
const ADS_MAP = {
  google: platforms.googleAds,
  meta: platforms.metaAds,
};

// Email platform wrappers
const EMAIL_MAP = {
  mailchimp: platforms.mailchimp,
  klaviyo: platforms.klaviyo,
};

/**
 * Get a valid access token for an OAuth2 provider.
 * Automatically refreshes if expired.
 */
async function getToken(providerId) {
  const token = await getValidToken(providerId);
  if (!token) throw new Error(`No valid connection for ${providerId}. Please connect first.`);
  return token;
}

/**
 * Get API key credentials for an api_key provider.
 */
function getApiCredentials(providerId) {
  const conn = db.prepare('SELECT * FROM int_connections WHERE provider_id = ? AND status = ?').get(providerId, 'connected');
  if (!conn || !conn.credentials_enc) throw new Error(`No valid connection for ${providerId}. Please connect first.`);
  return JSON.parse(decrypt(conn.credentials_enc));
}

/**
 * Get connection info for a provider (without decrypting tokens).
 */
function getConnection(providerId) {
  return db.prepare('SELECT * FROM int_connections WHERE provider_id = ?').get(providerId);
}

/**
 * Check if a provider is connected.
 */
function isConnected(providerId) {
  const conn = db.prepare('SELECT status FROM int_connections WHERE provider_id = ?').get(providerId);
  return conn?.status === 'connected';
}

/**
 * Get all connected providers.
 */
function getConnectedProviders() {
  return db.prepare("SELECT provider_id, display_name, auth_type, status, account_name, account_id, connected_at FROM int_connections WHERE status = 'connected'").all();
}

/**
 * Get the platform wrapper for a provider.
 */
function getPlatform(providerId) {
  const platform = PLATFORM_MAP[providerId];
  if (!platform) throw new Error(`No platform wrapper available for ${providerId}`);
  return platform;
}

/**
 * Get the ads wrapper for a provider.
 */
function getAdsPlatform(providerId) {
  const platform = ADS_MAP[providerId];
  if (!platform) throw new Error(`No ads wrapper available for ${providerId}`);
  return platform;
}

/**
 * Get the email wrapper for a provider.
 */
function getEmailPlatform(providerId) {
  const platform = EMAIL_MAP[providerId];
  if (!platform) throw new Error(`No email wrapper available for ${providerId}`);
  return platform;
}

// ── Social Media Operations ──────────────────────────

async function socialPost(providerId, content) {
  const platform = getPlatform(providerId);
  const token = await getToken(providerId);

  switch (providerId) {
    case 'twitter':
      return platform.postContent(token, content);
    case 'linkedin': {
      const conn = getConnection(providerId);
      return platform.postContent(token, { authorUrn: `urn:li:person:${conn.account_id}`, ...content });
    }
    case 'meta': {
      // Post to Facebook page
      if (content.pageId && content.pageToken) {
        return platform.postToPage(content.pageToken, content.pageId, content);
      }
      const pages = await platform.getPages(token);
      if (!pages.length) throw new Error('No Facebook pages found');
      return platform.postToPage(pages[0].token, pages[0].id, content);
    }
    case 'tiktok':
      return platform.initVideoUpload(token, content);
    case 'pinterest':
      return platform.createPin(token, content);
    default:
      throw new Error(`Social posting not supported for ${providerId}`);
  }
}

async function socialProfile(providerId) {
  const platform = getPlatform(providerId);

  if (providerId === 'klaviyo') {
    const creds = getApiCredentials(providerId);
    return platform.getAccount(creds.api_key);
  }

  const token = await getToken(providerId);
  return platform.getProfile(token);
}

async function socialAnalytics(providerId, params = {}) {
  const platform = getPlatform(providerId);
  const token = await getToken(providerId);

  switch (providerId) {
    case 'twitter': {
      const conn = getConnection(providerId);
      return platform.getAnalytics(token, { userId: conn.account_id, ...params });
    }
    case 'linkedin': {
      const conn = getConnection(providerId);
      return platform.getAnalytics(token, { authorUrn: `urn:li:person:${conn.account_id}`, ...params });
    }
    case 'meta':
      return platform.getPageInsights(token, params.pageId, params);
    case 'google':
      return platforms.youtube.getChannelAnalytics(token, params);
    case 'pinterest':
      return platform.getAccountAnalytics(token, params);
    case 'tiktok':
      return platform.listVideos(token, params);
    default:
      throw new Error(`Analytics not supported for ${providerId}`);
  }
}

// ── Ads Operations ──────────────────────────────────

async function adsCampaigns(providerId, params = {}) {
  const adsPlatform = getAdsPlatform(providerId);
  const token = await getToken(providerId);

  switch (providerId) {
    case 'google':
      return adsPlatform.getCampaigns(token, params.customerId, params);
    case 'meta':
      return adsPlatform.getCampaigns(token, params.adAccountId, params);
    default:
      throw new Error(`Ads campaigns not supported for ${providerId}`);
  }
}

async function adsMetrics(providerId, params = {}) {
  const adsPlatform = getAdsPlatform(providerId);
  const token = await getToken(providerId);

  switch (providerId) {
    case 'google':
      return adsPlatform.getCampaignMetrics(token, params.customerId, params);
    case 'meta':
      return adsPlatform.getCampaignInsights(token, params.campaignId, params);
    default:
      throw new Error(`Ads metrics not supported for ${providerId}`);
  }
}

async function adsPause(providerId, params = {}) {
  const adsPlatform = getAdsPlatform(providerId);
  const token = await getToken(providerId);

  switch (providerId) {
    case 'google':
      return adsPlatform.pauseCampaign(token, params.customerId, params.campaignId);
    case 'meta':
      return adsPlatform.pauseCampaign(token, params.campaignId);
    default:
      throw new Error(`Ads pause not supported for ${providerId}`);
  }
}

async function adsEnable(providerId, params = {}) {
  const adsPlatform = getAdsPlatform(providerId);
  const token = await getToken(providerId);

  switch (providerId) {
    case 'google':
      return adsPlatform.enableCampaign(token, params.customerId, params.campaignId);
    case 'meta':
      return adsPlatform.enableCampaign(token, params.campaignId);
    default:
      throw new Error(`Ads enable not supported for ${providerId}`);
  }
}

// ── Email Operations ─────────────────────────────────

async function emailLists(providerId) {
  if (providerId === 'klaviyo') {
    const creds = getApiCredentials(providerId);
    return platforms.klaviyo.getLists(creds.api_key);
  }
  const token = await getToken(providerId);
  const profile = await platforms.mailchimp.getProfile(token);
  return platforms.mailchimp.getLists(token, profile.dc);
}

async function emailCampaigns(providerId, params = {}) {
  if (providerId === 'klaviyo') {
    const creds = getApiCredentials(providerId);
    return platforms.klaviyo.getCampaigns(creds.api_key, params);
  }
  const token = await getToken(providerId);
  const profile = await platforms.mailchimp.getProfile(token);
  return platforms.mailchimp.getCampaigns(token, profile.dc, params);
}

async function emailSend(providerId, params = {}) {
  if (providerId === 'klaviyo') {
    const creds = getApiCredentials(providerId);
    const campaign = await platforms.klaviyo.createCampaign(creds.api_key, params);
    return platforms.klaviyo.sendCampaign(creds.api_key, campaign.id);
  }
  const token = await getToken(providerId);
  const profile = await platforms.mailchimp.getProfile(token);
  const campaign = await platforms.mailchimp.createCampaign(token, profile.dc, params);
  if (params.html) await platforms.mailchimp.setCampaignContent(token, profile.dc, campaign.id, { html: params.html });
  return platforms.mailchimp.sendCampaign(token, profile.dc, campaign.id);
}

// ── E-commerce Operations ────────────────────────────

async function ecommerceProducts(providerId, params = {}) {
  const token = await getToken(providerId);
  const conn = getConnection(providerId);
  const shop = conn?.account_id || params.shop;
  if (providerId === 'shopify') return platforms.shopify.getProducts(token, shop, params);
  throw new Error(`Products not supported for ${providerId}`);
}

async function ecommerceOrders(providerId, params = {}) {
  const token = await getToken(providerId);
  const conn = getConnection(providerId);
  const shop = conn?.account_id || params.shop;
  if (providerId === 'shopify') return platforms.shopify.getOrders(token, shop, params);
  throw new Error(`Orders not supported for ${providerId}`);
}

module.exports = {
  getToken, getApiCredentials, getConnection, isConnected, getConnectedProviders,
  getPlatform, getAdsPlatform, getEmailPlatform,
  socialPost, socialProfile, socialAnalytics,
  adsCampaigns, adsMetrics, adsPause, adsEnable,
  emailLists, emailCampaigns, emailSend,
  ecommerceProducts, ecommerceOrders,
};

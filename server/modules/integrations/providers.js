const PROVIDERS = {
  // ── OAuth2 Platforms (require server-side app credentials) ──

  google: {
    id: 'google',
    name: 'Google',
    description: 'Google Ads, Analytics & YouTube',
    category: 'ads',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'openid', 'email', 'profile',
    ],
    envClientId: 'GOOGLE_CLIENT_ID',
    envClientSecret: 'GOOGLE_CLIENT_SECRET',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },

  meta: {
    id: 'meta',
    name: 'Meta',
    description: 'Facebook, Instagram & Ads',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: [
      'ads_management', 'ads_read', 'business_management',
      'pages_manage_posts', 'pages_read_engagement', 'pages_show_list',
      'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights',
    ],
    envClientId: 'META_CLIENT_ID',
    envClientSecret: 'META_CLIENT_SECRET',
    profileUrl: 'https://graph.facebook.com/me?fields=name,email',
  },

  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Post tweets and track engagement',
    category: 'social',
    authType: 'api_key',
    credentials: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
      { key: 'bearer_token', label: 'Bearer Token', type: 'password', required: true },
    ],
  },

  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Post updates and professional networking',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
    envClientId: 'LINKEDIN_CLIENT_ID',
    envClientSecret: 'LINKEDIN_CLIENT_SECRET',
    profileUrl: 'https://api.linkedin.com/v2/me',
  },

  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    description: 'TikTok content posting and ads',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://business-api.tiktok.com/portal/auth',
    tokenUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    envClientId: 'TIKTOK_CLIENT_ID',
    envClientSecret: 'TIKTOK_CLIENT_SECRET',
    authParamMapping: { client_id: 'app_id' },
  },

  shopify: {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce platform',
    category: 'ecommerce',
    authType: 'api_key',
    credentials: [
      { key: 'shop_domain', label: 'Shop Domain (e.g. mystore.myshopify.com)', type: 'text', required: true },
      { key: 'access_token', label: 'Admin API Access Token', type: 'password', required: true },
    ],
  },

  stripe: {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing',
    category: 'payments',
    authType: 'api_key',
    credentials: [
      { key: 'api_key', label: 'Secret Key (sk_live_... or sk_test_...)', type: 'password', required: true },
    ],
    testUrl: 'https://api.stripe.com/v1/balance',
    testHeaders: (creds) => ({ 'Authorization': `Bearer ${creds.api_key}` }),
  },

  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing and automation',
    category: 'email',
    authType: 'api_key',
    credentials: [
      { key: 'api_key', label: 'API Key (ends with -usX)', type: 'password', required: true },
    ],
  },

  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM and marketing automation',
    category: 'crm',
    authType: 'api_key',
    credentials: [
      { key: 'access_token', label: 'Private App Access Token', type: 'password', required: true },
    ],
    testUrl: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
    testHeaders: (creds) => ({ 'Authorization': `Bearer ${creds.access_token}` }),
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Team messaging and notifications',
    category: 'messaging',
    authType: 'api_key',
    credentials: [
      { key: 'bot_token', label: 'Bot Token (xoxb-...)', type: 'password', required: true },
      { key: 'channel_id', label: 'Default Channel ID (optional)', type: 'text', required: false },
    ],
  },

  amazon: {
    id: 'amazon',
    name: 'Amazon',
    description: 'Seller Central / SP-API',
    category: 'ecommerce',
    authType: 'api_key',
    credentials: [
      { key: 'seller_id', label: 'Seller ID', type: 'text', required: true },
      { key: 'access_key', label: 'AWS Access Key', type: 'password', required: true },
      { key: 'secret_key', label: 'AWS Secret Key', type: 'password', required: true },
    ],
  },

  notion: {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace and project management',
    category: 'productivity',
    authType: 'api_key',
    credentials: [
      { key: 'api_key', label: 'Internal Integration Token (secret_...)', type: 'password', required: true },
    ],
    testUrl: 'https://api.notion.com/v1/users/me',
    testHeaders: (creds) => ({ 'Authorization': `Bearer ${creds.api_key}`, 'Notion-Version': '2022-06-28' }),
  },

  airtable: {
    id: 'airtable',
    name: 'Airtable',
    description: 'Flexible database and project management',
    category: 'productivity',
    authType: 'api_key',
    credentials: [
      { key: 'api_key', label: 'Personal Access Token (pat...)', type: 'password', required: true },
    ],
    testUrl: 'https://api.airtable.com/v0/meta/whoami',
    testHeaders: (creds) => ({ 'Authorization': `Bearer ${creds.api_key}` }),
  },

  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Create pins, manage boards, and run ads',
    category: 'social',
    authType: 'api_key',
    credentials: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
  },

  snapchat: {
    id: 'snapchat',
    name: 'Snapchat Ads',
    description: 'Social advertising for younger audiences',
    category: 'ads',
    authType: 'api_key',
    credentials: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true },
    ],
  },

  intercom: {
    id: 'intercom',
    name: 'Intercom',
    description: 'Customer messaging and support',
    category: 'messaging',
    authType: 'api_key',
    credentials: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
    testUrl: 'https://api.intercom.io/me',
    testHeaders: (creds) => ({ 'Authorization': `Bearer ${creds.access_token}` }),
  },

  bigcommerce: {
    id: 'bigcommerce',
    name: 'BigCommerce',
    description: 'E-commerce platform for growing brands',
    category: 'ecommerce',
    authType: 'api_key',
    credentials: [
      { key: 'store_hash', label: 'Store Hash', type: 'text', required: true },
      { key: 'access_token', label: 'API Access Token', type: 'password', required: true },
    ],
  },

  // ── API Key Platforms ─────────────────────────────

  klaviyo: {
    id: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email and SMS marketing',
    category: 'email',
    authType: 'api_key',
    credentials: [
      { key: 'api_key', label: 'Private API Key', type: 'password', required: true },
    ],
    testUrl: 'https://a.klaviyo.com/api/accounts/',
    testHeaders: (creds) => ({ 'Authorization': `Klaviyo-API-Key ${creds.api_key}`, 'revision': '2024-02-15' }),
  },

  segment: {
    id: 'segment',
    name: 'Segment',
    description: 'Customer data platform',
    category: 'data',
    authType: 'api_key',
    credentials: [
      { key: 'write_key', label: 'Write Key', type: 'password', required: true },
    ],
  },

  mixpanel: {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Product analytics and tracking',
    category: 'analytics',
    authType: 'api_key',
    credentials: [
      { key: 'project_token', label: 'Project Token', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
    ],
  },

  twilio: {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and communication APIs',
    category: 'messaging',
    authType: 'api_key',
    credentials: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
    ],
  },

  zapier: {
    id: 'zapier',
    name: 'Zapier',
    description: 'Workflow automation via webhooks',
    category: 'automation',
    authType: 'api_key',
    credentials: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
    ],
  },
};

module.exports = { PROVIDERS };

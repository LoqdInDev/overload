import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIToolsTab from '../../components/shared/AIToolsTab';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Map integration IDs to brand SVG filenames in /brands/
const BRAND_ICON_MAP = {
  'google': 'google', 'meta': 'meta', 'twitter': 'x',
  'linkedin': 'linkedin', 'tiktok': 'tiktok', 'shopify': 'shopify',
  'stripe': 'stripe', 'mailchimp': 'mailchimp', 'hubspot': 'hubspot',
  'slack': 'slack', 'amazon': 'amazon', 'notion': 'notion',
  'airtable': 'airtable', 'pinterest': 'pinterest', 'snapchat': 'snapchat',
  'intercom': 'intercom', 'bigcommerce': 'bigcommerce', 'klaviyo': 'klaviyo',
  'segment': 'segment', 'mixpanel': 'mixpanel', 'twilio': 'twilio',
  'zapier': 'zapier',
  // Legacy IDs
  'google-ads': 'google', 'meta-ads': 'meta', 'google-analytics': 'google',
  'pinterest-ads': 'pinterest', 'snapchat-ads': 'snapchat',
};

const FALLBACK_AVAILABLE = [
  { id: 'google', name: 'Google', description: 'Google Ads, Analytics & YouTube', category: 'ads', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'client_id', label: 'OAuth Client ID' }, { key: 'client_secret', label: 'OAuth Client Secret' }, { key: 'refresh_token', label: 'Refresh Token' }], helpUrl: 'https://console.cloud.google.com/apis/credentials', helpText: 'Create OAuth credentials at Google Cloud Console, then use the OAuth Playground to get a refresh token.' },
  { id: 'meta', name: 'Meta', description: 'Facebook, Instagram & Ads', category: 'social', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Long-Lived Access Token' }, { key: 'ad_account_id', label: 'Ad Account ID (act_XXX)' }, { key: 'page_id', label: 'Page ID (optional)' }], helpUrl: 'https://developers.facebook.com/tools/explorer/', helpText: 'Generate a long-lived token from the Meta Graph API Explorer.' },
  { id: 'twitter', name: 'Twitter / X', description: 'Post tweets and track engagement', category: 'social', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'api_key', label: 'API Key' }, { key: 'api_secret', label: 'API Secret' }, { key: 'bearer_token', label: 'Bearer Token' }] },
  { id: 'linkedin', name: 'LinkedIn', description: 'Post updates and professional networking', category: 'social', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Access Token' }, { key: 'organization_id', label: 'Organization ID (optional)' }], helpUrl: 'https://www.linkedin.com/developers/apps', helpText: 'Create an app at LinkedIn Developers and generate an access token.' },
  { id: 'tiktok', name: 'TikTok', description: 'TikTok content posting and ads', category: 'social', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Access Token' }, { key: 'advertiser_id', label: 'Advertiser ID (optional)' }], helpUrl: 'https://business-api.tiktok.com/portal/docs', helpText: 'Get your access token from the TikTok Business API portal.' },
  { id: 'shopify', name: 'Shopify', description: 'E-commerce platform', category: 'ecommerce', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'shop_domain', label: 'Shop Domain' }, { key: 'access_token', label: 'Admin API Access Token' }] },
  { id: 'stripe', name: 'Stripe', description: 'Payment processing', category: 'payments', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'api_key', label: 'Secret Key' }] },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing and automation', category: 'email', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'api_key', label: 'API Key' }] },
  { id: 'hubspot', name: 'HubSpot', description: 'CRM and marketing automation', category: 'crm', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Private App Access Token' }] },
  { id: 'slack', name: 'Slack', description: 'Team messaging and notifications', category: 'messaging', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'bot_token', label: 'Bot Token' }] },
  { id: 'amazon', name: 'Amazon', description: 'Seller Central / SP-API', category: 'ecommerce', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'seller_id', label: 'Seller ID' }, { key: 'access_key', label: 'AWS Access Key' }, { key: 'secret_key', label: 'AWS Secret Key' }] },
  { id: 'notion', name: 'Notion', description: 'Workspace and project management', category: 'productivity', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'api_key', label: 'Integration Token' }] },
  { id: 'airtable', name: 'Airtable', description: 'Flexible database and project management', category: 'productivity', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'api_key', label: 'Personal Access Token' }] },
  { id: 'pinterest', name: 'Pinterest', description: 'Create pins, manage boards, and run ads', category: 'social', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Access Token' }] },
  { id: 'snapchat', name: 'Snapchat Ads', description: 'Social advertising for younger audiences', category: 'ads', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Access Token' }, { key: 'ad_account_id', label: 'Ad Account ID' }] },
  { id: 'intercom', name: 'Intercom', description: 'Customer messaging and support', category: 'messaging', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'access_token', label: 'Access Token' }] },
  { id: 'bigcommerce', name: 'BigCommerce', description: 'E-commerce platform for growing brands', category: 'ecommerce', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'store_hash', label: 'Store Hash' }, { key: 'access_token', label: 'API Access Token' }] },
  { id: 'klaviyo', name: 'Klaviyo', description: 'Email and SMS marketing', category: 'email', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'api_key', label: 'Private API Key' }] },
  { id: 'segment', name: 'Segment', description: 'Customer data platform', category: 'data', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'write_key', label: 'Write Key' }] },
  { id: 'mixpanel', name: 'Mixpanel', description: 'Product analytics and tracking', category: 'analytics', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'project_token', label: 'Project Token' }, { key: 'api_secret', label: 'API Secret' }] },
  { id: 'twilio', name: 'Twilio', description: 'SMS and communication APIs', category: 'messaging', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'account_sid', label: 'Account SID' }, { key: 'auth_token', label: 'Auth Token' }] },
  { id: 'zapier', name: 'Zapier', description: 'Workflow automation via webhooks', category: 'automation', status: 'disconnected', authType: 'api_key', credentials: [{ key: 'webhook_url', label: 'Webhook URL' }] },
];

const AI_TEMPLATES = [
  { name: 'Integration Setup Guide', prompt: 'Create a step-by-step integration setup guide with data mapping recommendations and best practices' },
  { name: 'Data Mapping Helper', prompt: 'Generate a data mapping plan between connected platforms with field matching and transformation rules' },
  { name: 'Sync Troubleshooting', prompt: 'Diagnose common sync issues and provide troubleshooting steps for data integration problems' },
  { name: 'Automation Suggestions', prompt: 'Suggest automation workflows between connected integrations to streamline marketing operations' },
];

const TYPE_COLORS = {
  ads: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  ecommerce: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  email: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  crm: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  messaging: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  payments: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  analytics: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  productivity: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  data: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  automation: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const STATUS_STYLES = {
  connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  disconnected: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function IntegrationsPage() {
  usePageTitle('Integrations Hub');
  const { dark } = useTheme();
  const [tab, setTab] = useState('connected');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);

  // API key modal state
  const [apiKeyModal, setApiKeyModal] = useState(null);
  const [apiKeyForm, setApiKeyForm] = useState({});
  const [apiKeyError, setApiKeyError] = useState('');
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  // Shopify shop modal
  const [shopModal, setShopModal] = useState(false);
  const [shopName, setShopName] = useState('');

  // OAuth error state
  const [oauthError, setOauthError] = useState(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/providers`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setProviders(data.data);
      } else {
        setProviders(FALLBACK_AVAILABLE);
      }
    } catch (err) {
      console.error('Failed to fetch providers, using fallback data:', err);
      setProviders(FALLBACK_AVAILABLE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'oauth-callback') {
        setConnectingId(null);
        fetchProviders();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchProviders]);

  const connectOAuth = async (provider) => {
    if (provider.requiresShop) {
      setShopModal(true);
      setConnectingId(provider.id);
      return;
    }
    startOAuthFlow(provider.id);
  };

  const startOAuthFlow = async (providerId, shop) => {
    setConnectingId(providerId);
    try {
      const url = `/api/integrations/oauth/authorize/${providerId}${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const popup = window.open(data.authUrl, 'oauth-connect', 'width=600,height=700,scrollbars=yes');

      // Fallback: poll for popup close
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          setConnectingId(null);
          fetchProviders();
        }
      }, 1000);
    } catch (err) {
      console.error('OAuth error:', err);
      setOauthError(err.message || 'Failed to connect. Please try again.');
      setConnectingId(null);
    }
  };

  const submitShop = () => {
    if (!shopName.trim()) return;
    const id = connectingId;
    setShopModal(false);
    startOAuthFlow(id, shopName.trim());
    setShopName('');
  };

  const connectApiKey = (provider) => {
    setApiKeyModal(provider);
    setApiKeyForm({});
    setApiKeyError('');
    setShowPasswords({});
  };

  const submitApiKey = async () => {
    setApiKeySaving(true);
    setApiKeyError('');
    try {
      const res = await fetch(`${API_BASE}/api/integrations/connections/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: apiKeyModal.id, credentials: apiKeyForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setApiKeyModal(null);
      fetchProviders();
    } catch (err) {
      setApiKeyError(err.message);
    } finally {
      setApiKeySaving(false);
    }
  };

  const disconnect = async (providerId) => {
    setDisconnectingId(providerId);
    try {
      await fetch(`/api/integrations/connections/${providerId}`, { method: 'DELETE' });
      fetchProviders();
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnectingId(null);
    }
  };

  const connected = providers.filter(p => p.status === 'connected');
  const available = providers.filter(p => p.status !== 'connected');
  const errorCount = providers.filter(p => p.status === 'error' || p.status === 'expired').length;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#a5b4fc', animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8 animate-fade-in">
        <div>
          <p className="hud-label text-[11px] mb-2" style={{ color: '#6366f1' }}>INTEGRATIONS</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Integrations Hub</h1>
          <p className="text-sm sm:text-base text-gray-500">Connect your platforms and sync data across your marketing stack</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { l: 'CONNECTED', v: String(connected.length) },
          { l: 'AVAILABLE', v: String(available.length) },
          { l: 'TOTAL', v: String(providers.length) },
          { l: 'ERRORS', v: String(errorCount) },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.l}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {['connected', 'available', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`chip text-xs ${tab === t ? 'active' : ''}`}
            style={tab === t ? { background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t === 'connected' ? `Connected (${connected.length})` : `Available (${available.length})`}
          </button>
        ))}
      </div>

      {/* Connected Tab */}
      {tab === 'connected' && (
        <div className="space-y-3 animate-fade-in">
          {connected.length === 0 ? (
            <div className="panel rounded-2xl p-5 sm:p-8 text-center">
              <p className="text-gray-500 text-base">No platforms connected yet.</p>
              <button onClick={() => setTab('available')} className="mt-3 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Browse available integrations &rarr;
              </button>
            </div>
          ) : connected.map(p => (
            <div key={p.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-sm font-bold text-indigo-400 flex-shrink-0 overflow-hidden">
                  {BRAND_ICON_MAP[p.id] ? (
                    <img src={`/brands/${BRAND_ICON_MAP[p.id]}.svg`} alt={p.name} className="w-6 h-6" />
                  ) : p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-200">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {p.accountName ? `${p.accountName} · ` : ''}{p.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[p.category] || TYPE_COLORS.data}`}>
                  {p.category}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
                <button
                  onClick={() => disconnect(p.id)}
                  disabled={disconnectingId === p.id}
                  className="text-xs font-bold px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 ml-auto sm:ml-0"
                >
                  {disconnectingId === p.id ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Tab */}
      {tab === 'available' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
          {available.map(p => (
            <div key={p.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-sm font-bold text-indigo-400 flex-shrink-0 overflow-hidden">
                  {BRAND_ICON_MAP[p.id] ? (
                    <img src={`/brands/${BRAND_ICON_MAP[p.id]}.svg`} alt={p.name} className="w-6 h-6" />
                  ) : p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-200">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>
                </div>
                <span className="text-[9px] text-gray-500 font-mono flex-shrink-0">{p.category}</span>
              </div>
              <button
                onClick={() => connectApiKey(p)}
                className="text-xs font-bold px-4 py-2 rounded-xl border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-colors w-full sm:w-auto"
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* OAuth Error Banner */}
      {oauthError && (
        <div className="panel rounded-xl p-4 mb-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-400 flex-1">{oauthError}</p>
            <button onClick={() => setOauthError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <AIToolsTab templates={AI_TEMPLATES} color="#6366f1" apiEndpoint="/api/integrations/generate" />
      )}

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setApiKeyModal(null)} />

          {/* Modal */}
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-up overflow-hidden"
            style={{ background: dark ? '#1E1B18' : '#FFFFFF', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.1)'}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent gradient bar */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #C45D3E, #D4915C, #5E8E6E)' }} />

            {/* Close button */}
            <button
              onClick={() => setApiKeyModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10"
              style={{ color: '#94908A' }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center gap-3.5 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    background: dark ? 'rgba(196,93,62,0.1)' : 'rgba(196,93,62,0.06)',
                    border: `1px solid ${dark ? 'rgba(196,93,62,0.15)' : 'rgba(196,93,62,0.1)'}`,
                  }}
                >
                  {BRAND_ICON_MAP[apiKeyModal.id] ? (
                    <img src={`/brands/${BRAND_ICON_MAP[apiKeyModal.id]}.svg`} alt={apiKeyModal.name} className="w-7 h-7" />
                  ) : (
                    <span className="text-base font-bold" style={{ color: '#C45D3E' }}>{apiKeyModal.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-[17px] font-bold" style={{
                    color: dark ? '#E8E4DE' : '#332F2B',
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                  }}>
                    Connect {apiKeyModal.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                      background: dark ? 'rgba(196,93,62,0.1)' : 'rgba(196,93,62,0.06)',
                      color: '#C45D3E',
                      border: `1px solid ${dark ? 'rgba(196,93,62,0.2)' : 'rgba(196,93,62,0.1)'}`,
                    }}>
                      {apiKeyModal.category || 'platform'}
                    </span>
                    <span className="text-[11px]" style={{ color: '#94908A' }}>API Key Auth</span>
                  </div>
                </div>
              </div>

              {/* Help callout */}
              {apiKeyModal.helpText && (
                <div className="rounded-xl px-4 py-3" style={{
                  background: dark ? 'rgba(94,142,110,0.06)' : 'rgba(94,142,110,0.04)',
                  border: `1px solid ${dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)'}`,
                }}>
                  <div className="flex items-start gap-2.5">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#5E8E6E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                    <div>
                      <p className="text-[11px] leading-relaxed" style={{ color: dark ? 'rgba(94,142,110,0.9)' : '#5E8E6E' }}>
                        {apiKeyModal.helpText}
                      </p>
                      {apiKeyModal.helpUrl && (
                        <a
                          href={apiKeyModal.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1.5 transition-opacity hover:opacity-70"
                          style={{ color: '#5E8E6E' }}
                        >
                          Get credentials from {apiKeyModal.name}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-6" style={{ height: 1, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)' }} />

            {/* Credential fields */}
            <div className="px-6 py-5 space-y-4">
              {apiKeyModal.credentials?.map(field => {
                const isSecret = field.key.includes('token') || field.key.includes('secret') || field.key.includes('key');
                return (
                  <div key={field.key}>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: dark ? '#6B6660' : '#94908A' }}>
                      {isSecret && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      )}
                      {field.label}
                      {field.required !== false && <span style={{ color: '#C45D3E', marginLeft: 2 }}>*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={isSecret && !showPasswords[field.key] ? 'password' : 'text'}
                        value={apiKeyForm[field.key] || ''}
                        onChange={e => setApiKeyForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-3 rounded-xl text-[13px] transition-all duration-200 focus:outline-none"
                        style={{
                          background: dark ? 'rgba(255,255,255,0.04)' : '#F5F0E8',
                          border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)'}`,
                          color: dark ? '#E8E4DE' : '#332F2B',
                          paddingRight: isSecret ? '2.75rem' : undefined,
                        }}
                        onFocus={e => e.target.style.borderColor = dark ? 'rgba(196,93,62,0.35)' : 'rgba(196,93,62,0.4)'}
                        onBlur={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)'}
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                          style={{ color: '#94908A' }}
                          onMouseEnter={e => e.currentTarget.style.color = dark ? '#E8E4DE' : '#332F2B'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94908A'}
                        >
                          {showPasswords[field.key] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }) || <p className="text-sm" style={{ color: '#94908A' }}>No credential fields configured for this provider.</p>}
            </div>

            {/* Error */}
            {apiKeyError && (
              <div className="mx-6 mb-4 px-4 py-3 rounded-xl" style={{
                background: dark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-[12px]" style={{ color: '#ef4444' }}>{apiKeyError}</p>
                </div>
              </div>
            )}

            {/* Security note */}
            <div className="mx-6 mb-4 flex items-center gap-1.5">
              <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#94908A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <p className="text-[10px]" style={{ color: '#94908A' }}>Credentials are encrypted and stored securely on the server.</p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setApiKeyModal(null)}
                className="flex-1 px-5 py-3 rounded-xl text-[13px] font-medium transition-colors"
                style={{
                  background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                  color: dark ? '#6B6660' : '#94908A',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)'}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitApiKey}
                disabled={apiKeySaving}
                className="flex-1 px-5 py-3 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #C45D3E, #C45D3Edd)',
                  boxShadow: '0 4px 14px -3px rgba(196,93,62,0.35)',
                }}
              >
                {apiKeySaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    Connect {apiKeyModal.name}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopify Shop Modal */}
      {shopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShopModal(false); setConnectingId(null); }}>
          <div className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl p-5 sm:p-8 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Connect Shopify</h3>
            <p className="text-sm text-gray-500 mb-5">Enter your Shopify store subdomain to continue.</p>

            <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Shop Name</label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="your-store"
                className="flex-1 px-4 py-3 rounded-l-xl bg-white/[0.04] border border-white/[0.08] border-r-0 text-base text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/30 transition-colors"
                onKeyDown={e => e.key === 'Enter' && submitShop()}
              />
              <span className="px-4 py-3 rounded-r-xl bg-white/[0.02] border border-white/[0.08] text-sm text-gray-500">.myshopify.com</span>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShopModal(false); setConnectingId(null); }}
                className="flex-1 px-5 py-3 rounded-xl border border-white/[0.08] text-base text-gray-400 hover:bg-white/[0.04] transition-colors">
                Cancel
              </button>
              <button onClick={submitShop}
                className="flex-1 px-5 py-3 rounded-xl bg-indigo-600 text-base font-semibold text-white hover:bg-indigo-500 transition-colors">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      <AIInsightsPanel moduleId="integrations" />
    </div>
  );
}

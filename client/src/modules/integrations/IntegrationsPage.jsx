import { useState, useEffect, useCallback } from 'react';

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

  // Shopify shop modal
  const [shopModal, setShopModal] = useState(false);
  const [shopName, setShopName] = useState('');

  // AI tools state
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/providers');
      const data = await res.json();
      if (data.success) setProviders(data.data);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
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
  };

  const submitApiKey = async () => {
    setApiKeySaving(true);
    setApiKeyError('');
    try {
      const res = await fetch('/api/integrations/connections/api-key', {
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

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/integrations/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const connected = providers.filter(p => p.status === 'connected');
  const available = providers.filter(p => p.status !== 'connected');
  const errorCount = providers.filter(p => p.status === 'error' || p.status === 'expired').length;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center h-64 gap-3">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#a5b4fc', animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: '#6366f1' }}>INTEGRATIONS</p>
        <h1 className="text-2xl font-bold text-white mb-1">Integrations Hub</h1>
        <p className="text-sm text-gray-500">Connect your platforms and sync data across your marketing stack</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { l: 'CONNECTED', v: String(connected.length) },
          { l: 'AVAILABLE', v: String(available.length) },
          { l: 'TOTAL', v: String(providers.length) },
          { l: 'ERRORS', v: String(errorCount) },
        ].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4">
            <p className="hud-label mb-1">{s.l}</p>
            <p className="text-2xl font-bold text-white font-mono">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
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
        <div className="space-y-2 animate-fade-in">
          {connected.length === 0 ? (
            <div className="panel rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No platforms connected yet.</p>
              <button onClick={() => setTab('available')} className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Browse available integrations &rarr;
              </button>
            </div>
          ) : connected.map(p => (
            <div key={p.id} className="panel rounded-xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200">{p.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {p.accountName ? `${p.accountName} · ` : ''}{p.description}
                </p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[p.category] || TYPE_COLORS.data}`}>
                {p.category}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status]}`}>
                {p.status}
              </span>
              <button
                onClick={() => disconnect(p.id)}
                disabled={disconnectingId === p.id}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {disconnectingId === p.id ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Tab */}
      {tab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-fade-in">
          {available.map(p => (
            <div key={p.id} className="panel rounded-xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200">{p.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{p.description}</p>
              </div>
              <span className="text-[9px] text-gray-500 font-mono">{p.category}</span>
              {p.authType === 'oauth2' ? (
                <button
                  onClick={() => connectOAuth(p)}
                  disabled={connectingId === p.id || (!p.configured && p.authType === 'oauth2')}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {connectingId === p.id ? 'Connecting...' : !p.configured ? 'Not Configured' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={() => connectApiKey(p)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-colors flex-shrink-0"
                >
                  Enter Key
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            {AI_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generate(t)} disabled={generating}
                className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === t.name ? 'border-indigo-500/20' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{t.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-400'}`} />
                <span className="hud-label" style={{ color: '#818cf8' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {output}{generating && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse" />}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setApiKeyModal(null)}>
          <div className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Connect {apiKeyModal.name}</h3>
            <p className="text-xs text-gray-500 mb-5">Enter your credentials to connect {apiKeyModal.name}.</p>

            <div className="space-y-3">
              {apiKeyModal.credentials.map(field => (
                <div key={field.key}>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    value={apiKeyForm[field.key] || ''}
                    onChange={e => setApiKeyForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/30 transition-colors"
                  />
                </div>
              ))}
            </div>

            {apiKeyError && (
              <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{apiKeyError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setApiKeyModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.08] text-sm text-gray-400 hover:bg-white/[0.04] transition-colors">
                Cancel
              </button>
              <button onClick={submitApiKey} disabled={apiKeySaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
                {apiKeySaving ? 'Saving...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopify Shop Modal */}
      {shopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShopModal(false); setConnectingId(null); }}>
          <div className="bg-[#0c0c14] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Connect Shopify</h3>
            <p className="text-xs text-gray-500 mb-5">Enter your Shopify store subdomain to continue.</p>

            <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Shop Name</label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="your-store"
                className="flex-1 px-3 py-2.5 rounded-l-lg bg-white/[0.04] border border-white/[0.08] border-r-0 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/30 transition-colors"
                onKeyDown={e => e.key === 'Enter' && submitShop()}
              />
              <span className="px-3 py-2.5 rounded-r-lg bg-white/[0.02] border border-white/[0.08] text-xs text-gray-500">.myshopify.com</span>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShopModal(false); setConnectingId(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.08] text-sm text-gray-400 hover:bg-white/[0.04] transition-colors">
                Cancel
              </button>
              <button onClick={submitShop}
                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

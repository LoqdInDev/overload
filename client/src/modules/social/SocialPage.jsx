import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';

const MODULE_COLOR = '#3b82f6';

const SOCIAL_PLATFORMS = [
  { id: 'twitter', provider: 'twitter', name: 'Twitter / X', icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z', color: '#1DA1F2' },
  { id: 'instagram', provider: 'meta', name: 'Instagram', icon: 'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z', color: '#E1306C' },
  { id: 'facebook', provider: 'meta', name: 'Facebook', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', color: '#1877F2' },
  { id: 'linkedin', provider: 'linkedin', name: 'LinkedIn', icon: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0', color: '#0A66C2' },
  { id: 'tiktok', provider: 'tiktok', name: 'TikTok', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z', color: '#000000' },
  { id: 'youtube', provider: 'google', name: 'YouTube', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z', color: '#FF0000' },
  { id: 'pinterest', provider: 'pinterest', name: 'Pinterest', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', color: '#E60023' },
];

const TEMPLATES = {
  instagram: [
    { name: 'Product Launch', prompt: 'Write an Instagram caption for a product launch. Include a hook, key features, CTA, and relevant hashtags. Make it visually descriptive.' },
    { name: 'Behind the Scenes', prompt: 'Write a behind-the-scenes Instagram caption showing our team/process. Keep it authentic, personal, and engaging.' },
    { name: 'Educational Tip', prompt: 'Write an educational carousel-style Instagram caption with numbered tips. Include a strong hook and save-worthy value.' },
    { name: 'User Testimonial', prompt: 'Write an Instagram caption showcasing a customer success story. Include the transformation, quote-style text, and social proof.' },
  ],
  twitter: [
    { name: 'Product Launch', prompt: 'Write a 5-tweet Twitter thread announcing a new product launch. Start with a hook tweet, build excitement, end with CTA.' },
    { name: 'Hot Take', prompt: 'Write a Twitter thread sharing a bold industry opinion. Make it engaging and encourage debate.' },
    { name: 'Educational Tip', prompt: 'Write a value-packed Twitter thread teaching something useful. Use numbered points, examples, and a strong opener.' },
    { name: 'User Testimonial', prompt: 'Write a Twitter thread sharing a customer success story with real results. Include metrics and takeaways.' },
  ],
  linkedin: [
    { name: 'Product Launch', prompt: 'Write a LinkedIn post announcing a product launch. Professional tone, highlight business value, include a CTA.' },
    { name: 'Thought Leadership', prompt: 'Write a LinkedIn thought leadership post with actionable advice. Include a personal anecdote and key takeaways.' },
    { name: 'Company Culture', prompt: 'Write a LinkedIn post sharing a company culture story. Personal, authentic, with a leadership lesson.' },
    { name: 'Case Study', prompt: 'Write a LinkedIn case study post featuring a client success story with measurable results.' },
  ],
  tiktok: [
    { name: 'Product Launch', prompt: 'Write a TikTok caption for a product launch video. Short, punchy, trend-aware with relevant hashtags.' },
    { name: 'BTS Content', prompt: 'Write a BTS TikTok caption that feels raw and authentic. Use trending audio references and casual tone.' },
    { name: 'Educational', prompt: 'Write a "things nobody tells you about" style TikTok caption. Hook-driven, conversational, with hashtags.' },
    { name: 'Testimonial', prompt: 'Write a TikTok caption for a customer review/reaction video. Emphasize transformation and results.' },
  ],
  facebook: [
    { name: 'Product Launch', prompt: 'Write a Facebook post announcing a new product. Include engaging copy, key features, and a link CTA.' },
    { name: 'Community Post', prompt: 'Write a Facebook post that sparks community discussion. Ask a question and encourage comments and sharing.' },
    { name: 'Educational Tip', prompt: 'Write a Facebook post sharing a helpful tip or tutorial. Make it shareable and save-worthy.' },
    { name: 'Testimonial', prompt: 'Write a Facebook post featuring a customer review with their story. Encourage others to share experiences.' },
  ],
};

const TONES = ['Professional', 'Casual', 'Witty', 'Bold', 'Empathetic', 'Trendy'];
const charLimits = { instagram: 2200, twitter: 280, linkedin: 3000, tiktok: 2200, facebook: 63206, youtube: 5000, pinterest: 500 };

export default function SocialPage() {
  usePageTitle('Social Media');
  const { dark } = useTheme();
  const [tab, setTab] = useState('create'); // create | accounts | publish
  const [activeType, setActiveType] = useState(null);
  const [tone, setTone] = useState('Casual');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [postLength, setPostLength] = useState('Medium');
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState(null);

  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [connectError, setConnectError] = useState(null); // { providerId, message }

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishStatus, setPublishStatus] = useState(null);
  const [publishText, setPublishText] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      const [acctRes, provRes] = await Promise.all([
        fetch('/api/social/accounts'),
        fetch('/api/integrations/providers'),
      ]);
      const acctData = await acctRes.json();
      const provData = await provRes.json();
      if (acctData.success) setConnectedAccounts(acctData.data);
      if (provData.success) setAllProviders(provData.data);
    } catch (e) { console.error('Fetch accounts error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'oauth-callback') {
        setConnectingId(null);
        fetchAccounts();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchAccounts]);

  const getProviderConfig = (providerId) => allProviders.find(p => p.id === providerId);

  const connectAccount = async (platform) => {
    const providerId = platform.provider;
    setConnectError(null);

    // Check if provider is configured (has API keys in .env)
    const provConfig = getProviderConfig(providerId);
    if (provConfig && !provConfig.configured) {
      setConnectError({
        providerId,
        message: `${platform.name} requires API credentials. Add ${providerId.toUpperCase()}_CLIENT_ID and ${providerId.toUpperCase()}_CLIENT_SECRET to your .env file, then restart the server.`,
      });
      return;
    }

    setConnectingId(providerId);
    try {
      const res = await fetch(`/api/integrations/oauth/authorize/${providerId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const popup = window.open(data.authUrl, 'oauth-connect', 'width=600,height=700,scrollbars=yes');

      // Fallback: poll for popup close
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          setConnectingId(null);
          fetchAccounts();
        }
      }, 1000);
    } catch (err) {
      console.error('OAuth error:', err);
      setConnectError({ providerId, message: err.message });
      setConnectingId(null);
    }
  };

  const disconnectAccount = async (providerId) => {
    setDisconnectingId(providerId);
    try {
      await fetch(`/api/integrations/connections/${providerId}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnectingId(null);
    }
  };

  const generate = async () => {
    if (!prompt.trim() || !activeType) return;
    setGenerating(true);
    setResult('');
    setStreamText('');
    setGenError(null);
    const fullPrompt = `[Platform: ${activeType}] [Tone: ${tone}] [Length: ${postLength}] [Hashtags: ${includeHashtags ? 'Yes' : 'No'}] [Emojis: ${includeEmojis ? 'Yes' : 'No'}]\n\n${prompt}`;
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: activeType, prompt: fullPrompt, tone, includeHashtags, includeEmojis, postLength }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') { fullText += data.text; setStreamText(fullText); }
            else if (data.type === 'result') { setResult(data.data?.content || fullText); }
          } catch {}
        }
      }
      if (!result && fullText) setResult(fullText);
    } catch (e) {
      console.error('Generation error:', e);
      setGenError(e.message || 'Failed to generate post. Please try again.');
    } finally { setGenerating(false); }
  };

  const publishToProvider = async (providerId) => {
    const text = publishText || result || streamText;
    if (!text.trim()) return;
    setPublishing(true);
    setPublishStatus(null);
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, text, caption: text }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus({ type: 'success', msg: `Published to ${providerId}!` });
      } else {
        setPublishStatus({ type: 'error', msg: data.error || 'Failed to publish' });
      }
    } catch (e) {
      setPublishStatus({ type: 'error', msg: e.message });
    } finally { setPublishing(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || streamText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsTxt = () => {
    const content = result || streamText;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeType}-post.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const getProviderStatus = (providerId) => {
    const prov = allProviders.find(p => p.id === providerId);
    return prov?.status === 'connected';
  };

  const socialConnected = SOCIAL_PLATFORMS.filter(p => getProviderStatus(p.provider));

  const panelCls = dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm';

  // ════════════════════════════════════════════════════
  // TABS
  // ════════════════════════════════════════════════════
  return (
    <div className="p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>SOCIAL MEDIA ENGINE</p>
        <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Social Media</h1>
        <p className={`text-base ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Create, publish, and track your social media content</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {[
          { id: 'create', label: 'Create Content', count: null },
          { id: 'accounts', label: 'Connected Accounts', count: socialConnected.length },
          { id: 'publish', label: 'Publish', count: null },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? `${dark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' : 'bg-blue-50 text-blue-700 border border-blue-200'}`
                : `${dark ? 'text-gray-500 hover:text-gray-300 border border-transparent' : 'text-gray-500 hover:text-gray-700 border border-transparent'}`
            }`}>
            {t.label}
            {t.count !== null && <span className="ml-1.5 text-xs font-mono opacity-60">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ ACCOUNTS TAB ═══ */}
      {tab === 'accounts' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <p className="hud-label text-[11px]">SOCIAL PLATFORMS</p>
            <div className="flex-1 hud-line" />
          </div>

          {/* Error banner */}
          {connectError && (
            <div className={`rounded-xl p-4 sm:p-6 flex items-start gap-3 ${dark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
              <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${dark ? 'text-red-300' : 'text-red-700'}`}>Connection Error</p>
                <p className={`text-[11px] mt-0.5 ${dark ? 'text-red-400/80' : 'text-red-600'}`}>{connectError.message}</p>
              </div>
              <button onClick={() => setConnectError(null)} className={`text-xs font-semibold px-2 py-1 rounded-md ${dark ? 'text-red-400/60 hover:text-red-400' : 'text-red-400 hover:text-red-600'}`}>
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {SOCIAL_PLATFORMS.map(platform => {
              const isConnected = getProviderStatus(platform.provider);
              const acct = connectedAccounts.find(a => a.providerId === platform.provider);
              const isConnecting = connectingId === platform.provider;
              const isDisconnecting = disconnectingId === platform.provider;
              const provConfig = getProviderConfig(platform.provider);
              const isConfigured = provConfig?.configured !== false;
              return (
                <div key={platform.id} className={`${panelCls} rounded-2xl p-4 sm:p-6 transition-all`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30` }}>
                      <svg className="w-6 h-6" style={{ color: platform.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={platform.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{platform.name}</p>
                      {isConnected && acct ? (
                        <p className={`text-xs truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{acct.accountName || acct.username || 'Connected'}</p>
                      ) : !isConfigured ? (
                        <p className={`text-xs ${dark ? 'text-amber-500/70' : 'text-amber-600'}`}>API keys not configured</p>
                      ) : (
                        <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Not connected</p>
                      )}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : !isConfigured ? 'bg-amber-400' : dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                  </div>

                  {isConnected ? (
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 text-xs font-semibold ${dark ? 'text-emerald-400/70' : 'text-emerald-600'}`}>Connected</span>
                      {acct?.followers > 0 && (
                        <span className={`text-xs font-mono ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{Number(acct.followers).toLocaleString()} followers</span>
                      )}
                      <button onClick={() => disconnectAccount(platform.provider)} disabled={isDisconnecting}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-all ${dark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'} disabled:opacity-40`}>
                        {isDisconnecting ? '...' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => connectAccount(platform)} disabled={isConnecting}
                      className="w-full text-center py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: `${platform.color}15`, color: platform.color, border: `1px solid ${platform.color}25` }}>
                      {isConnecting ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
                          Connecting...
                        </span>
                      ) : !isConfigured ? 'Setup Required' : 'Connect Account'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {socialConnected.length === 0 && !connectError && (
            <div className={`${panelCls} rounded-2xl p-5 sm:p-8 text-center`}>
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <p className={`text-base font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>No accounts connected yet</p>
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                To connect accounts, add your API credentials to the <code className={`px-1 py-0.5 rounded text-xs ${dark ? 'bg-white/5' : 'bg-gray-100'}`}>.env</code> file and click "Connect Account" above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ PUBLISH TAB ═══ */}
      {tab === 'publish' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className={`${panelCls} rounded-2xl p-4 sm:p-7`}>
            <p className="hud-label text-[11px] mb-3">COMPOSE POST</p>
            <textarea value={publishText} onChange={(e) => setPublishText(e.target.value)} rows={5}
              placeholder="Write your post content here... (or create content in the Create tab and come back)"
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />

            {(result || streamText) && !publishText && (
              <button onClick={() => setPublishText(result || streamText)}
                className={`mt-2 text-xs font-semibold px-3 py-1 rounded-lg ${dark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                Use generated content
              </button>
            )}
          </div>

          {publishStatus && (
            <div className={`${panelCls} rounded-2xl p-4 sm:p-6 ${publishStatus.type === 'success' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
              <p className={`text-base font-semibold ${publishStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{publishStatus.msg}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-2">
            <p className="hud-label text-[11px]">PUBLISH TO</p>
            <div className="flex-1 hud-line" />
          </div>

          {socialConnected.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {socialConnected.map(platform => (
                <button key={platform.id} onClick={() => publishToProvider(platform.provider)}
                  disabled={publishing || !publishText.trim()}
                  className={`${panelCls} rounded-2xl p-4 sm:p-6 text-center transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100`}>
                  <div className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30` }}>
                    <svg className="w-6 h-6" style={{ color: platform.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={platform.icon} />
                    </svg>
                  </div>
                  <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{platform.name}</p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {publishing && publishTarget === platform.provider ? 'Publishing...' : 'Publish'}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className={`${panelCls} rounded-2xl p-5 sm:p-8 text-center`}>
              <p className={`text-base ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Connect social accounts in the Accounts tab first.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ CREATE TAB ═══ */}
      {tab === 'create' && !activeType && (
        <div className="animate-fade-in">
          {/* Connected accounts strip */}
          {socialConnected.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="hud-label text-[11px]">CONNECTED</p>
                <div className="flex flex-wrap gap-1.5">
                  {socialConnected.map(p => (
                    <div key={p.id} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${p.color}20`, border: `1px solid ${p.color}30` }}>
                      <svg className="w-4 h-4" style={{ color: p.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
            {SOCIAL_PLATFORMS.filter(p => p.id !== 'youtube' && p.id !== 'pinterest').map(type => (
              <button key={type.id} onClick={() => setActiveType(type.id)}
                className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} rounded-2xl p-4 sm:p-7 text-center group transition-all`}>
                <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${type.color}15`, border: `1px solid ${type.color}20` }}>
                  <svg className="w-6 h-6" style={{ color: type.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                  </svg>
                </div>
                <p className={`text-sm font-bold transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{type.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getProviderStatus(type.provider) ? 'bg-emerald-400' : dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                  <p className={`text-xs ${getProviderStatus(type.provider) ? 'text-emerald-400/70' : dark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {getProviderStatus(type.provider) ? 'Connected' : 'Not connected'}
                  </p>
                </div>
                {!getProviderStatus(type.provider) && (
                  <p className="text-[9px] mt-1 font-semibold" style={{ color: type.color }}
                    onClick={(e) => { e.stopPropagation(); setTab('accounts'); }}>
                    Connect &rarr;
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Templates preview */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <p className="hud-label text-[11px]">POPULAR TEMPLATES</p>
              <div className="flex-1 hud-line" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
              {Object.entries(TEMPLATES).slice(0, 4).map(([type, tmpls]) => {
                const ct = SOCIAL_PLATFORMS.find(c => c.id === type);
                const t = tmpls[0];
                return (
                  <button key={`${type}-${t.name}`} onClick={() => { setActiveType(type); setPrompt(t.prompt); }}
                    className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'} rounded-lg p-4 sm:p-6 text-left group transition-all`}>
                    <p className="hud-label text-[11px] mb-1.5" style={{ color: ct?.color || MODULE_COLOR }}>{ct?.name}</p>
                    <p className={`text-sm font-semibold transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700'}`}>{t.name}</p>
                    <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ GENERATOR ═══ */}
      {tab === 'create' && activeType && (() => {
        const currentType = SOCIAL_PLATFORMS.find(t => t.id === activeType);
        const templates = TEMPLATES[activeType] || [];
        const charCount = (result || streamText).length;
        const maxChars = charLimits[activeType] || 2200;
        const isConnected = getProviderStatus(currentType?.provider);

        return (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8">
              <button onClick={() => { setActiveType(null); setResult(''); setStreamText(''); setPrompt(''); }}
                className={`p-2 rounded-md border transition-all ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="hud-label text-[11px]" style={{ color: currentType?.color || MODULE_COLOR }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
                <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Create {currentType?.name} Post</h2>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ background: `${currentType?.color}10`, border: `1px solid ${currentType?.color}20` }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className={`text-xs font-semibold ${dark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>Connected</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Templates */}
                <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <p className="hud-label text-[11px] mb-3">TEMPLATES</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map(t => (
                      <button key={t.name} onClick={() => setPrompt(t.prompt)}
                        className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                          prompt === t.prompt
                            ? `border-blue-500/30 bg-blue-500/10 ${dark ? 'text-blue-300' : 'text-blue-700'}`
                            : `${dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-800'}`
                        }`}>
                        <p className="font-semibold">{t.name}</p>
                        <p className={`text-xs mt-0.5 line-clamp-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt */}
                <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <p className="hud-label text-[11px] mb-3">YOUR BRIEF</p>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
                    placeholder="Describe your content: topic, key message, target audience, any specific angles or hooks..."
                    className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
                </div>

                {/* Generate */}
                <button onClick={generate} disabled={generating || !prompt.trim()}
                  className="btn-accent w-full py-3 rounded-lg font-bold text-sm tracking-wide"
                  style={{ background: generating ? (dark ? '#1e1e2e' : '#e5e7eb') : (currentType?.color || MODULE_COLOR), boxShadow: generating ? 'none' : `0 4px 20px -4px ${currentType?.color || MODULE_COLOR}66` }}>
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                      GENERATING...
                    </span>
                  ) : `GENERATE ${currentType?.name?.toUpperCase()} POST`}
                </button>
              </div>

              {/* Right: Settings */}
              <div className="space-y-4 sm:space-y-6">
                {/* Tone */}
                <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <p className="hud-label text-[11px] mb-3">TONE</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TONES.map(t => (
                      <button key={t} onClick={() => setTone(t)}
                        className={`chip text-[10px] justify-center ${tone === t ? 'active' : ''}`}
                        style={tone === t ? { background: `${currentType?.color || MODULE_COLOR}25`, borderColor: `${currentType?.color || MODULE_COLOR}50`, color: currentType?.color || MODULE_COLOR } : {}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Post length */}
                <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <p className="hud-label text-[11px] mb-3">POST LENGTH</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Short', 'Medium', 'Long'].map(l => (
                      <button key={l} onClick={() => setPostLength(l)}
                        className={`chip text-[10px] justify-center ${postLength === l ? 'active' : ''}`}
                        style={postLength === l ? { background: `${currentType?.color || MODULE_COLOR}25`, borderColor: `${currentType?.color || MODULE_COLOR}50`, color: currentType?.color || MODULE_COLOR } : {}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <p className="hud-label text-[11px] mb-3">OPTIONS</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Include Hashtags', value: includeHashtags, setter: setIncludeHashtags },
                      { label: 'Include Emojis', value: includeEmojis, setter: setIncludeEmojis },
                    ].map(opt => (
                      <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                          opt.value
                            ? `border-blue-500/30 bg-blue-500/10 ${dark ? 'text-blue-300' : 'text-blue-700'}`
                            : `${dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`
                        }`}>
                        <span className="font-semibold">{opt.label}</span>
                        <div className={`w-8 h-4 rounded-full transition-all flex items-center ${opt.value ? 'justify-end' : 'justify-start'}`}
                          style={{ background: opt.value ? `${currentType?.color || MODULE_COLOR}40` : dark ? '#333' : '#d1d5db' }}>
                          <div className="w-3 h-3 rounded-full mx-0.5 transition-all" style={{ background: opt.value ? (currentType?.color || MODULE_COLOR) : dark ? '#666' : '#9ca3af' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                {(streamText || result) && (
                  <div className={`${panelCls} rounded-2xl p-4 sm:p-6 animate-fade-up`}>
                    <p className="hud-label text-[11px] mb-3">OUTPUT STATS</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Characters</span>
                        <span className={`font-mono font-bold ${charCount > maxChars ? 'text-red-400' : dark ? 'text-white' : 'text-gray-900'}`}>{charCount}/{maxChars}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: dark ? '#1a1a2e' : '#e5e7eb' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (charCount / maxChars) * 100)}%`, background: charCount > maxChars ? '#ef4444' : (currentType?.color || MODULE_COLOR) }} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Words</span>
                        <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{(result || streamText).split(/\s+/).filter(Boolean).length}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {genError && (
              <div className={`${panelCls} rounded-xl p-4 mt-4 animate-fade-up`} style={{ borderColor: 'rgba(239,68,68,0.2)', background: dark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className={`text-xs flex-1 ${dark ? 'text-red-400' : 'text-red-600'}`}>{genError}</p>
                  <button onClick={() => setGenError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
                </div>
              </div>
            )}

            {/* Streaming */}
            {(generating || streamText) && !result && (
              <div className={`${panelCls} rounded-2xl p-4 sm:p-7 mt-6 animate-fade-up`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: currentType?.color || MODULE_COLOR }} />
                  <span className="hud-label text-[11px]" style={{ color: currentType?.color || MODULE_COLOR }}>GENERATING</span>
                </div>
                <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-7 max-h-[50vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {streamText}<span className="inline-block w-[2px] h-4 ml-0.5 animate-pulse" style={{ background: currentType?.color || MODULE_COLOR }} />
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`${panelCls} rounded-2xl p-4 sm:p-7 mt-6 animate-fade-up`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>COMPLETE</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={copyToClipboard} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={exportAsTxt} className="chip text-[10px]">Export TXT</button>
                    <button onClick={generate} className="chip text-[10px]">Regenerate</button>
                    {isConnected && (
                      <button onClick={() => { setPublishText(result); setTab('publish'); }}
                        className="chip text-[10px] font-bold" style={{ background: `${currentType?.color}20`, borderColor: `${currentType?.color}40`, color: currentType?.color }}>
                        Publish
                      </button>
                    )}
                  </div>
                </div>
                <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-7 max-h-[60vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {result}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

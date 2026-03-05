import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import { fetchJSON, deleteJSON, postJSON } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';
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
const CONTENT_TYPES = ['Blog Post', 'YouTube Script', 'Product Description', 'Newsletter', 'Podcast Transcript', 'Press Release', 'Case Study'];

// ─── Post Preview Component ───────────────────────────────────────────────────
function PostPreview({ platform, content, dark }) {
  const p = SOCIAL_PLATFORMS.find(x => x.id === platform);
  const text = content?.slice(0, charLimits[platform] || 500) || '';
  const cls = dark ? 'bg-[#0f0f1a] border-gray-200 text-gray-200' : 'bg-white border-gray-200 text-gray-900';

  if (platform === 'twitter') return (
    <div className={`rounded-2xl border p-4 max-w-sm ${cls}`}>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: `${p.color}20`, border: `1px solid ${p.color}30` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Your Name</span>
            <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>@handle · 1m</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{text.slice(0, 280)}</p>
          {text.length > 280 && <p className="text-xs text-red-400 mt-1">⚠ Over 280 character limit</p>}
          <div className={`flex gap-5 mt-3 text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            <span>💬 0</span><span>🔁 0</span><span>❤️ 0</span><span>📊 0</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (platform === 'instagram') return (
    <div className={`rounded-2xl border overflow-hidden max-w-xs ${cls}`}>
      <div className="flex items-center gap-2.5 p-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)' }} />
        <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>username</span>
        <span className={`ml-auto text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>···</span>
      </div>
      <div className={`w-full aspect-square flex items-center justify-center text-sm ${dark ? 'bg-white/[0.03] text-gray-600' : 'bg-gray-100 text-gray-400'}`}>
        <span>📷 Image / Video</span>
      </div>
      <div className="p-3">
        <div className={`flex gap-3 mb-2 text-lg`}>❤️ 💬 📤 <span className="ml-auto">🔖</span></div>
        <p className={`text-xs font-bold mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>username</p>
        <p className="text-xs whitespace-pre-wrap line-clamp-3 leading-relaxed">{text}</p>
      </div>
    </div>
  );

  if (platform === 'linkedin') return (
    <div className={`rounded-xl border p-4 max-w-sm ${cls}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: '#0A66C215', border: '1px solid #0A66C230' }} />
        <div>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Your Name</p>
          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Your Title · 1st · 1h</p>
        </div>
        <span className="ml-auto text-xs" style={{ color: '#0A66C2' }}>+ Follow</span>
      </div>
      <p className="text-sm whitespace-pre-wrap line-clamp-5 leading-relaxed">{text}</p>
      <div className={`flex gap-4 mt-3 pt-3 text-xs border-t ${dark ? 'border-white/[0.05] text-gray-500' : 'border-gray-100 text-gray-400'}`}>
        <span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span>
      </div>
    </div>
  );

  if (platform === 'tiktok') return (
    <div className={`rounded-2xl border overflow-hidden max-w-[200px] ${cls}`}>
      <div className="aspect-[9/16] flex items-center justify-center text-3xl relative" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
        🎬
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-[10px] font-bold mb-0.5">@username</p>
          <p className="text-white/80 text-[10px] line-clamp-3">{text.slice(0, 150)}</p>
        </div>
      </div>
    </div>
  );

  // Facebook default
  return (
    <div className={`rounded-xl border p-4 max-w-sm ${cls}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full" style={{ background: '#1877F215', border: '1px solid #1877F230' }} />
        <div>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Your Page</p>
          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>1 min · 🌐</p>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap line-clamp-5 leading-relaxed">{text}</p>
      <div className={`flex gap-4 mt-3 pt-3 text-xs border-t ${dark ? 'border-white/[0.05] text-gray-500' : 'border-gray-100 text-gray-400'}`}>
        <span>👍 Like</span><span>💬 Comment</span><span>↗️ Share</span>
      </div>
    </div>
  );
}

export default function SocialPage() {
  usePageTitle('Social Media');
  const { dark } = useTheme();
  const [tab, setTab] = useState('create');
  const [activeType, setActiveType] = useState(null);

  // Core generation
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
  const [showPreview, setShowPreview] = useState(false);

  // Cross-platform
  const [crossGenerating, setCrossGenerating] = useState(false);
  const [crossStream, setCrossStream] = useState('');
  const [crossResult, setCrossResult] = useState('');

  // Caption variations & hashtags
  const [captionVariations, setCaptionVariations] = useState(null);
  const [hashtagData, setHashtagData] = useState(null);
  const [hashtagTopic, setHashtagTopic] = useState('');
  const [varLoading, setVarLoading] = useState(false);
  const [hashLoading, setHashLoading] = useState(false);

  // Accounts
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [connectError, setConnectError] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  // Publish
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishStatus, setPublishStatus] = useState(null);
  const [publishText, setPublishText] = useState('');
  const [publishMediaUrl, setPublishMediaUrl] = useState('');
  const [bestTimes, setBestTimes] = useState(null);
  const [bestTimesLoading, setBestTimesLoading] = useState(false);
  const [bestTimesPlatform, setBestTimesPlatform] = useState('');

  // Analytics
  const [analyticsData, setAnalyticsData] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState({});
  const [analyticsError, setAnalyticsError] = useState({});

  // Repurpose
  const [repurposeContent, setRepurposeContent] = useState('');
  const [repurposeType, setRepurposeType] = useState('Blog Post');
  const [repurposeTargets, setRepurposeTargets] = useState(['instagram', 'twitter', 'linkedin']);
  const [repurposeGenerating, setRepurposeGenerating] = useState(false);
  const [repurposeStream, setRepurposeStream] = useState('');
  const [repurposeResult, setRepurposeResult] = useState('');

  // History
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const [acctRes, provRes] = await Promise.all([
        fetch(`${API_BASE}/api/social/accounts`),
        fetch(`${API_BASE}/api/integrations/providers`),
      ]);
      const acctData = await acctRes.json();
      const provData = await provRes.json();
      if (acctData.success) setConnectedAccounts(acctData.data);
      if (provData.success) setAllProviders(provData.data);
    } catch (e) { console.error('Fetch accounts error:', e); }
    finally { setLoading(false); }
  }, []);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await fetchJSON('/api/social/posts');
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Fetch posts error:', e); }
    finally { setPostsLoading(false); }
  }, []);

  const deletePost = async (id) => {
    try {
      await deleteJSON(`/api/social/posts/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error('Delete post error:', e); }
  };

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { if (tab === 'history') fetchPosts(); }, [tab, fetchPosts]);

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
  const getProviderStatus = (providerId) => allProviders.find(p => p.id === providerId)?.status === 'connected';
  const socialConnected = SOCIAL_PLATFORMS.filter(p => getProviderStatus(p.provider));
  const panelCls = dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm';

  const connectAccount = async (platform) => {
    const providerId = platform.provider;
    setConnectError(null);
    const provConfig = getProviderConfig(providerId);
    if (provConfig && !provConfig.configured) {
      setConnectError({ providerId, message: `${platform.name} requires API credentials. Add ${providerId.toUpperCase()}_CLIENT_ID and ${providerId.toUpperCase()}_CLIENT_SECRET to your .env file.` });
      return;
    }
    setConnectingId(providerId);
    try {
      const res = await fetch(`/api/integrations/oauth/authorize/${providerId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const popup = window.open(data.authUrl, 'oauth-connect', 'width=600,height=700,scrollbars=yes');
      const poll = setInterval(() => {
        if (popup?.closed) { clearInterval(poll); setConnectingId(null); fetchAccounts(); }
      }, 1000);
    } catch (err) {
      setConnectError({ providerId, message: err.message });
      setConnectingId(null);
    }
  };

  const disconnectAccount = async (providerId) => {
    setDisconnectingId(providerId);
    try {
      await fetch(`/api/integrations/connections/${providerId}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (err) { console.error('Disconnect error:', err); }
    finally { setDisconnectingId(null); }
  };

  const syncAccount = async (providerId) => {
    setSyncingId(providerId);
    try {
      await postJSON(`/api/social/accounts/${providerId}/sync`, {});
      fetchAccounts();
    } catch (e) { console.error('Sync error:', e); }
    finally { setSyncingId(null); }
  };

  const sseStream = async (url, body, onChunk, onResult) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
          if (data.type === 'chunk') { fullText += data.text; onChunk(fullText); }
          else if (data.type === 'result') onResult(data.data, fullText);
          else if (data.type === 'error') throw new Error(data.error);
        } catch {}
      }
    }
    return fullText;
  };

  const generate = async () => {
    if (!prompt.trim() || !activeType) return;
    setGenerating(true); setResult(''); setStreamText(''); setGenError(null);
    setCrossResult(''); setCrossStream(''); setShowPreview(false);
    try {
      const fullPrompt = `[Platform: ${activeType}] [Tone: ${tone}] [Length: ${postLength}] [Hashtags: ${includeHashtags ? 'Yes' : 'No'}] [Emojis: ${includeEmojis ? 'Yes' : 'No'}]\n\n${prompt}`;
      await sseStream(
        '/api/social/generate',
        { platform: activeType, prompt: fullPrompt, tone, includeHashtags, includeEmojis, postLength },
        (text) => setStreamText(text),
        async (data, fullText) => {
          const finalText = data?.content || fullText;
          setResult(finalText);
          try {
            await fetch(`${API_BASE}/api/social/posts`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ platform: activeType, post_type: 'feed', caption: finalText, status: 'draft' }),
            });
          } catch {}
        }
      );
      if (!result && streamText) setResult(streamText);
    } catch (e) {
      setGenError(e.message || 'Generation failed. Please try again.');
    } finally { setGenerating(false); }
  };

  const generateCrossPlatform = async () => {
    if (!prompt.trim()) return;
    setCrossGenerating(true); setCrossResult(''); setCrossStream('');
    try {
      const connectedIds = socialConnected.map(p => p.id);
      const platforms = connectedIds.length > 0 ? connectedIds : ['instagram', 'twitter', 'linkedin', 'tiktok', 'facebook'];
      await sseStream(
        '/api/social/cross-platform',
        { brief: prompt, platforms, tone },
        (text) => setCrossStream(text),
        (data, fullText) => setCrossResult(data?.content || fullText)
      );
      if (!crossResult && crossStream) setCrossResult(crossStream);
    } catch (e) { console.error('Cross-platform error:', e); }
    finally { setCrossGenerating(false); }
  };

  const repurpose = async () => {
    if (!repurposeContent.trim()) return;
    setRepurposeGenerating(true); setRepurposeResult(''); setRepurposeStream('');
    try {
      await sseStream(
        '/api/social/repurpose',
        { content: repurposeContent, contentType: repurposeType.toLowerCase(), targetPlatforms: repurposeTargets },
        (text) => setRepurposeStream(text),
        (data, fullText) => setRepurposeResult(data?.content || fullText)
      );
      if (!repurposeResult && repurposeStream) setRepurposeResult(repurposeStream);
    } catch (e) { console.error('Repurpose error:', e); }
    finally { setRepurposeGenerating(false); }
  };

  const publishToProvider = async (platform) => {
    const text = publishText || result || streamText;
    if (!text.trim()) return;
    setPublishing(true); setPublishStatus(null); setPublishTarget(platform.provider);
    try {
      const res = await fetch(`${API_BASE}/api/social/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: platform.provider,
          platformId: platform.id,
          text, caption: text,
          imageUrl: publishMediaUrl || undefined,
          mediaUrl: publishMediaUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus({ type: 'success', msg: `Published to ${platform.name}!` });
      } else {
        setPublishStatus({ type: 'error', msg: data.error || 'Failed to publish' });
      }
    } catch (e) {
      setPublishStatus({ type: 'error', msg: e.message });
    } finally { setPublishing(false); setPublishTarget(null); }
  };

  const loadBestTimes = async (platformId) => {
    setBestTimesLoading(true); setBestTimes(null); setBestTimesPlatform(platformId);
    try {
      const data = await postJSON('/api/social/best-times', { platform: platformId, industry: '' });
      setBestTimes(data);
    } catch (e) { console.error('Best times error:', e); }
    finally { setBestTimesLoading(false); }
  };

  const loadAnalytics = async (providerId) => {
    setAnalyticsLoading(prev => ({ ...prev, [providerId]: true }));
    setAnalyticsError(prev => ({ ...prev, [providerId]: null }));
    try {
      const data = await fetchJSON(`/api/social/analytics/${providerId}`);
      setAnalyticsData(prev => ({ ...prev, [providerId]: data.data || data }));
    } catch (e) {
      setAnalyticsError(prev => ({ ...prev, [providerId]: e.message }));
    } finally {
      setAnalyticsLoading(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text || result || streamText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <ModuleWrapper moduleId="social">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>SOCIAL MEDIA ENGINE</p>
        <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Social Media</h1>
        <p className={`text-base ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Create, repurpose, publish, and analyze your social content</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {[
          { id: 'create', label: 'Create Content' },
          { id: 'repurpose', label: 'Repurpose' },
          { id: 'accounts', label: `Accounts ${socialConnected.length > 0 ? `(${socialConnected.length})` : ''}` },
          { id: 'publish', label: 'Publish' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'history', label: `Drafts${posts.length > 0 ? ` (${posts.length})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? `${dark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' : 'bg-blue-50 text-blue-700 border border-blue-200'}`
                : `${dark ? 'text-gray-500 hover:text-gray-300 border border-transparent' : 'text-gray-500 hover:text-gray-700 border border-transparent'}`
            }`}>
            {t.label}
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

          {connectError && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${dark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${dark ? 'text-red-300' : 'text-red-700'}`}>Connection Error</p>
                <p className={`text-xs mt-0.5 ${dark ? 'text-red-400/80' : 'text-red-600'}`}>{connectError.message}</p>
              </div>
              <button onClick={() => setConnectError(null)} className="text-xs text-red-400/60 hover:text-red-400 font-semibold">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {SOCIAL_PLATFORMS.map(platform => {
              const isConnected = getProviderStatus(platform.provider);
              const acct = connectedAccounts.find(a => a.providerId === platform.provider);
              const isConnecting = connectingId === platform.provider;
              const isDisconnecting = disconnectingId === platform.provider;
              const isSyncing = syncingId === platform.provider;
              const provConfig = getProviderConfig(platform.provider);
              const isConfigured = provConfig?.configured !== false;
              return (
                <div key={platform.id} className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}25` }}>
                      <svg className="w-5 h-5" style={{ color: platform.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={platform.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{platform.name}</p>
                      {isConnected && acct ? (
                        <p className={`text-xs truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{acct.accountName || acct.username || 'Connected'}</p>
                      ) : !isConfigured ? (
                        <p className="text-xs text-amber-500">API keys not configured</p>
                      ) : (
                        <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Not connected</p>
                      )}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : !isConfigured ? 'bg-amber-400' : dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                  </div>

                  {isConnected ? (
                    <div className="space-y-2">
                      {acct?.followers > 0 && (
                        <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${dark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Followers</span>
                          <span className={`font-bold font-mono ${dark ? 'text-white' : 'text-gray-900'}`}>{Number(acct.followers).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => syncAccount(platform.provider)} disabled={isSyncing}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${dark ? 'text-gray-500 hover:text-gray-300 bg-white/[0.03] hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100'} disabled:opacity-40`}>
                          {isSyncing ? 'Syncing...' : 'Sync'}
                        </button>
                        <button onClick={() => disconnectAccount(platform.provider)} disabled={isDisconnecting}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${dark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'} disabled:opacity-40`}>
                          {isDisconnecting ? '...' : 'Disconnect'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => connectAccount(platform)} disabled={isConnecting}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: `${platform.color}15`, color: platform.color, border: `1px solid ${platform.color}25` }}>
                      {isConnecting ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />Connecting...
                        </span>
                      ) : !isConfigured ? 'Setup Required' : 'Connect →'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ REPURPOSE TAB ═══ */}
      {tab === 'repurpose' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <p className="hud-label text-[11px]">CONTENT REPURPOSER</p>
            <div className="flex-1 hud-line" />
            <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Paste any content → get platform-native social posts</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Content type */}
              <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">CONTENT TYPE</p>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map(ct => (
                    <button key={ct} onClick={() => setRepurposeType(ct)}
                      className={`chip text-[10px] ${repurposeType === ct ? 'active' : ''}`}
                      style={repurposeType === ct ? { background: `${MODULE_COLOR}25`, borderColor: `${MODULE_COLOR}50`, color: MODULE_COLOR } : {}}>
                      {ct}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content input */}
              <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">PASTE YOUR {repurposeType.toUpperCase()}</p>
                <textarea
                  value={repurposeContent}
                  onChange={(e) => setRepurposeContent(e.target.value)}
                  rows={10}
                  placeholder={`Paste your ${repurposeType.toLowerCase()} here...\n\nTip: The more content you provide, the better the repurposed posts will be.`}
                  className="w-full input-field rounded-xl px-4 py-3 text-sm resize-none" />
                <p className={`text-[10px] mt-1.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{repurposeContent.length.toLocaleString()} characters</p>
              </div>

              <button onClick={repurpose} disabled={repurposeGenerating || !repurposeContent.trim()}
                className="btn-accent w-full py-3 rounded-lg font-bold text-sm"
                style={{ background: repurposeGenerating ? (dark ? '#1e1e2e' : '#e5e7eb') : MODULE_COLOR, boxShadow: repurposeGenerating ? 'none' : `0 4px 20px -4px ${MODULE_COLOR}66` }}>
                {repurposeGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />REPURPOSING...
                  </span>
                ) : `REPURPOSE FOR ${repurposeTargets.length} PLATFORM${repurposeTargets.length > 1 ? 'S' : ''} →`}
              </button>
            </div>

            {/* Target platforms selector */}
            <div>
              <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">TARGET PLATFORMS</p>
                <div className="space-y-2">
                  {SOCIAL_PLATFORMS.filter(p => ['instagram', 'twitter', 'linkedin', 'tiktok', 'facebook'].includes(p.id)).map(p => {
                    const selected = repurposeTargets.includes(p.id);
                    return (
                      <button key={p.id}
                        onClick={() => setRepurposeTargets(prev =>
                          prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                        )}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs transition-all ${
                          selected
                            ? 'border-current'
                            : `${dark ? 'border-indigo-500/8 text-gray-500 hover:text-gray-300' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`
                        }`}
                        style={selected ? { color: p.color, background: `${p.color}12`, borderColor: `${p.color}30` } : {}}>
                        <svg className="w-4 h-4 flex-shrink-0" style={{ color: p.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                        </svg>
                        <span className="font-semibold">{p.name}</span>
                        {selected && <span className="ml-auto text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Streaming repurpose */}
          {(repurposeGenerating || repurposeStream) && !repurposeResult && (
            <div className={`${panelCls} rounded-2xl p-4 sm:p-7 animate-fade-up`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>REPURPOSING CONTENT...</span>
              </div>
              <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 max-h-[50vh] overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {repurposeStream}<span className="inline-block w-[2px] h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />
              </div>
            </div>
          )}

          {repurposeResult && (
            <div className={`${panelCls} rounded-2xl p-4 sm:p-7 animate-fade-up`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="hud-label text-[11px] text-emerald-400">REPURPOSED</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(repurposeResult)} className="chip text-[10px]">{copied ? 'Copied!' : 'Copy All'}</button>
                  <button onClick={repurpose} className="chip text-[10px]">Regenerate</button>
                </div>
              </div>
              <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 max-h-[60vh] overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                {repurposeResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PUBLISH TAB ═══ */}
      {tab === 'publish' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Compose */}
          <div className={`${panelCls} rounded-2xl p-4 sm:p-7`}>
            <p className="hud-label text-[11px] mb-3">COMPOSE POST</p>
            <textarea value={publishText} onChange={(e) => setPublishText(e.target.value)} rows={5}
              placeholder="Write your post here, or go to Create tab to generate content first..."
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-sm resize-none" />
            {(result || streamText) && !publishText && (
              <button onClick={() => setPublishText(result || streamText)}
                className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg ${dark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                Use generated content →
              </button>
            )}
            {/* Media URL for Instagram */}
            <div className="mt-3">
              <input type="url" value={publishMediaUrl} onChange={(e) => setPublishMediaUrl(e.target.value)}
                placeholder="Media URL (required for Instagram — paste an image/video URL)"
                className="w-full input-field rounded-xl px-4 py-2.5 text-sm" />
              <p className={`text-[10px] mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Instagram requires a media URL. Optional for other platforms.</p>
            </div>
          </div>

          {publishStatus && (
            <div className={`${panelCls} rounded-2xl p-4 ${publishStatus.type === 'success' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
              <p className={`text-sm font-semibold ${publishStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{publishStatus.msg}</p>
            </div>
          )}

          {/* Best times */}
          <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>AI BEST TIMES TO POST</p>
                <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Get AI-recommended optimal posting times</p>
              </div>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {SOCIAL_PLATFORMS.filter(p => !['youtube', 'pinterest'].includes(p.id)).map(p => (
                <button key={p.id} onClick={() => loadBestTimes(p.id)}
                  className={`chip text-[10px] ${bestTimesPlatform === p.id ? 'active' : ''}`}
                  style={bestTimesPlatform === p.id ? { color: p.color, borderColor: `${p.color}40`, background: `${p.color}12` } : {}}>
                  {p.name}
                </button>
              ))}
            </div>
            {bestTimesLoading && (
              <div className="flex items-center gap-2 py-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>ANALYZING OPTIMAL TIMES...</span>
              </div>
            )}
            {bestTimes && !bestTimesLoading && (
              <div className="animate-fade-in space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {bestTimes.best_times?.map((t, i) => {
                    const colors = ['#4ade80', '#f59e0b', '#3b82f6'];
                    return (
                      <div key={i} className={`rounded-xl p-3 ${dark ? 'bg-white/[0.03] border border-gray-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${colors[i]}20`, color: colors[i] }}>#{i + 1}</span>
                          <span className="text-[10px] font-bold" style={{ color: colors[i] }}>Score: {t.score}</span>
                        </div>
                        <p className={`text-xs font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{t.day}</p>
                        <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{t.time}</p>
                        <p className={`text-[10px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{t.reason}</p>
                      </div>
                    );
                  })}
                </div>
                {bestTimes.avoid?.length > 0 && (
                  <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                    <span className="text-red-400">Avoid:</span> {bestTimes.avoid.join(', ')}
                  </p>
                )}
                {bestTimes.tip && (
                  <p className={`text-xs p-3 rounded-lg ${dark ? 'bg-blue-500/8 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                    💡 {bestTimes.tip}
                  </p>
                )}
              </div>
            )}
            {!bestTimes && !bestTimesLoading && (
              <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Select a platform above to see AI-predicted best posting times.</p>
            )}
          </div>

          {/* Publish targets */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="hud-label text-[11px]">PUBLISH TO</p>
              <div className="flex-1 hud-line" />
            </div>
            {socialConnected.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {socialConnected.map(platform => (
                  <button key={platform.id} onClick={() => publishToProvider(platform)}
                    disabled={publishing || !publishText.trim()}
                    className={`${panelCls} rounded-2xl p-4 text-center transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100`}>
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}25` }}>
                      <svg className="w-5 h-5" style={{ color: platform.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={platform.icon} />
                      </svg>
                    </div>
                    <p className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{platform.name}</p>
                    <p className={`text-[10px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {publishing && publishTarget === platform.provider ? 'Publishing...' : 'Publish'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className={`${panelCls} rounded-2xl p-8 text-center`}>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Connect social accounts in the Accounts tab first.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === 'analytics' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <p className="hud-label text-[11px]">ACCOUNT ANALYTICS</p>
            <div className="flex-1 hud-line" />
            <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Live data from connected platforms</p>
          </div>

          {socialConnected.length === 0 ? (
            <div className={`${panelCls} rounded-2xl p-10 text-center`}>
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Connect social accounts in the <button onClick={() => setTab('accounts')} className="text-blue-400 underline">Accounts tab</button> to view analytics.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {socialConnected.map(platform => {
                const acct = connectedAccounts.find(a => a.providerId === platform.provider);
                const analytics = analyticsData[platform.provider];
                const isLoading = analyticsLoading[platform.provider];
                const error = analyticsError[platform.provider];
                return (
                  <div key={platform.id} className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}25` }}>
                          <svg className="w-5 h-5" style={{ color: platform.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={platform.icon} />
                          </svg>
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{platform.name}</p>
                          {acct?.followers > 0 && (
                            <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{Number(acct.followers).toLocaleString()} followers</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => syncAccount(platform.provider)}
                          className="chip text-[10px]"
                          disabled={syncingId === platform.provider}>
                          {syncingId === platform.provider ? 'Syncing...' : 'Sync'}
                        </button>
                        <button onClick={() => loadAnalytics(platform.provider)}
                          className="chip text-[10px]"
                          style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}
                          disabled={isLoading}>
                          {isLoading ? 'Loading...' : analytics ? 'Refresh' : 'Load Analytics'}
                        </button>
                      </div>
                    </div>

                    {/* Cached stats row */}
                    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-3 rounded-xl ${dark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${dark ? 'text-white' : 'text-gray-900'}`}>{acct?.followers ? Number(acct.followers).toLocaleString() : '—'}</p>
                        <p className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Followers</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${dark ? 'text-white' : 'text-gray-900'}`}>{posts.filter(p => p.platform === platform.id).length}</p>
                        <p className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Posts Saved</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${dark ? 'text-white' : 'text-gray-900'}`}>{posts.filter(p => p.platform === platform.id && p.status === 'published').length}</p>
                        <p className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Published</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold font-mono ${dark ? 'text-white' : 'text-gray-900'}`}>{acct?.connectedAt ? new Date(acct.connectedAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : '—'}</p>
                        <p className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Connected</p>
                      </div>
                    </div>

                    {isLoading && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: platform.color }} />
                        <span className="hud-label text-[11px]" style={{ color: platform.color }}>LOADING LIVE ANALYTICS...</span>
                      </div>
                    )}

                    {error && (
                      <div className={`rounded-lg p-3 text-xs ${dark ? 'bg-red-500/8 text-red-400' : 'bg-red-50 text-red-600'}`}>
                        ⚠ Analytics unavailable: {error}. This usually means the connected account needs additional API permissions.
                      </div>
                    )}

                    {analytics && !isLoading && (
                      <div className="animate-fade-in">
                        <p className="hud-label text-[11px] mb-2">LIVE DATA</p>
                        <div className={`${dark ? 'bg-black/30' : 'bg-gray-50'} rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {JSON.stringify(analytics, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <p className="hud-label text-[11px]">SAVED POSTS</p>
            <div className="flex-1 hud-line" />
            <button onClick={fetchPosts} className={`text-xs font-semibold px-3 py-1 rounded-lg ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>Refresh</button>
          </div>
          {postsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className={`${panelCls} rounded-2xl p-5 h-16 animate-pulse`} />)}</div>
          ) : posts.length === 0 ? (
            <div className={`${panelCls} rounded-2xl p-12 text-center`}>
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No saved posts yet. Generated posts are automatically saved here.</p>
            </div>
          ) : (
            <div className={`${panelCls} rounded-2xl overflow-hidden`}>
              <div className="divide-y divide-indigo-500/[0.04]">
                {posts.map(post => {
                  const platformInfo = SOCIAL_PLATFORMS.find(p => p.id === post.platform);
                  const statusColor = { draft: '#6b7280', published: '#22c55e', scheduled: '#3b82f6' }[post.status] || '#6b7280';
                  return (
                    <div key={post.id} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {platformInfo && (
                            <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: platformInfo.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={platformInfo.icon} />
                            </svg>
                          )}
                          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{post.platform}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>
                            {post.status}
                          </span>
                        </div>
                        <p className={`text-sm line-clamp-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{post.caption || '(no caption)'}</p>
                        <p className={`text-[10px] mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</p>
                      </div>
                      <button onClick={() => deletePost(post.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-red-500/10">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CREATE TAB — Platform Selection ═══ */}
      {tab === 'create' && !activeType && (
        <div className="animate-fade-in">
          {socialConnected.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="hud-label text-[11px]">CONNECTED</p>
                <div className="flex gap-1.5">
                  {socialConnected.map(p => (
                    <div key={p.id} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${p.color}20`, border: `1px solid ${p.color}30` }}>
                      <svg className="w-3.5 h-3.5" style={{ color: p.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
            {SOCIAL_PLATFORMS.filter(p => !['youtube', 'pinterest'].includes(p.id)).map(type => (
              <button key={type.id} onClick={() => setActiveType(type.id)}
                className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} rounded-2xl p-4 sm:p-7 text-center group transition-all`}>
                <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${type.color}15`, border: `1px solid ${type.color}20` }}>
                  <svg className="w-6 h-6" style={{ color: type.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                  </svg>
                </div>
                <p className={`text-sm font-bold ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{type.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getProviderStatus(type.provider) ? 'bg-emerald-400' : dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                  <p className={`text-xs ${getProviderStatus(type.provider) ? 'text-emerald-400/70' : dark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {getProviderStatus(type.provider) ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Templates */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
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
                    <p className={`text-sm font-semibold ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700'}`}>{t.name}</p>
                    <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CREATE TAB — Generator ═══ */}
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
              <button onClick={() => { setActiveType(null); setResult(''); setStreamText(''); setPrompt(''); setCrossResult(''); setCrossStream(''); }}
                className={`p-2 rounded-md border transition-all ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div className="flex-1">
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

                {/* Buttons row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={generate} disabled={generating || !prompt.trim()}
                    className="btn-accent flex-1 py-3 rounded-lg font-bold text-sm"
                    style={{ background: generating ? (dark ? '#1e1e2e' : '#e5e7eb') : (currentType?.color || MODULE_COLOR), boxShadow: generating ? 'none' : `0 4px 20px -4px ${currentType?.color || MODULE_COLOR}66` }}>
                    {generating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...
                      </span>
                    ) : `GENERATE ${currentType?.name?.toUpperCase()} POST`}
                  </button>
                  <button onClick={generateCrossPlatform} disabled={crossGenerating || !prompt.trim()}
                    className="py-3 px-4 rounded-lg font-bold text-xs transition-all"
                    style={{
                      background: crossGenerating ? (dark ? '#1e1e2e' : '#e5e7eb') : 'transparent',
                      border: `1px solid ${crossGenerating ? 'transparent' : `${MODULE_COLOR}40`}`,
                      color: crossGenerating ? (dark ? '#555' : '#aaa') : MODULE_COLOR,
                    }}>
                    {crossGenerating ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />ALL PLATFORMS...
                      </span>
                    ) : 'WRITE FOR ALL PLATFORMS →'}
                  </button>
                </div>
              </div>

              {/* Right: Settings */}
              <div className="space-y-4 sm:space-y-6">
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

                <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
                  <p className="hud-label text-[11px] mb-3">OPTIONS</p>
                  <div className="space-y-2.5">
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
                        <span className="font-semibold text-xs">{opt.label}</span>
                        <div className={`w-8 h-4 rounded-full flex items-center ${opt.value ? 'justify-end' : 'justify-start'}`}
                          style={{ background: opt.value ? `${currentType?.color || MODULE_COLOR}40` : dark ? '#333' : '#d1d5db' }}>
                          <div className="w-3 h-3 rounded-full mx-0.5" style={{ background: opt.value ? (currentType?.color || MODULE_COLOR) : dark ? '#666' : '#9ca3af' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {(streamText || result) && (
                  <div className={`${panelCls} rounded-2xl p-4 sm:p-6 animate-fade-up`}>
                    <p className="hud-label text-[11px] mb-3">OUTPUT STATS</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Characters</span>
                        <span className={`font-mono font-bold ${charCount > maxChars ? 'text-red-400' : dark ? 'text-white' : 'text-gray-900'}`}>{charCount}/{maxChars}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: dark ? '#1a1a2e' : '#e5e7eb' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (charCount / maxChars) * 100)}%`, background: charCount > maxChars ? '#ef4444' : (currentType?.color || MODULE_COLOR) }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Words</span>
                        <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{(result || streamText).split(/\s+/).filter(Boolean).length}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gen error */}
            {genError && (
              <div className={`${panelCls} rounded-xl p-4 mt-4`} style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                <div className="flex items-center gap-2">
                  <p className={`text-xs flex-1 ${dark ? 'text-red-400' : 'text-red-600'}`}>{genError}</p>
                  <button onClick={() => setGenError(null)} className="text-[10px] text-red-400/60 hover:text-red-400">Dismiss</button>
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
                    <span className="hud-label text-[11px] text-emerald-400">COMPLETE</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyToClipboard(result)} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={() => { const b = new Blob([result], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${activeType}-post.txt`; a.click(); URL.revokeObjectURL(u); }} className="chip text-[10px]">Export TXT</button>
                    <button onClick={generate} className="chip text-[10px]">Regenerate</button>
                    <button onClick={() => setShowPreview(!showPreview)} className="chip text-[10px]" style={showPreview ? { color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` } : {}}>
                      {showPreview ? 'Hide Preview' : 'Preview'}
                    </button>
                    {isConnected && (
                      <button onClick={() => { setPublishText(result); setTab('publish'); }}
                        className="chip text-[10px] font-bold" style={{ background: `${currentType?.color}20`, borderColor: `${currentType?.color}40`, color: currentType?.color }}>
                        Publish →
                      </button>
                    )}
                  </div>
                </div>

                <div className={showPreview ? 'flex gap-4 flex-col lg:flex-row' : ''}>
                  <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-7 max-h-[60vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'} ${showPreview ? 'flex-1' : ''}`}>
                    {result}
                  </div>
                  {showPreview && (
                    <div className="flex-shrink-0 animate-fade-in">
                      <p className="hud-label text-[11px] mb-3">PREVIEW</p>
                      <PostPreview platform={activeType} content={result} dark={dark} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cross-Platform result */}
            {(crossGenerating || crossStream || crossResult) && (
              <div className={`${panelCls} rounded-2xl p-4 sm:p-7 mt-4 animate-fade-up`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${crossResult ? 'bg-emerald-400' : 'animate-pulse'}`} style={{ background: crossResult ? '#4ade80' : (currentType?.color || MODULE_COLOR) }} />
                    <span className="hud-label text-[11px]" style={{ color: crossResult ? '#4ade80' : (currentType?.color || MODULE_COLOR) }}>
                      {crossResult ? 'ALL PLATFORMS' : 'WRITING FOR ALL PLATFORMS...'}
                    </span>
                  </div>
                  {crossResult && <button onClick={() => copyToClipboard(crossResult)} className="chip text-[10px]">{copied ? 'Copied!' : 'Copy All'}</button>}
                </div>
                <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-6 max-h-[60vh] overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {crossResult || crossStream}
                  {!crossResult && <span className="inline-block w-[2px] h-4 ml-0.5 animate-pulse" style={{ background: currentType?.color || MODULE_COLOR }} />}
                </div>
              </div>
            )}

            {/* Caption Variations */}
            {result && (
              <div className={`${panelCls} rounded-2xl p-4 sm:p-6 mt-4 animate-fade-up`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="hud-label text-[11px]">CAPTION VARIATIONS</p>
                  <button className="chip text-[10px]" disabled={varLoading}
                    style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}
                    onClick={async () => {
                      setVarLoading(true);
                      try {
                        const res = await postJSON('/api/social/generate-variations', { caption: result, platform: activeType });
                        setCaptionVariations(res.variations);
                      } catch {}
                      setVarLoading(false);
                    }}>
                    {varLoading ? 'Generating...' : captionVariations ? 'Regenerate' : 'Get 3 Variations'}
                  </button>
                </div>
                {captionVariations && captionVariations.map((v, i) => (
                  <div key={i} className={`rounded-xl border p-3 mb-2 ${dark ? 'border-indigo-500/10 bg-white/[0.01]' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="chip text-[10px]">{v.tone}</span>
                      <div className="flex gap-1.5">
                        <button className="chip text-[10px] px-2" onClick={() => setResult(v.caption)}>Use</button>
                        <button className="chip text-[10px] px-2" onClick={() => navigator.clipboard.writeText(v.caption)}>Copy</button>
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{v.caption}</p>
                    <p className={`text-[10px] mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{v.why}</p>
                  </div>
                ))}
                {!captionVariations && !varLoading && (
                  <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Get 3 variations in different tones — Professional, Casual & Fun, and Viral Hook.</p>
                )}
              </div>
            )}

            {/* Hashtag Intelligence */}
            <div className={`${panelCls} rounded-2xl p-4 sm:p-6 mt-4 animate-fade-up`}>
              <p className="hud-label text-[11px] mb-3">HASHTAG INTELLIGENCE</p>
              <div className="flex gap-2 mb-3">
                <input className="input-field rounded-xl px-4 py-2.5 flex-1 text-sm" placeholder="Topic (e.g. sustainable fashion, SaaS growth)"
                  value={hashtagTopic} onChange={e => setHashtagTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && hashtagTopic && !hashLoading && (async () => {
                    setHashLoading(true);
                    try { const res = await postJSON('/api/social/hashtag-intelligence', { topic: hashtagTopic, platform: activeType }); setHashtagData(res); }
                    catch {} setHashLoading(false);
                  })()}
                />
                <button className="chip text-[10px] whitespace-nowrap" disabled={!hashtagTopic || hashLoading}
                  style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}
                  onClick={async () => {
                    setHashLoading(true);
                    try { const res = await postJSON('/api/social/hashtag-intelligence', { topic: hashtagTopic, platform: activeType }); setHashtagData(res); }
                    catch {} setHashLoading(false);
                  }}>
                  {hashLoading ? 'Analyzing...' : 'Find Hashtags'}
                </button>
              </div>
              {hashtagData && (
                <div className="space-y-3">
                  {[['🔥 Mega', hashtagData.mega], ['⚡ High', hashtagData.high], ['🎯 Niche', hashtagData.niche]].map(([label, tags]) => (
                    tags?.length > 0 && (
                      <div key={label}>
                        <p className={`text-[10px] font-bold mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((t, i) => (
                            <button key={i} onClick={() => navigator.clipboard.writeText(t.tag)}
                              title={`${t.reach} — click to copy`}
                              className={`chip text-[10px] ${dark ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                              {t.tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                  {hashtagData.strategy && <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>💡 {hashtagData.strategy}</p>}
                </div>
              )}
              {!hashtagData && !hashLoading && (
                <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Enter a topic to get tiered hashtag recommendations (mega, high-volume, and niche).</p>
              )}
            </div>
          </div>
        );
      })()}
      </ModuleWrapper>
    </div>
  );
}

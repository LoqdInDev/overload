import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';

const MODULE_COLOR = '#10b981';

const PLATFORMS = [
  {
    id: 'google', name: 'Google Ads', color: '#4285f4',
    sub: 'Search, Display, YouTube, Performance Max',
    icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  },
  {
    id: 'meta', name: 'Meta Ads', color: '#1877f2',
    sub: 'Facebook, Instagram, Messenger, Audience Network',
    icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  },
  {
    id: 'tiktok', name: 'TikTok Ads', color: '#fe2c55',
    sub: 'In-Feed, TopView, Spark Ads, Shop Ads',
    icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z',
  },
  {
    id: 'linkedin', name: 'LinkedIn Ads', color: '#0a66c2',
    sub: 'Sponsored Content, Lead Gen Forms, Conversation Ads',
    icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
  },
];

const OBJECTIVES = [
  { id: 'conversions', name: 'Conversions', desc: 'Drive purchases & sign-ups', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
  { id: 'traffic', name: 'Traffic', desc: 'Drive website visitors', icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-6.364-6.364L4.5 8.257m8.386-.822l4.5 4.5' },
  { id: 'awareness', name: 'Brand Awareness', desc: 'Maximize reach & impressions', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'leads', name: 'Lead Generation', desc: 'Collect contacts & forms', icon: 'M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z' },
];

const AUDIENCE_PRESETS = [
  { id: 'broad', name: 'Broad Reach', desc: '18-65, all genders, general interests' },
  { id: 'millennials', name: 'Millennials', desc: '25-40, tech-savvy, urban professionals' },
  { id: 'genz', name: 'Gen Z', desc: '18-25, social media native, trend-focused' },
  { id: 'parents', name: 'Parents', desc: '28-45, family-oriented, suburban' },
  { id: 'luxury', name: 'High Income', desc: 'Affluent, luxury shoppers, premium brands' },
  { id: 'smb', name: 'Small Business', desc: 'Business owners, entrepreneurs, B2B' },
];

const BUDGET_PRESETS = [
  { id: '25', label: '$25/day', desc: 'Testing' },
  { id: '50', label: '$50/day', desc: 'Starter' },
  { id: '100', label: '$100/day', desc: 'Growth' },
  { id: '250', label: '$250/day', desc: 'Scale' },
];

const CAMPAIGN_TEMPLATES = {
  google: [
    { name: 'Search Campaign', prompt: 'High-intent search keywords targeting buyers ready to purchase' },
    { name: 'Performance Max', prompt: 'AI-optimized cross-channel campaign for maximum conversions' },
    { name: 'Display Retargeting', prompt: 'Retarget website visitors with display ads across Google network' },
    { name: 'YouTube Pre-Roll', prompt: 'Video ads before YouTube content targeting relevant audiences' },
  ],
  meta: [
    { name: 'Conversion Campaign', prompt: 'Optimized for website purchases with broad targeting and dynamic creatives' },
    { name: 'Lead Ads', prompt: 'In-platform lead forms for easy contact collection without leaving Facebook' },
    { name: 'Retargeting Funnel', prompt: 'Multi-stage retargeting from awareness to conversion with sequential messaging' },
    { name: 'Lookalike Expansion', prompt: 'Find new customers similar to your best existing customers' },
  ],
  tiktok: [
    { name: 'In-Feed Spark', prompt: 'Native-feeling in-feed ads that blend with organic TikTok content' },
    { name: 'TopView Launch', prompt: 'Premium top-of-feed placement for maximum brand impact on launch day' },
    { name: 'Hashtag Challenge', prompt: 'Branded hashtag challenge encouraging user participation and virality' },
    { name: 'Shop Ads', prompt: 'Shoppable product ads that link directly to TikTok Shop checkout' },
  ],
  linkedin: [
    { name: 'Sponsored Content', prompt: 'Native content in LinkedIn feed targeting professionals by job title and industry' },
    { name: 'Lead Gen Form', prompt: 'In-platform lead forms pre-filled with LinkedIn profile data for maximum conversion' },
    { name: 'Conversation Ad', prompt: 'Interactive message-based ad with multiple CTA options for personalized journeys' },
    { name: 'Thought Leader', prompt: 'Promote employee or executive content to expand organic reach and build brand authority' },
  ],
};

// Platform-specific realistic reach estimates
const PLATFORM_REACH = {
  google:   { impMin: 200, impMax: 600,  clkMin: 3,   clkMax: 8,   cpcMin: 1.20, cpcMax: 4.00 },
  meta:     { impMin: 150, impMax: 500,  clkMin: 2,   clkMax: 6,   cpcMin: 0.50, cpcMax: 1.80 },
  tiktok:   { impMin: 400, impMax: 900,  clkMin: 1,   clkMax: 4,   cpcMin: 0.25, cpcMax: 0.80 },
  linkedin: { impMin: 20,  impMax: 60,   clkMin: 0.3, clkMax: 1.0, cpcMin: 6.00, cpcMax: 14.00 },
};

const STATUS_COLOR = { draft: '#6b7280', active: '#22c55e', paused: '#f59e0b' };
const PLATFORM_COLOR = { google: '#4285f4', meta: '#1877f2', tiktok: '#fe2c55', linkedin: '#0a66c2' };

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Ad Preview ───────────────────────────────────────
function AdPreview({ platform, adContent }) {
  if (!adContent) return null;
  const h1 = adContent.headlines?.[0] || 'Your Headline Here';
  const h2 = adContent.headlines?.[1] || 'Second Headline';
  const h3 = adContent.headlines?.[2] || 'Third Headline';
  const desc = adContent.descriptions?.[0] || 'Your description text appears here. Make it compelling and relevant.';
  const primary = adContent.primary_texts?.[0] || 'Your primary text goes here. Write something engaging.';
  const headline = adContent.headlines?.[0] || 'Headline';
  const cta = adContent.cta || 'Learn More';

  if (platform === 'google') return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', maxWidth: 580 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ background: '#fff', border: '1px solid #5f6368', color: '#202124', fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>Ad</span>
        <span style={{ color: '#0d652d', fontSize: 13 }}>www.yourwebsite.com › page</span>
      </div>
      <div style={{ color: '#1a0dab', fontSize: 18, lineHeight: 1.3, marginBottom: 4 }}>
        {h1} | {h2} | {h3}
      </div>
      <div style={{ color: '#4d5156', fontSize: 14, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );

  if (platform === 'meta') return (
    <div style={{ background: '#fff', borderRadius: 8, maxWidth: 380, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#050505' }}>Your Brand</div>
          <div style={{ fontSize: 11, color: '#65676b' }}>Sponsored · 🌐</div>
        </div>
      </div>
      <div style={{ padding: '0 12px 8px', fontSize: 13, color: '#050505', lineHeight: 1.5 }}>
        {primary.substring(0, 125)}{primary.length > 125 ? '...' : ''}
      </div>
      <div style={{ background: '#e9ebee', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#8a8d91', fontSize: 12 }}>1200 × 628</span>
      </div>
      <div style={{ background: '#f0f2f5', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#050505', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline.substring(0, 40)}</div>
        <button style={{ background: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'default', color: '#050505', whiteSpace: 'nowrap', flexShrink: 0 }}>{cta}</button>
      </div>
    </div>
  );

  if (platform === 'tiktok') return (
    <div style={{ width: 175, height: 310, background: '#000', borderRadius: 12, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85))' }} />
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {['♥', '💬', '↗'].map((ic, i) => (
          <div key={i} style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>
            <div>{ic}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>{['12K', '834', '2.1K'][i]}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 12px' }}>
        <div style={{ color: 'white', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>@yourbrand</div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, marginBottom: 5, lineHeight: 1.4 }}>
          {primary.substring(0, 55)}{primary.length > 55 ? '...' : ''}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginBottom: 7 }}>♪ Trending Sound · Sponsored</div>
        <button style={{ background: '#fe2c55', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 10, fontWeight: 700, width: '100%', cursor: 'default' }}>{cta}</button>
      </div>
    </div>
  );

  if (platform === 'linkedin') return (
    <div style={{ background: '#fff', borderRadius: 8, maxWidth: 380, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: 4, background: '#e2e8f0', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>Your Company</div>
          <div style={{ fontSize: 11, color: '#777' }}>Sponsored</div>
        </div>
      </div>
      <div style={{ padding: '0 16px 10px', fontSize: 13, color: '#333', lineHeight: 1.5 }}>
        {primary.substring(0, 150)}{primary.length > 150 ? '...' : ''}
      </div>
      <div style={{ background: '#f3f2ef', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#888', fontSize: 12 }}>1200 × 627</span>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: '1px solid #e0e0e0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#000', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline.substring(0, 50)}</div>
        <button style={{ background: 'transparent', border: '1px solid #0a66c2', color: '#0a66c2', padding: '5px 14px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'default', flexShrink: 0 }}>{cta}</button>
      </div>
    </div>
  );

  return null;
}

// ── Toast ────────────────────────────────────────────
function Toast({ message, type = 'error', onDismiss }) {
  const color = type === 'success' ? '#22c55e' : type === 'info' ? '#6366f1' : '#ef4444';
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: `${color}18`, border: `1px solid ${color}30`, color, borderRadius: 12, padding: '10px 16px', fontSize: 13, maxWidth: 340, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ color, opacity: 0.6, fontSize: 16, cursor: 'pointer', background: 'none', border: 'none' }}>&times;</button>
    </div>
  );
}

export default function AdsPage() {
  usePageTitle('Paid Advertising');
  const [activePlatform, setActivePlatform] = useState(null);
  const [tab, setTab] = useState('builder'); // 'builder' | 'history'
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState({ name: '', objective: 'conversions', budget: '50', audience: '', template: '' });
  const [audiencePreset, setAudiencePreset] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Post-generation tools
  const [adScore, setAdScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [headlineVariations, setHeadlineVariations] = useState(null);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [adaptResults, setAdaptResults] = useState({});
  const [adaptLoading, setAdaptLoading] = useState({});
  const [utmUrl, setUtmUrl] = useState('');
  const [negKeywords, setNegKeywords] = useState(null);
  const [negKwLoading, setNegKwLoading] = useState(false);
  const [videoScript, setVideoScript] = useState(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptDuration, setScriptDuration] = useState('30');
  const [copied, setCopied] = useState(false);

  // History
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const showToast = (message, type = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchJSON('/api/ads/campaigns');
      setSavedCampaigns(Array.isArray(data) ? data : []);
    } catch (err) { showToast(err.message || 'Failed to load history'); }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const generateCampaign = () => {
    if (!campaign.name.trim() || !activePlatform) return;
    setGenerating(true);
    setResult(null);
    setError(null);
    setAdScore(null);
    setHeadlineVariations(null);
    setNegKeywords(null);
    setVideoScript(null);
    setAdaptResults({});
    setShowPreview(false);

    const platform = PLATFORMS.find(p => p.id === activePlatform);
    const objective = OBJECTIVES.find(o => o.id === campaign.objective);
    const preset = AUDIENCE_PRESETS.find(a => a.id === audiencePreset);
    const fullDesc = `[Platform: ${platform?.name}] [Objective: ${objective?.name}] [Budget: $${campaign.budget}/day] [Audience: ${preset?.name || 'Custom'} — ${campaign.audience || preset?.desc || 'Not specified'}]${campaign.template ? `\n[Template: ${campaign.template}]` : ''}\n\nCampaign: ${campaign.name}`;

    connectSSE('/api/ads/generate', { platform: activePlatform, name: campaign.name, objective: campaign.objective, budget: campaign.budget, audience: fullDesc }, {
      onChunk: () => {}, // JSON chunks — don't stream to UI
      onResult: (data) => { setResult(data); setGenerating(false); },
      onError: (err) => { setError(err.message || 'Failed to build campaign'); setGenerating(false); },
    });
  };

  const scoreAd = async () => {
    if (!result) return;
    setScoreLoading(true);
    try {
      const r = await postJSON('/api/ads/score-ad', {
        headline: result.ad_content?.headlines?.[0] || campaign.name,
        body_copy: result.ad_content?.primary_texts?.[0] || result.ad_content?.descriptions?.[0],
        cta: result.ad_content?.cta,
        platform: activePlatform,
        objective: campaign.objective,
      });
      setAdScore(r);
    } catch (err) { showToast(err.message || 'Scoring failed'); }
    setScoreLoading(false);
  };

  const generateVariations = async () => {
    if (!result) return;
    setVariationsLoading(true);
    try {
      const r = await postJSON('/api/ads/generate-headline-variations', {
        headline: result.ad_content?.headlines?.[0] || campaign.name,
        platform: activePlatform,
        product: campaign.name,
      });
      setHeadlineVariations(r.variations);
    } catch (err) { showToast(err.message || 'Variations failed'); }
    setVariationsLoading(false);
  };

  const adaptForPlatform = (targetPlatform) => {
    setAdaptLoading(prev => ({ ...prev, [targetPlatform]: true }));
    setAdaptResults(prev => ({ ...prev, [targetPlatform]: null }));
    connectSSE('/api/ads/adapt-platform', { original_campaign: result, target_platform: targetPlatform }, {
      onChunk: () => {},
      onResult: (data) => {
        setAdaptResults(prev => ({ ...prev, [targetPlatform]: data }));
        setAdaptLoading(prev => ({ ...prev, [targetPlatform]: false }));
      },
      onError: (err) => { showToast(err.message || `Adapt to ${targetPlatform} failed`); setAdaptLoading(prev => ({ ...prev, [targetPlatform]: false })); },
    });
  };

  const generateNegKeywords = () => {
    setNegKwLoading(true);
    connectSSE('/api/ads/negative-keywords', { campaign_name: campaign.name, audience: campaign.audience, objective: campaign.objective }, {
      onChunk: () => {},
      onResult: (data) => { setNegKeywords(data); setNegKwLoading(false); },
      onError: (err) => { showToast(err.message || 'Negative keywords failed'); setNegKwLoading(false); },
    });
  };

  const generateVideoScript = () => {
    setScriptLoading(true);
    connectSSE('/api/ads/video-script', { campaign_name: campaign.name, platform: activePlatform, objective: campaign.objective, audience: campaign.audience, duration: scriptDuration }, {
      onChunk: () => {},
      onResult: (data) => { setVideoScript(data); setScriptLoading(false); },
      onError: (err) => { showToast(err.message || 'Script generation failed'); setScriptLoading(false); },
    });
  };

  const buildUTM = () => {
    if (!utmUrl.trim()) return '';
    const params = new URLSearchParams({
      utm_source: activePlatform || 'ads',
      utm_medium: 'cpc',
      utm_campaign: slugify(campaign.name || 'campaign'),
      utm_content: slugify((result?.ad_content?.headlines?.[0] || '').substring(0, 40)),
    });
    const sep = utmUrl.includes('?') ? '&' : '?';
    return `${utmUrl.replace(/\/$/, '')}${sep}${params.toString()}`;
  };

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteCampaign = async (id) => {
    try {
      await deleteJSON(`/api/ads/campaigns/${id}`);
      setSavedCampaigns(prev => prev.filter(c => c.id !== id));
      showToast('Campaign deleted', 'success');
    } catch (err) { showToast(err.message || 'Delete failed'); }
  };

  const loadCampaign = (c) => {
    try {
      const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
      setResult(meta);
      setActivePlatform(c.platform);
      setCampaign(prev => ({ ...prev, name: c.name, objective: c.objective || 'conversions', budget: c.budget || '50' }));
      setTab('builder');
    } catch { showToast('Failed to load campaign'); }
  };

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const platformReach = PLATFORM_REACH[activePlatform] || PLATFORM_REACH.meta;
  const budget = Number(campaign.budget || 0);
  const otherPlatforms = PLATFORMS.filter(p => p.id !== activePlatform);

  // ── History Tab ──────────────────────────────────────────────
  const historyContent = (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{savedCampaigns.length} saved campaign{savedCampaigns.length !== 1 ? 's' : ''}</p>
        <button onClick={loadHistory} className="chip text-[10px]">Refresh</button>
      </div>
      {historyLoading && <div className="p-8 text-center text-sm text-gray-600">Loading...</div>}
      {!historyLoading && savedCampaigns.length === 0 && (
        <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">No saved campaigns yet. Build one first.</div>
      )}
      <div className="panel rounded-2xl overflow-hidden">
        <div className="divide-y divide-indigo-500/[0.04]">
          {savedCampaigns.map(c => (
            <div key={c.id} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 hover:bg-white/[0.01] transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${PLATFORM_COLOR[c.platform] || '#6366f1'}15` }}>
                <svg className="w-4 h-4" style={{ color: PLATFORM_COLOR[c.platform] || '#6366f1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={PLATFORMS.find(p => p.id === c.platform)?.icon || ''} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-300 truncate">{c.name}</p>
                <p className="text-xs text-gray-600">{c.platform} · {c.objective || 'conversions'} · ${c.budget}/day · {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[c.status] || '#6b7280'}20`, color: STATUS_COLOR[c.status] || '#6b7280' }}>
                  {c.status || 'draft'}
                </span>
                <button onClick={() => loadCampaign(c)} className="chip text-[10px]">Load</button>
                <button onClick={() => deleteCampaign(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Platform selection screen ────────────────────────────────
  if (!activePlatform || tab === 'history') {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        <ModuleWrapper moduleId="ads">
          <div className="mb-6 sm:mb-10 animate-fade-in">
            <p className="hud-label mb-3 text-[11px]" style={{ color: MODULE_COLOR }}>AD CAMPAIGN BUILDER</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Paid Advertising</h1>
            <p className="text-base text-gray-400">AI-powered campaigns for every major ad platform</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            {['builder', 'history'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
                {t === 'builder' ? 'Campaign Builder' : `Saved Campaigns${savedCampaigns.length > 0 ? ` (${savedCampaigns.length})` : ''}`}
              </button>
            ))}
          </div>

          {tab === 'history' ? historyContent : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 stagger">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => { setActivePlatform(p.id); setTab('builder'); }}
                    className="panel-interactive rounded-2xl p-5 sm:p-7 text-left group">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                        style={{ background: `${p.color}15`, border: `1px solid ${p.color}20` }}>
                        <svg className="w-7 h-7" style={{ color: p.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                        </svg>
                      </div>
                      <div className="pt-1">
                        <h2 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{p.name}</h2>
                        <p className="text-xs text-gray-500">{p.sub}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {(CAMPAIGN_TEMPLATES[p.id] || []).map(t => (
                        <span key={t.name} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] text-gray-500 border border-gray-100">{t.name}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-12">
                <div className="flex items-center gap-4 mb-5">
                  <p className="hud-label text-[11px]">PLATFORM CAPABILITIES</p>
                  <div className="flex-1 hud-line" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'AI Headlines & Copy', platforms: 'All' },
                    { label: 'Audience Targeting', platforms: 'All' },
                    { label: 'Budget Optimization', platforms: 'All' },
                    { label: 'Ad Extensions & Sitelinks', platforms: 'Google' },
                    { label: 'Lookalike Audiences', platforms: 'Meta' },
                    { label: 'Hashtag Strategy', platforms: 'TikTok' },
                    { label: 'Negative Keywords', platforms: 'Google' },
                    { label: 'Video Script Generator', platforms: 'TikTok · YouTube' },
                    { label: 'Lead Gen Form Copy', platforms: 'LinkedIn · Meta' },
                  ].map((cap, i) => (
                    <div key={i} className="panel rounded-xl p-4 sm:p-5">
                      <p className="text-sm font-semibold text-gray-400">{cap.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{cap.platforms}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </ModuleWrapper>
      </div>
    );
  }

  // ── Builder ──────────────────────────────────────────────────
  const templates = CAMPAIGN_TEMPLATES[activePlatform] || [];

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      <ModuleWrapper moduleId="ads">

        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button onClick={() => { setActivePlatform(null); setResult(null); setCampaign({ name: '', objective: 'conversions', budget: '50', audience: '', template: '' }); setAudiencePreset(null); }}
            className="p-2.5 rounded-lg border border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25 transition-all flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${platform?.color}15`, border: `1px solid ${platform?.color}20` }}>
              <svg className="w-5 h-5" style={{ color: platform?.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={platform?.icon} />
              </svg>
            </div>
            <div>
              <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>{platform?.name?.toUpperCase()} BUILDER</p>
              <h2 className="text-xl font-bold text-white">Build {platform?.name} Campaign</h2>
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            {['builder', 'history'].map(t => (
              <button key={t} onClick={() => { if (t === 'history') loadHistory(); setTab(t); }}
                className={`chip text-[10px] ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
                {t === 'builder' ? 'Builder' : 'History'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'history' ? historyContent : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left: Campaign Config */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-4">CAMPAIGN TEMPLATES</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map(t => (
                      <button key={t.name} onClick={() => setCampaign({ ...campaign, template: t.prompt, name: campaign.name || t.name })}
                        className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${campaign.template === t.prompt ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200 hover:border-indigo-500/15'}`}>
                        <p className="font-semibold">{t.name}</p>
                        <p className="text-xs opacity-60 mt-0.5 line-clamp-2">{t.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-4">CAMPAIGN NAME</p>
                  <input type="text" value={campaign.name} onChange={e => setCampaign({ ...campaign, name: e.target.value })}
                    placeholder="e.g., Summer Sale 2026, Product Launch Q3..."
                    className="w-full input-field rounded-xl px-4 py-3 text-base" />
                </div>

                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-4">TARGET AUDIENCE</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
                    {AUDIENCE_PRESETS.map(a => (
                      <button key={a.id} onClick={() => { setAudiencePreset(a.id); setCampaign({ ...campaign, audience: a.desc }); }}
                        className={`text-left px-4 py-3 rounded-xl border text-xs transition-all ${audiencePreset === a.id ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'}`}>
                        <p className="font-bold text-sm">{a.name}</p>
                        <p className="opacity-60 mt-1">{a.desc}</p>
                      </button>
                    ))}
                  </div>
                  <textarea value={campaign.audience} onChange={e => { setCampaign({ ...campaign, audience: e.target.value }); setAudiencePreset(null); }} rows={3}
                    placeholder="Or describe your custom audience..."
                    className="w-full input-field rounded-xl px-4 py-3 text-sm resize-none" />
                </div>

                <button onClick={generateCampaign} disabled={!campaign.name.trim() || generating}
                  className="btn-accent w-full py-4 rounded-xl text-sm font-bold"
                  style={{ background: generating ? '#1e1e2e' : MODULE_COLOR, boxShadow: generating ? 'none' : `0 4px 20px -4px ${MODULE_COLOR}60` }}>
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                      BUILDING CAMPAIGN...
                    </span>
                  ) : 'BUILD CAMPAIGN WITH AI'}
                </button>
              </div>

              {/* Right: Settings */}
              <div className="space-y-4 sm:space-y-5">
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-4">OBJECTIVE</p>
                  <div className="space-y-2">
                    {OBJECTIVES.map(o => (
                      <button key={o.id} onClick={() => setCampaign({ ...campaign, objective: o.id })}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${campaign.objective === o.id ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'}`}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={o.icon} />
                        </svg>
                        <div className="text-left">
                          <p className="font-semibold text-sm">{o.name}</p>
                          <p className="text-[10px] opacity-60">{o.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-4">DAILY BUDGET</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {BUDGET_PRESETS.map(b => (
                      <button key={b.id} onClick={() => setCampaign({ ...campaign, budget: b.id })}
                        className={`chip text-xs flex-col items-center py-2.5 ${campaign.budget === b.id ? 'active' : ''}`}
                        style={campaign.budget === b.id ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: '#34d399' } : {}}>
                        <span className="font-bold">{b.label}</span>
                        <span className="text-[10px] opacity-60">{b.desc}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input type="number" value={campaign.budget} onChange={e => setCampaign({ ...campaign, budget: e.target.value })} className="flex-1 input-field rounded-xl px-3 py-2 text-sm" />
                    <span className="text-sm text-gray-500">/day</span>
                  </div>
                </div>

                {/* Platform-specific reach estimates */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="hud-label text-[11px]">EST. DAILY REACH</p>
                    <span className="text-[9px] text-gray-600 font-semibold">{platform?.name?.toUpperCase()}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-500">Impressions</span>
                      <span className="text-white font-mono font-bold">{(budget * platformReach.impMin).toLocaleString()}–{(budget * platformReach.impMax).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-500">Clicks</span>
                      <span className="text-white font-mono font-bold">{Math.round(budget * platformReach.clkMin)}–{Math.round(budget * platformReach.clkMax)}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-500">Avg CPC</span>
                      <span className="font-mono font-bold" style={{ color: platform?.color }}>${platformReach.cpcMin.toFixed(2)}–${platformReach.cpcMax.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-3">Estimates based on typical {platform?.name} benchmarks. Actual results vary.</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="panel rounded-xl p-4 mt-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                <p className="text-xs text-red-400 flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400">Dismiss</button>
              </div>
            )}

            {/* Generation Loading */}
            {generating && (
              <div className="panel rounded-2xl p-5 sm:p-8 mt-6 animate-fade-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                  <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>BUILDING CAMPAIGN</span>
                </div>
                <div className="space-y-3">
                  {['Analyzing platform requirements', 'Generating headlines & copy', 'Building audience targeting', 'Optimizing budget allocation'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-500" style={{ animation: `fade-in 0.4s ease-out ${i * 0.4}s both` }}>
                      <div className="w-2 h-2 rounded-full bg-emerald-400/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                      {step}...
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {result && !result.error && (
              <div className="space-y-4 sm:space-y-5 mt-6 animate-fade-up">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>CAMPAIGN READY</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={copyAll} className="chip text-xs" style={{ color: copied ? '#4ade80' : undefined }}>{copied ? 'Copied!' : 'Copy All'}</button>
                    <button onClick={generateCampaign} className="chip text-xs">Regenerate</button>
                    <button onClick={() => setShowPreview(p => !p)} className="chip text-xs" style={showPreview ? { background: `${platform?.color}20`, borderColor: `${platform?.color}40`, color: platform?.color } : {}}>
                      {showPreview ? 'Hide Preview' : 'Ad Preview'}
                    </button>
                  </div>
                </div>

                {/* Ad Preview */}
                {showPreview && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <p className="hud-label text-[11px] mb-4">AD PREVIEW</p>
                    <div className="flex justify-center">
                      <AdPreview platform={activePlatform} adContent={result.ad_content} />
                    </div>
                  </div>
                )}

                {/* Ad Content */}
                {result.ad_content && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <p className="hud-label text-[11px] mb-4">AD CONTENT</p>
                    {result.ad_content.headlines?.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Headlines</p>
                        <div className="space-y-2">{result.ad_content.headlines.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-3 border border-indigo-500/6 group">
                            <p className="text-sm text-gray-200 flex-1">{h}</p>
                            <button onClick={() => navigator.clipboard.writeText(h).then(() => showToast('Copied!', 'success'))} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all flex-shrink-0">Copy</button>
                          </div>
                        ))}</div>
                      </div>
                    )}
                    {result.ad_content.descriptions?.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Descriptions</p>
                        <div className="space-y-2">{result.ad_content.descriptions.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-3 border border-indigo-500/6 group">
                            <p className="text-sm text-gray-300 flex-1">{d}</p>
                            <button onClick={() => navigator.clipboard.writeText(d).then(() => showToast('Copied!', 'success'))} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all flex-shrink-0">Copy</button>
                          </div>
                        ))}</div>
                      </div>
                    )}
                    {result.ad_content.primary_texts?.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Primary Text</p>
                        <div className="space-y-2">{result.ad_content.primary_texts.map((t, i) => (
                          <div key={i} className="flex gap-2 bg-black/40 rounded-xl px-4 py-3 border border-indigo-500/6 group">
                            <p className="text-sm text-gray-300 flex-1 whitespace-pre-wrap">{t}</p>
                            <button onClick={() => navigator.clipboard.writeText(t).then(() => showToast('Copied!', 'success'))} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all flex-shrink-0 self-start">Copy</button>
                          </div>
                        ))}</div>
                      </div>
                    )}
                    {result.ad_content.cta && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Call to Action</p>
                        <span className="chip text-sm" style={{ background: `${platform?.color}15`, borderColor: `${platform?.color}30`, color: platform?.color }}>{result.ad_content.cta}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Targeting */}
                {result.targeting && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <p className="hud-label text-[11px] mb-4">TARGETING STRATEGY</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {result.targeting.audience_segments?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Audience Segments</p>
                          <div className="flex flex-wrap gap-2">{result.targeting.audience_segments.map((s, i) => <span key={i} className="chip text-xs">{s}</span>)}</div>
                        </div>
                      )}
                      {result.targeting.interests?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Interests</p>
                          <div className="flex flex-wrap gap-2">{result.targeting.interests.map((s, i) => <span key={i} className="chip text-xs">{s}</span>)}</div>
                        </div>
                      )}
                      {result.targeting.placements?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Placements</p>
                          <div className="flex flex-wrap gap-2">{result.targeting.placements.map((s, i) => <span key={i} className="chip text-xs">{s}</span>)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Recommendations */}
                {result.strategy?.recommendations?.length > 0 && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <p className="hud-label text-[11px] mb-4">AI RECOMMENDATIONS</p>
                    <ul className="space-y-3">{result.strategy.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: platform?.color, boxShadow: `0 0 6px ${platform?.color}` }} />
                        {r}
                      </li>
                    ))}</ul>
                  </div>
                )}

                {/* Ad Quality Score + Headline Variations */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="hud-label text-[11px]">AD QUALITY TOOLS</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={scoreAd} disabled={scoreLoading} className="chip text-xs">{scoreLoading ? 'Scoring...' : 'Score This Ad'}</button>
                      <button onClick={generateVariations} disabled={variationsLoading} className="chip text-xs">{variationsLoading ? 'Generating...' : 'Headline Variations'}</button>
                    </div>
                  </div>
                  {adScore && (
                    <div className="space-y-4 mb-4">
                      <div className="grid grid-cols-5 gap-2">
                        {[['Overall', adScore.overall_score], ['Hook', adScore.hook_strength], ['Clarity', adScore.clarity], ['CTA', adScore.cta_effectiveness], ['Platform', adScore.platform_fit]].map(([label, val]) => (
                          <div key={label} className="text-center panel rounded-xl py-3">
                            <div className="text-xl font-bold font-mono" style={{ color: val >= 8 ? '#22c55e' : val >= 6 ? '#f59e0b' : '#ef4444' }}>{val}</div>
                            <div className="text-[9px] text-gray-600 mt-1">{label}</div>
                          </div>
                        ))}
                      </div>
                      {adScore.improvements?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Improvements</p>
                          <div className="flex flex-wrap gap-2">{adScore.improvements.map((imp, i) => <span key={i} className="chip text-[10px]">• {imp}</span>)}</div>
                        </div>
                      )}
                      {adScore.rewritten_headline && (
                        <div className="panel rounded-xl p-3 flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Suggested Headline</p>
                            <p className="text-sm text-gray-300">{adScore.rewritten_headline}</p>
                          </div>
                          <button onClick={() => navigator.clipboard.writeText(adScore.rewritten_headline).then(() => showToast('Copied!', 'success'))} className="chip text-[9px] flex-shrink-0">Copy</button>
                        </div>
                      )}
                      {adScore.predicted_ctr && <p className="text-xs text-gray-500">Predicted CTR: <span className="text-emerald-400 font-bold">{adScore.predicted_ctr}</span></p>}
                    </div>
                  )}
                  {headlineVariations && headlineVariations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Headline Variations</p>
                      {headlineVariations.map((v, i) => (
                        <div key={i} className="panel-interactive rounded-xl p-3 flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="chip text-[9px]">{v.approach}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-300">{v.headline}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{v.strength}</p>
                          </div>
                          <button onClick={() => navigator.clipboard.writeText(v.headline).then(() => showToast('Copied!', 'success'))} className="chip text-[9px] flex-shrink-0">Copy</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multi-Platform Adapt */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-1">ADAPT FOR OTHER PLATFORMS</p>
                  <p className="text-xs text-gray-500 mb-4">Keep the same offer — rewrite natively for a new platform with one click.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {otherPlatforms.map(p => (
                      <div key={p.id}>
                        <button
                          onClick={() => adaptForPlatform(p.id)}
                          disabled={!!adaptLoading[p.id]}
                          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-indigo-500/8 bg-white/[0.01] hover:border-indigo-500/20 text-gray-400 hover:text-gray-200 transition-all text-sm"
                          style={adaptResults[p.id] ? { borderColor: `${p.color}30`, background: `${p.color}08` } : {}}
                        >
                          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}20` }}>
                            <svg className="w-3.5 h-3.5" style={{ color: p.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                            </svg>
                          </div>
                          <span className="font-semibold text-sm">{adaptLoading[p.id] ? 'Adapting...' : adaptResults[p.id] ? `${p.name} ✓` : `Adapt for ${p.name}`}</span>
                        </button>
                        {adaptResults[p.id]?.ad_content && (
                          <div className="mt-2 panel rounded-xl p-3 space-y-2">
                            {adaptResults[p.id].ad_content.headlines?.slice(0, 2).map((h, i) => (
                              <div key={i} className="flex items-center gap-2 group">
                                <p className="text-xs text-gray-400 flex-1 truncate">{h}</p>
                                <button onClick={() => navigator.clipboard.writeText(h).then(() => showToast('Copied!', 'success'))} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all flex-shrink-0">Copy</button>
                              </div>
                            ))}
                            {adaptResults[p.id].ad_content.primary_texts?.[0] && (
                              <p className="text-xs text-gray-500 line-clamp-2">{adaptResults[p.id].ad_content.primary_texts[0]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* UTM Builder */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-1">UTM LINK BUILDER</p>
                  <p className="text-xs text-gray-500 mb-4">Auto-generate tracking parameters for this campaign.</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={utmUrl}
                      onChange={e => setUtmUrl(e.target.value)}
                      placeholder="https://yourwebsite.com/landing-page"
                      className="flex-1 input-field rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                  {utmUrl.trim() && (
                    <div className="panel rounded-xl p-3 flex items-center gap-3">
                      <code className="text-xs text-emerald-400 flex-1 break-all">{buildUTM()}</code>
                      <button onClick={() => navigator.clipboard.writeText(buildUTM()).then(() => showToast('UTM link copied!', 'success'))} className="chip text-[9px] flex-shrink-0">Copy</button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-gray-600">
                    {[`utm_source=${activePlatform}`, 'utm_medium=cpc', `utm_campaign=${slugify(campaign.name || 'campaign')}`].map(p => (
                      <span key={p} className="chip text-[9px]">{p}</span>
                    ))}
                  </div>
                </div>

                {/* Negative Keywords — Google only */}
                {activePlatform === 'google' && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="hud-label text-[11px]">NEGATIVE KEYWORDS</p>
                      <button onClick={generateNegKeywords} disabled={negKwLoading} className="chip text-[10px]" style={{ background: '#4285f420', borderColor: '#4285f440', color: '#4285f4' }}>
                        {negKwLoading ? 'Generating...' : 'Generate Negative Keywords'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Prevent wasted spend by blocking irrelevant searches.</p>
                    {negKeywords && (
                      <div>
                        {negKeywords.categories?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {negKeywords.categories.map((cat, i) => <span key={i} className="chip text-[10px]">{cat}</span>)}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {negKeywords.negative_keywords?.map((kw, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/30 group">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#4285f420', color: '#4285f4' }}>{kw.match_type}</span>
                              <span className="text-xs text-gray-300 flex-1 font-mono">-{kw.keyword}</span>
                              <span className="text-[10px] text-gray-600 truncate hidden sm:block">{kw.reason}</span>
                              <button onClick={() => navigator.clipboard.writeText(kw.keyword).then(() => showToast('Copied!', 'success'))} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all flex-shrink-0">Copy</button>
                            </div>
                          ))}
                        </div>
                        {negKeywords.negative_keywords?.length > 0 && (
                          <button onClick={() => navigator.clipboard.writeText(negKeywords.negative_keywords.map(k => `-${k.keyword}`).join('\n')).then(() => showToast('All copied!', 'success'))} className="chip text-[10px] mt-3">Copy All</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Video Script — TikTok and YouTube Pre-Roll */}
                {(activePlatform === 'tiktok' || campaign.template?.toLowerCase().includes('youtube')) && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                      <p className="hud-label text-[11px]">VIDEO SCRIPT GENERATOR</p>
                      <div className="flex items-center gap-2">
                        <select value={scriptDuration} onChange={e => setScriptDuration(e.target.value)} className="input-field rounded-lg px-2 py-1 text-xs">
                          <option value="15">15s</option>
                          <option value="30">30s</option>
                          <option value="60">60s</option>
                        </select>
                        <button onClick={generateVideoScript} disabled={scriptLoading} className="chip text-[10px]" style={{ background: '#fe2c5520', borderColor: '#fe2c5540', color: '#fe2c55' }}>
                          {scriptLoading ? 'Writing...' : 'Generate Script'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">A {scriptDuration}s video script with hook, body, and CTA — optimized for {activePlatform === 'tiktok' ? 'TikTok' : 'YouTube Pre-Roll'}.</p>
                    {videoScript && (
                      <div className="space-y-3">
                        {videoScript.hook && (
                          <div className="panel rounded-xl p-3.5 border-l-2" style={{ borderLeftColor: '#fe2c55' }}>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">HOOK (0:00–0:03) · {videoScript.hook.why_it_works}</p>
                            <p className="text-xs text-gray-400 mb-1"><span className="text-gray-600">Visual:</span> {videoScript.hook.visual}</p>
                            <p className="text-sm text-gray-200 font-semibold italic">"{videoScript.hook.audio}"</p>
                          </div>
                        )}
                        {videoScript.body?.map((section, i) => (
                          <div key={i} className="panel rounded-xl p-3.5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{section.time} · {section.purpose}</p>
                            <p className="text-xs text-gray-400 mb-1"><span className="text-gray-600">Visual:</span> {section.visual}</p>
                            <p className="text-sm text-gray-300 italic">"{section.script}"</p>
                          </div>
                        ))}
                        {videoScript.cta && (
                          <div className="panel rounded-xl p-3.5 border-l-2" style={{ borderLeftColor: MODULE_COLOR }}>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">CTA ({videoScript.cta.time})</p>
                            <p className="text-xs text-gray-400 mb-1"><span className="text-gray-600">Visual:</span> {videoScript.cta.visual}</p>
                            <p className="text-sm text-gray-300 italic mb-1">"{videoScript.cta.script}"</p>
                            {videoScript.cta.text_overlay && <p className="text-xs" style={{ color: MODULE_COLOR }}>Screen text: "{videoScript.cta.text_overlay}"</p>}
                          </div>
                        )}
                        {videoScript.music_vibe && <p className="text-xs text-gray-600">Music: {videoScript.music_vibe}</p>}
                        {videoScript.production_notes && <p className="text-xs text-gray-600 italic">{videoScript.production_notes}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </ModuleWrapper>
    </div>
  );
}

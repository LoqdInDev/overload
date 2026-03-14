import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../context/ThemeContext';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';

const MODULE_COLOR = '#10b981';

const PLATFORMS = [
  { id: 'google',   name: 'Google Ads',   color: '#4285f4', sub: 'Search, Display, YouTube, Performance Max' },
  { id: 'meta',     name: 'Meta Ads',     color: '#1877f2', sub: 'Facebook, Instagram, Messenger, Audience Network' },
  { id: 'tiktok',   name: 'TikTok Ads',   color: '#fe2c55', sub: 'In-Feed, TopView, Spark Ads, Shop Ads' },
  { id: 'linkedin', name: 'LinkedIn Ads', color: '#0a66c2', sub: 'Sponsored Content, Lead Gen Forms, Conversation Ads' },
];

const AD_BRAND_FILE = { google: 'google', meta: 'meta', tiktok: 'tiktok', linkedin: 'linkedin' };

function AdPlatformIcon({ id, size = 22 }) {
  const file = AD_BRAND_FILE[id];
  if (!file) return null;
  return <img src={`/brands/${file}.svg`} alt={id} style={{ width: size, height: size, objectFit: 'contain' }} />;
}

function adIconBg(id, dark) {
  return dark
    ? { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }
    : { background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
}

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
const PLATFORM_COLOR = { google: '#4285f4', meta: '#1877f2', tiktok: '#010101', linkedin: '#0a66c2' };

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Ad Preview ───────────────────────────────────────
function AdPreview({ platform, adContent, dark }) {
  if (!adContent) return null;
  const h1 = adContent.headlines?.[0] || 'Your Headline Here';
  const h2 = adContent.headlines?.[1] || 'Second Headline';
  const h3 = adContent.headlines?.[2] || 'Third Headline';
  const desc = adContent.descriptions?.[0] || 'Your description text appears here. Make it compelling and relevant.';
  const primary = adContent.primary_texts?.[0] || 'Your primary text goes here. Write something engaging.';
  const headline = adContent.headlines?.[0] || 'Headline';
  const cta = adContent.cta || 'Learn More';

  const bg = dark ? '#0f0f1a' : '#fff';
  const textPrimary = dark ? '#e5e7eb' : '#1a1a2e';
  const textSecondary = dark ? '#9ca3af' : '#4d5156';
  const textMuted = dark ? '#6b7280' : '#65676b';
  const border = dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
  const surfaceMuted = dark ? '#1a1a2e' : '#e2e8f0';
  const surfaceAlt = dark ? '#161625' : '#f0f2f5';
  const imagePlaceholder = dark ? '#1e1e30' : '#e9ebee';

  if (platform === 'google') return (
    <div style={{ background: bg, borderRadius: 8, padding: '16px 20px', maxWidth: 580, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ background: dark ? '#1a1a2e' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#5f6368'}`, color: dark ? '#9ca3af' : '#202124', fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>Ad</span>
        <span style={{ color: dark ? '#4ade80' : '#0d652d', fontSize: 13 }}>www.yourwebsite.com &rsaquo; page</span>
      </div>
      <div style={{ color: dark ? '#818cf8' : '#1a0dab', fontSize: 18, lineHeight: 1.3, marginBottom: 4 }}>
        {h1} | {h2} | {h3}
      </div>
      <div style={{ color: textSecondary, fontSize: 14, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );

  if (platform === 'meta') return (
    <div style={{ background: bg, borderRadius: 8, maxWidth: 380, overflow: 'hidden', border: `1px solid ${border}` }}>
      <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: surfaceMuted, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Your Brand</div>
          <div style={{ fontSize: 11, color: textMuted }}>Sponsored &middot; &#127760;</div>
        </div>
      </div>
      <div style={{ padding: '0 12px 8px', fontSize: 13, color: textPrimary, lineHeight: 1.5 }}>
        {primary.substring(0, 125)}{primary.length > 125 ? '...' : ''}
      </div>
      <div style={{ background: imagePlaceholder, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textMuted, fontSize: 12 }}>1200 &times; 628</span>
      </div>
      <div style={{ background: surfaceAlt, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline.substring(0, 40)}</div>
        <button style={{ background: surfaceMuted, border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'default', color: textPrimary, whiteSpace: 'nowrap', flexShrink: 0 }}>{cta}</button>
      </div>
    </div>
  );

  if (platform === 'tiktok') return (
    <div style={{ width: 175, height: 310, background: '#000', borderRadius: 12, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85))' }} />
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {['\u2665', '\uD83D\uDCAC', '\u2197'].map((ic, i) => (
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
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginBottom: 7 }}>&music; Trending Sound &middot; Sponsored</div>
        <button style={{ background: '#fe2c55', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 10, fontWeight: 700, width: '100%', cursor: 'default' }}>{cta}</button>
      </div>
    </div>
  );

  if (platform === 'linkedin') return (
    <div style={{ background: bg, borderRadius: 8, maxWidth: 380, overflow: 'hidden', border: `1px solid ${border}` }}>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: 4, background: surfaceMuted, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Your Company</div>
          <div style={{ fontSize: 11, color: textMuted }}>Sponsored</div>
        </div>
      </div>
      <div style={{ padding: '0 16px 10px', fontSize: 13, color: dark ? '#d1d5db' : '#333', lineHeight: 1.5 }}>
        {primary.substring(0, 150)}{primary.length > 150 ? '...' : ''}
      </div>
      <div style={{ background: dark ? '#1e1e30' : '#f3f2ef', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textMuted, fontSize: 12 }}>1200 &times; 627</span>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: `1px solid ${border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline.substring(0, 50)}</div>
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
  const { dark } = useTheme();
  const [activePlatform, setActivePlatform] = useState(null);
  const [tab, setTab] = useState('builder'); // 'builder' | 'history' | 'optimizer'
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

  // Export
  const [exportConfig, setExportConfig] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Launch
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [adAccounts, setAdAccounts] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [userPlan, setUserPlan] = useState('free');

  // Optimizer
  const [optLog, setOptLog] = useState([]);
  const [optMetrics, setOptMetrics] = useState([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

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
    setExportConfig(null);
    setLaunchResult(null);
    setSelectedAccount('');

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

  const exportForPlatform = async () => {
    if (!result || !activePlatform) return;
    setExportLoading(true);
    try {
      const data = await postJSON('/api/ads/export-config', {
        campaign_result: result,
        platform: activePlatform,
        budget: campaign.budget,
        objective: campaign.objective,
      });
      setExportConfig(data);
    } catch (err) { showToast(err.message || 'Export failed'); }
    setExportLoading(false);
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  };

  const fetchAdAccounts = async () => {
    try {
      const data = await fetchJSON('/api/ads/platforms/accounts');
      if (data.success) setAdAccounts(data.data);
    } catch {} // silently fail — accounts panel only shows if connected
  };

  const fetchPlan = async () => {
    try {
      const data = await fetchJSON('/api/billing/subscription');
      if (data.plan) setUserPlan(data.plan);
    } catch {} // silently fail
  };

  const loadOptData = async () => {
    setOptLoading(true);
    try {
      const [logRes, metricsRes] = await Promise.all([
        fetchJSON('/api/ads/optimize/log').catch(() => []),
        fetchJSON('/api/ads/optimize/metrics').catch(() => []),
      ]);
      setOptLog(Array.isArray(logRes) ? logRes : logRes.log || []);
      setOptMetrics(Array.isArray(metricsRes) ? metricsRes : metricsRes.metrics || []);
    } catch {}
    setOptLoading(false);
  };

  const runOptimizeNow = async () => {
    setOptimizing(true);
    try {
      const res = await postJSON('/api/ads/optimize', {});
      showToast(res.message || 'Optimization cycle complete', 'success');
      loadOptData();
    } catch (err) { showToast(err.message || 'Optimization failed'); }
    setOptimizing(false);
  };

  useEffect(() => { fetchAdAccounts(); fetchPlan(); }, []);
  useEffect(() => { if (tab === 'optimizer') loadOptData(); }, [tab]);

  const launchToPlatform = async () => {
    if (!result || !activePlatform) return;
    const needsAccount = ['google', 'meta'].includes(activePlatform);
    if (needsAccount && !selectedAccount) {
      showToast(`Select a ${activePlatform === 'google' ? 'Google Ads Customer' : 'Meta Ad Account'} first`);
      return;
    }
    setLaunchLoading(true);
    setLaunchResult(null);
    try {
      const data = await postJSON('/api/ads/launch', {
        campaign_result: result,
        platform: activePlatform,
        budget: campaign.budget,
        objective: campaign.objective,
        account_id: selectedAccount || undefined,
      });
      setLaunchResult(data);
      showToast(data.message || 'Campaign launched!', 'success');
    } catch (err) {
      showToast(err.message || 'Launch failed');
      setLaunchResult({ error: err.message });
    }
    setLaunchLoading(false);
  };

  const downloadJSON = (filename, obj) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={adIconBg(c.platform, dark)}>
                <AdPlatformIcon id={c.platform} size={16} />
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
  // ── Optimizer Tab Content ───────────────────────────────────
  const optimizerContent = (
    <div className="animate-fade-in space-y-4">
      {/* Plan notice — visible but not blocking */}
      {userPlan !== 'autopilot' && (
        <div className="panel rounded-xl p-3 flex items-center gap-3" style={{ borderColor: '#f59e0b25', background: '#f59e0b08' }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          <p className="text-xs text-gray-400">Autonomous optimization requires the <strong className="text-amber-400">Autopilot plan</strong>. You can preview the dashboard, but actions won't execute on a free plan.</p>
        </div>
      )}
        <>
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 font-semibold">Autonomous Optimizer</p>
              <p className="text-xs text-gray-500">AI monitors metrics every 6 hours — pauses underperformers, scales winners, suggests new campaigns.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadOptData} className="chip text-[10px]">Refresh</button>
              <button onClick={runOptimizeNow} disabled={optimizing} className="chip text-xs" style={{ background: '#10b98120', borderColor: '#10b98140', color: '#10b981' }}>
                {optimizing ? <><span className="w-3 h-3 border-2 border-emerald-600 border-t-emerald-300 rounded-full animate-spin inline-block mr-1.5" />Running...</> : 'Run Optimization Now'}
              </button>
            </div>
          </div>

          {optLoading && <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading optimization data...</div>}

          {/* Latest Metrics */}
          {!optLoading && optMetrics.length > 0 && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4">LIVE CAMPAIGN METRICS</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 uppercase text-[10px]">
                      <th className="text-left py-2 pr-3 font-semibold">Campaign</th>
                      <th className="text-left py-2 pr-3 font-semibold">Platform</th>
                      <th className="text-right py-2 pr-3 font-semibold">Spend</th>
                      <th className="text-right py-2 pr-3 font-semibold">Impressions</th>
                      <th className="text-right py-2 pr-3 font-semibold">Clicks</th>
                      <th className="text-right py-2 pr-3 font-semibold">CTR</th>
                      <th className="text-right py-2 pr-3 font-semibold">CPC</th>
                      <th className="text-right py-2 pr-3 font-semibold">Conv</th>
                      <th className="text-right py-2 pr-3 font-semibold">CPA</th>
                      <th className="text-right py-2 font-semibold">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/[0.04]">
                    {optMetrics.map((m, i) => (
                      <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-2.5 pr-3 text-gray-300 font-semibold truncate max-w-[160px]">{m.campaign_name || m.campaign_id}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            <AdPlatformIcon id={m.platform} size={12} />
                            <span className="text-gray-400 capitalize">{m.platform}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-300 font-mono">${Number(m.spend || 0).toFixed(2)}</td>
                        <td className="py-2.5 pr-3 text-right text-gray-400 font-mono">{Number(m.impressions || 0).toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right text-gray-400 font-mono">{Number(m.clicks || 0).toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right font-mono" style={{ color: Number(m.ctr) > 2 ? '#22c55e' : '#f59e0b' }}>{Number(m.ctr || 0).toFixed(2)}%</td>
                        <td className="py-2.5 pr-3 text-right text-gray-400 font-mono">${Number(m.cpc || 0).toFixed(2)}</td>
                        <td className="py-2.5 pr-3 text-right text-gray-400 font-mono">{Number(m.conversions || 0)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono" style={{ color: Number(m.cpa) < 20 ? '#22c55e' : Number(m.cpa) > 50 ? '#ef4444' : '#f59e0b' }}>{m.cpa ? `$${Number(m.cpa).toFixed(2)}` : '—'}</td>
                        <td className="py-2.5 text-right font-mono" style={{ color: Number(m.roas) >= 3 ? '#22c55e' : Number(m.roas) >= 1 ? '#f59e0b' : '#ef4444' }}>{m.roas ? `${Number(m.roas).toFixed(1)}x` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Optimization Log */}
          {!optLoading && optLog.length > 0 && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4">OPTIMIZATION LOG</p>
              <div className="space-y-3">
                {optLog.map((entry, i) => {
                  let decisions = [];
                  try { decisions = typeof entry.decisions === 'string' ? JSON.parse(entry.decisions) : (entry.decisions || []); } catch {}
                  let analysis = '';
                  try { analysis = typeof entry.ai_analysis === 'string' ? JSON.parse(entry.ai_analysis)?.summary || '' : (entry.ai_analysis?.summary || ''); } catch {}
                  const actionColors = { pause: '#ef4444', enable: '#22c55e', budget_increase: '#3b82f6', budget_decrease: '#f59e0b', new_campaign: '#8b5cf6' };

                  return (
                    <div key={i} className="panel rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                            background: entry.status === 'executed' ? '#22c55e18' : entry.status === 'queued' ? '#f59e0b18' : '#6b728018',
                            color: entry.status === 'executed' ? '#22c55e' : entry.status === 'queued' ? '#f59e0b' : '#6b7280',
                          }}>
                            {entry.status === 'executed' ? 'AUTO-EXECUTED' : entry.status === 'queued' ? 'NEEDS APPROVAL' : (entry.status || 'pending').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-600">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</span>
                        </div>
                      </div>

                      {analysis && <p className="text-xs text-gray-400 mb-3">{analysis}</p>}

                      {decisions.length > 0 && (
                        <div className="space-y-1.5">
                          {decisions.map((d, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs bg-black/30 rounded-lg px-3 py-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: actionColors[d.action] || '#6b7280' }} />
                              <span className="font-bold text-gray-300 capitalize">{(d.action || '').replace(/_/g, ' ')}</span>
                              {d.campaign_id && <span className="text-gray-600 font-mono">{d.campaign_id}</span>}
                              {d.reason && <span className="text-gray-500 flex-1 truncate">— {d.reason}</span>}
                              {d.new_budget && <span className="text-blue-400 font-mono">${d.new_budget}/day</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!optLoading && optLog.length === 0 && optMetrics.length === 0 && (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500 mb-2">No optimization data yet.</p>
              <p className="text-xs text-gray-600">Launch a campaign first, then the optimizer will start monitoring metrics and suggesting improvements automatically every 6 hours.</p>
            </div>
          )}
        </>
    </div>
  );

  if (!activePlatform || tab === 'history' || tab === 'optimizer') {
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
            {[['builder', 'Campaign Builder'], ['history', `Saved Campaigns${savedCampaigns.length > 0 ? ` (${savedCampaigns.length})` : ''}`], ['optimizer', 'AI Optimizer']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'optimizer' ? optimizerContent : tab === 'history' ? historyContent : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 stagger">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => { setActivePlatform(p.id); setTab('builder'); }}
                    className="panel-interactive rounded-2xl p-5 sm:p-7 text-left group">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                        style={adIconBg(p.id, dark)}>
                        <AdPlatformIcon id={p.id} size={28} />
                      </div>
                      <div className="pt-1">
                        <h2 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{p.name}</h2>
                        <p className="text-xs text-gray-500">{p.sub}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {(CAMPAIGN_TEMPLATES[p.id] || []).map(t => (
                        <span key={t.name}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                          style={{
                            background: `${p.color}14`,
                            border: `1px solid ${p.color}30`,
                            color: `${p.color}cc`,
                            letterSpacing: '0.01em',
                          }}>
                          {t.name}
                        </span>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={adIconBg(platform?.id, dark)}>
              <AdPlatformIcon id={platform?.id} size={20} />
            </div>
            <div>
              <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>{platform?.name?.toUpperCase()} BUILDER</p>
              <h2 className="text-xl font-bold text-white">Build {platform?.name} Campaign</h2>
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            {[['builder', 'Builder'], ['history', 'History'], ['optimizer', 'Optimizer']].map(([t, label]) => (
              <button key={t} onClick={() => { if (t === 'history') loadHistory(); setTab(t); }}
                className={`chip text-[10px] ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'optimizer' ? optimizerContent : tab === 'history' ? historyContent : (
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
                    <button onClick={exportForPlatform} disabled={exportLoading} className="chip text-xs" style={{ background: '#f59e0b15', borderColor: '#f59e0b30', color: '#f59e0b' }}>
                      {exportLoading ? 'Exporting...' : exportConfig ? 'Re-export' : `Export for ${platform?.name || 'Platform'}`}
                    </button>
                    <button onClick={() => setLaunchResult(prev => prev ? null : 'show')} className="chip text-xs" style={{ background: '#22c55e15', borderColor: '#22c55e30', color: '#22c55e' }}>
                      {launchResult?.success ? 'Launched' : userPlan !== 'autopilot' ? `Launch to ${platform?.name || 'Platform'}` : `Launch to ${platform?.name || 'Platform'}`}
                      {userPlan !== 'autopilot' && <svg className="w-3 h-3 ml-1 inline-block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>}
                    </button>
                  </div>
                </div>

                {/* Ad Preview */}
                {showPreview && (
                  <div className="panel rounded-2xl p-4 sm:p-6">
                    <p className="hud-label text-[11px] mb-4">AD PREVIEW</p>
                    <div className="flex justify-center">
                      <AdPreview platform={activePlatform} adContent={result.ad_content} dark={dark} />
                    </div>
                  </div>
                )}

                {/* Export Config */}
                {exportConfig && (
                  <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up" style={{ borderColor: '#f59e0b20', background: '#f59e0b05' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} />
                        <p className="hud-label text-[11px]" style={{ color: '#f59e0b' }}>
                          {(exportConfig.format || '').replace(/_/g, ' ').toUpperCase()} — READY TO IMPORT
                        </p>
                      </div>
                      <button onClick={() => setExportConfig(null)} className="text-gray-600 hover:text-gray-400 text-xs">&times;</button>
                    </div>

                    {/* Step-by-step instructions */}
                    <div className="mb-5">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">How to Import</p>
                      <ol className="space-y-1.5">
                        {(exportConfig.instructions || []).map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: '#f59e0b18', color: '#f59e0b' }}>{i + 1}</span>
                            {step.replace(/^\d+\.\s*/, '')}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Downloadable CSV files */}
                    {exportConfig.files && Object.entries(exportConfig.files).some(([, v]) => v) && (
                      <div className="mb-5">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Download CSV Files</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(exportConfig.files).map(([name, content]) => content && (
                            <button key={name} onClick={() => downloadFile(`${slugify(campaign.name || 'campaign')}-${name}`, content)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/8 bg-white/[0.01] hover:border-amber-500/30 hover:bg-amber-500/5 text-gray-400 hover:text-amber-400 transition-all text-sm">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* API-ready payload */}
                    {(exportConfig.api_payload || exportConfig.campaign_setup) && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">API-Ready Payload</p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(exportConfig.api_payload || exportConfig.campaign_setup, null, 2));
                              showToast('API payload copied!', 'success');
                            }} className="chip text-[10px]">Copy JSON</button>
                            <button onClick={() => downloadJSON(`${slugify(campaign.name || 'campaign')}-${activePlatform}-api-payload.json`, exportConfig.api_payload || exportConfig.campaign_setup)} className="chip text-[10px]">Download</button>
                          </div>
                        </div>
                        <pre className="text-[11px] text-gray-500 bg-black/40 rounded-xl p-4 overflow-x-auto max-h-60 scrollbar-thin font-mono leading-relaxed">
                          {JSON.stringify(exportConfig.api_payload || exportConfig.campaign_setup, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Launch to Platform */}
                {launchResult && launchResult !== 'show' && launchResult.success && (
                  <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up" style={{ borderColor: '#22c55e20', background: '#22c55e05' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
                        <p className="hud-label text-[11px]" style={{ color: '#22c55e' }}>CAMPAIGN LAUNCHED (PAUSED)</p>
                      </div>
                      <button onClick={() => setLaunchResult(null)} className="text-gray-600 hover:text-gray-400 text-xs">&times;</button>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{launchResult.message}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {launchResult.campaignId && <div className="bg-black/30 rounded-xl p-3"><p className="text-[10px] text-gray-500 uppercase">Campaign ID</p><p className="text-xs text-gray-300 font-mono mt-1">{launchResult.campaignId}</p></div>}
                      {launchResult.adSetId && <div className="bg-black/30 rounded-xl p-3"><p className="text-[10px] text-gray-500 uppercase">Ad Set ID</p><p className="text-xs text-gray-300 font-mono mt-1">{launchResult.adSetId}</p></div>}
                      {launchResult.adGroupResource && <div className="bg-black/30 rounded-xl p-3"><p className="text-[10px] text-gray-500 uppercase">Ad Group</p><p className="text-xs text-gray-300 font-mono mt-1 break-all">{launchResult.adGroupResource.split('/').pop()}</p></div>}
                      {launchResult.adId && <div className="bg-black/30 rounded-xl p-3"><p className="text-[10px] text-gray-500 uppercase">Ad ID</p><p className="text-xs text-gray-300 font-mono mt-1">{launchResult.adId}</p></div>}
                    </div>
                    <p className="text-xs text-gray-500 mt-4">Your campaign was created as <strong className="text-amber-400">PAUSED</strong>. Open your {platform?.name} Ads Manager to review targeting, add creative assets, set your landing page URL, and enable it when ready.</p>
                  </div>
                )}

                {launchResult === 'show' && (
                  <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up" style={{ borderColor: '#22c55e20', background: '#22c55e05' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
                        <p className="hud-label text-[11px]" style={{ color: '#22c55e' }}>LAUNCH TO {platform?.name?.toUpperCase()}</p>
                      </div>
                      <button onClick={() => setLaunchResult(null)} className="text-gray-600 hover:text-gray-400 text-xs">&times;</button>
                    </div>

                    {/* Plan gate — Autopilot required */}
                    {userPlan !== 'autopilot' && (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#22c55e15', border: '1px solid #22c55e30' }}>
                          <svg className="w-7 h-7" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Autopilot Plan Required</h3>
                        <p className="text-sm text-gray-400 mb-1">Launch campaigns directly to {platform?.name} from Overload.</p>
                        <p className="text-xs text-gray-500 mb-5">Your current plan: <span className="font-bold text-gray-300 capitalize">{userPlan}</span></p>
                        <div className="flex items-center justify-center gap-3">
                          <a href="/billing" className="btn-accent px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#22c55e', color: '#fff' }}>
                            Upgrade to Autopilot — $299/mo
                          </a>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-3">Includes: auto-launch ads, full automation engine, AI autopilot across all modules</p>
                      </div>
                    )}

                    {userPlan === 'autopilot' && (
                      <>
                    <p className="text-xs text-gray-400 mb-4">This will create the campaign directly on your {platform?.name} Ads account as <strong className="text-amber-400">PAUSED</strong>. You can review and enable it in your Ads Manager.</p>

                    {/* Account selector for Google/Meta */}
                    {['google', 'meta'].includes(activePlatform) && (
                      <div className="mb-4">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">
                          {activePlatform === 'google' ? 'Google Ads Customer ID' : 'Meta Ad Account ID'}
                        </label>
                        {adAccounts?.[activePlatform] && !adAccounts[activePlatform].error ? (
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(adAccounts[activePlatform]) ? adAccounts[activePlatform] : adAccounts[activePlatform].resourceNames?.map(r => ({ id: r.split('/').pop(), name: r })) || []).map(acc => (
                              <button key={acc.id} onClick={() => setSelectedAccount(acc.id)} className="chip text-xs" style={selectedAccount === acc.id ? { background: `${platform?.color}20`, borderColor: `${platform?.color}40`, color: platform?.color } : {}}>
                                {acc.name || acc.id}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input type="text" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} placeholder={activePlatform === 'google' ? 'e.g. 1234567890' : 'e.g. act_1234567890'} className="w-full input-field rounded-xl px-4 py-2.5 text-sm" />
                        )}
                      </div>
                    )}

                    {/* TikTok/LinkedIn optional account ID */}
                    {['tiktok', 'linkedin'].includes(activePlatform) && (
                      <div className="mb-4">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">
                          {activePlatform === 'tiktok' ? 'Advertiser ID (optional if saved in settings)' : 'Ad Account ID (optional if saved in settings)'}
                        </label>
                        <input type="text" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} placeholder={activePlatform === 'tiktok' ? 'e.g. 7012345678901234567' : 'e.g. 12345678'} className="w-full input-field rounded-xl px-4 py-2.5 text-sm" />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button onClick={launchToPlatform} disabled={launchLoading} className="btn-accent px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: launchLoading ? '#22c55e40' : '#22c55e', color: '#fff' }}>
                        {launchLoading ? (
                          <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Launching...</>
                        ) : (
                          <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg> Launch Campaign</>
                        )}
                      </button>
                      <span className="text-[10px] text-gray-600">Creates as PAUSED</span>
                    </div>

                    {launchResult?.error && (
                      <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">{launchResult.error}</p>
                      </div>
                    )}
                      </>
                    )}
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
                          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={adIconBg(p.id, dark)}>
                            <AdPlatformIcon id={p.id} size={13} />
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

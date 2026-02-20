import { useState } from 'react';

const PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z', color: '#3b82f6' },
  { id: 'meta', name: 'Meta Ads', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', color: '#6366f1' },
  { id: 'tiktok', name: 'TikTok Ads', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z', color: '#ec4899' },
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
};

export default function AdsPage() {
  const [activePlatform, setActivePlatform] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState({ name: '', objective: 'conversions', budget: '50', audience: '', template: '' });
  const [audiencePreset, setAudiencePreset] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generateCampaign = async () => {
    if (!campaign.name.trim() || !activePlatform) return;
    setGenerating(true);
    setResult(null);
    setError(null);
    const platform = PLATFORMS.find(p => p.id === activePlatform);
    const objective = OBJECTIVES.find(o => o.id === campaign.objective);
    const preset = AUDIENCE_PRESETS.find(a => a.id === audiencePreset);
    const fullDesc = `[Platform: ${platform?.name}] [Objective: ${objective?.name}] [Budget: $${campaign.budget}/day] [Audience: ${preset?.name || 'Custom'} — ${campaign.audience || preset?.desc || 'Not specified'}]${campaign.template ? `\n[Template: ${campaign.template}]` : ''}\n\nCampaign: ${campaign.name}`;
    try {
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: activePlatform, name: campaign.name, objective: campaign.objective, budget: campaign.budget, audience: fullDesc }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error('Ad generation error:', e);
      setError(e.message || 'Failed to build campaign. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activePlatform) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <p className="hud-label mb-2" style={{ color: '#10b981' }}>AD CAMPAIGN BUILDER</p>
          <h1 className="text-2xl font-bold text-white mb-1">Choose your platform</h1>
          <p className="text-sm text-gray-500">Select an advertising platform to build your AI-powered campaign</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 stagger">
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setActivePlatform(p.id)}
              className="panel-interactive rounded-xl p-6 text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${p.color}15`, border: `1px solid ${p.color}20` }}>
                  <svg className="w-6 h-6" style={{ color: p.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{p.name}</h3>
                  <p className="text-[10px] text-gray-500">
                    {p.id === 'google' && 'Search, Display, YouTube, Performance Max'}
                    {p.id === 'meta' && 'Facebook, Instagram, Messenger, Audience Network'}
                    {p.id === 'tiktok' && 'In-Feed, TopView, Spark Ads, Shop Ads'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-1.5">
                {(CAMPAIGN_TEMPLATES[p.id] || []).map(t => (
                  <span key={t.name} className="text-[8px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-600 border border-white/[0.04]">{t.name}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Platform Highlights */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label">PLATFORM CAPABILITIES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'AI Headlines & Descriptions', platforms: 'All' },
              { label: 'Audience Targeting', platforms: 'All' },
              { label: 'Budget Optimization', platforms: 'All' },
              { label: 'Ad Extensions', platforms: 'Google' },
              { label: 'Lookalike Audiences', platforms: 'Meta' },
              { label: 'Hashtag Strategy', platforms: 'TikTok' },
            ].map((cap, i) => (
              <div key={i} className="panel rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400">{cap.label}</p>
                <p className="text-[8px] text-gray-600 mt-0.5">{cap.platforms}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const templates = CAMPAIGN_TEMPLATES[activePlatform] || [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setActivePlatform(null); setResult(null); setCampaign({ name: '', objective: 'conversions', budget: '50', audience: '', template: '' }); setAudiencePreset(null); }}
          className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${platform?.color}15`, border: `1px solid ${platform?.color}20` }}>
            <svg className="w-4 h-4" style={{ color: platform?.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={platform?.icon} />
            </svg>
          </div>
          <div>
            <p className="hud-label" style={{ color: '#10b981' }}>{platform?.name?.toUpperCase()} BUILDER</p>
            <h2 className="text-lg font-bold text-white">Build {platform?.name} Campaign</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Campaign Config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Campaign Templates */}
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">CAMPAIGN TEMPLATES</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(t => (
                <button key={t.name} onClick={() => setCampaign({ ...campaign, template: t.prompt, name: campaign.name || t.name })}
                  className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    campaign.template === t.prompt ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200 hover:border-indigo-500/15'
                  }`}>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-1">{t.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Name */}
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">CAMPAIGN NAME</p>
            <input type="text" value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
              placeholder="e.g., Summer Sale 2026, Product Launch Q3..."
              className="w-full input-field rounded-lg px-4 py-3 text-sm" />
          </div>

          {/* Audience */}
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">TARGET AUDIENCE</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {AUDIENCE_PRESETS.map(a => (
                <button key={a.id} onClick={() => { setAudiencePreset(a.id); setCampaign({ ...campaign, audience: a.desc }); }}
                  className={`text-left px-2.5 py-2 rounded-lg border text-[10px] transition-all ${
                    audiencePreset === a.id ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'
                  }`}>
                  <p className="font-bold">{a.name}</p>
                  <p className="text-[8px] opacity-60 mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
            <textarea value={campaign.audience} onChange={(e) => { setCampaign({ ...campaign, audience: e.target.value }); setAudiencePreset(null); }} rows={2}
              placeholder="Or describe your custom audience..."
              className="w-full input-field rounded-lg px-4 py-2.5 text-sm resize-none" />
          </div>

          {/* Generate */}
          <button onClick={generateCampaign} disabled={!campaign.name.trim() || generating}
            className="btn-accent w-full py-3 rounded-lg"
            style={{ background: generating ? '#1e1e2e' : '#10b981', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(16,185,129,0.4)' }}>
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                BUILDING CAMPAIGN...
              </span>
            ) : 'BUILD CAMPAIGN WITH AI'}
          </button>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          {/* Objective */}
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">OBJECTIVE</p>
            <div className="space-y-1.5">
              {OBJECTIVES.map(o => (
                <button key={o.id} onClick={() => setCampaign({ ...campaign, objective: o.id })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    campaign.objective === o.id ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'
                  }`}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={o.icon} />
                  </svg>
                  <div className="text-left">
                    <p className="font-semibold">{o.name}</p>
                    <p className="text-[8px] opacity-60">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">DAILY BUDGET</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {BUDGET_PRESETS.map(b => (
                <button key={b.id} onClick={() => setCampaign({ ...campaign, budget: b.id })}
                  className={`chip text-[10px] justify-center flex-col items-center py-2 ${campaign.budget === b.id ? 'active' : ''}`}
                  style={campaign.budget === b.id ? { background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' } : {}}>
                  <span className="font-bold">{b.label}</span>
                  <span className="text-[8px] opacity-60">{b.desc}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">$</span>
              <input type="number" value={campaign.budget} onChange={(e) => setCampaign({ ...campaign, budget: e.target.value })}
                className="flex-1 input-field rounded-lg px-3 py-2 text-sm" />
              <span className="text-xs text-gray-500">/day</span>
            </div>
          </div>

          {/* Estimated Reach */}
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">EST. DAILY REACH</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Impressions</span>
                <span className="text-white font-mono font-bold">{(Number(campaign.budget || 0) * 180).toLocaleString()}–{(Number(campaign.budget || 0) * 350).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Clicks</span>
                <span className="text-white font-mono font-bold">{Math.round(Number(campaign.budget || 0) * 2.5)}–{Math.round(Number(campaign.budget || 0) * 6)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Est. CPC</span>
                <span className="text-emerald-400 font-mono font-bold">${(Number(campaign.budget || 0) > 0 ? (Number(campaign.budget) / (Number(campaign.budget) * 4)).toFixed(2) : '0.00')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="panel rounded-xl p-4 mt-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
          </div>
        </div>
      )}

      {/* Generation Loading */}
      {generating && (
        <div className="panel rounded-xl p-5 mt-4 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hud-label" style={{ color: '#10b981' }}>BUILDING CAMPAIGN</span>
          </div>
          <div className="space-y-2">
            {['Analyzing platform requirements', 'Generating headlines & copy', 'Building audience targeting', 'Optimizing budget allocation'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500" style={{ animation: `fade-in 0.4s ease-out ${i * 0.4}s both` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                {step}...
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !result.error && (
        <div className="space-y-4 mt-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="hud-label" style={{ color: '#4ade80' }}>CAMPAIGN READY</span>
            </div>
            <div className="flex gap-2">
              <button onClick={copyResult} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                {copied ? 'Copied!' : 'Copy All'}
              </button>
              <button onClick={generateCampaign} className="chip text-[10px]">Regenerate</button>
            </div>
          </div>

          {result.ad_content && (
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3">AD CONTENT</p>
              {result.ad_content.headlines?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Headlines</p>
                  <div className="space-y-1.5">{result.ad_content.headlines.map((h, i) => (
                    <div key={i} className="bg-black/40 rounded-lg px-4 py-2.5 text-sm text-gray-200 border border-indigo-500/6">{h}</div>
                  ))}</div>
                </div>
              )}
              {result.ad_content.descriptions?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Descriptions</p>
                  <div className="space-y-1.5">{result.ad_content.descriptions.map((d, i) => (
                    <div key={i} className="bg-black/40 rounded-lg px-4 py-2.5 text-sm text-gray-300 border border-indigo-500/6">{d}</div>
                  ))}</div>
                </div>
              )}
              {result.ad_content.primary_texts?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Primary Text</p>
                  <div className="space-y-1.5">{result.ad_content.primary_texts.map((t, i) => (
                    <div key={i} className="bg-black/40 rounded-lg px-4 py-3 text-sm text-gray-300 whitespace-pre-wrap border border-indigo-500/6">{t}</div>
                  ))}</div>
                </div>
              )}
              {result.ad_content.cta && (
                <div>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Call to Action</p>
                  <span className="inline-block chip" style={{ background: `${platform?.color}15`, borderColor: `${platform?.color}30`, color: platform?.color }}>{result.ad_content.cta}</span>
                </div>
              )}
            </div>
          )}

          {result.targeting && (
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3">TARGETING STRATEGY</p>
              <div className="grid grid-cols-2 gap-4">
                {result.targeting.audience_segments?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Audience Segments</p>
                    <div className="flex flex-wrap gap-1.5">{result.targeting.audience_segments.map((s, i) => (
                      <span key={i} className="chip text-[9px]">{s}</span>
                    ))}</div>
                  </div>
                )}
                {result.targeting.interests?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1.5">{result.targeting.interests.map((s, i) => (
                      <span key={i} className="chip text-[9px]">{s}</span>
                    ))}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.strategy?.recommendations?.length > 0 && (
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3">AI RECOMMENDATIONS</p>
              <ul className="space-y-2">{result.strategy.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: platform?.color, boxShadow: `0 0 6px ${platform?.color}` }} />
                  {r}
                </li>
              ))}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

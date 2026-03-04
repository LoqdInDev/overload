import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON, connectSSE } from '../../lib/api';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOOLS = [
  { id: 'find', name: 'AI Profile Builder', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
  { id: 'vetting', name: 'Vetting Checklist', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'outreach', name: 'Outreach Generator', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { id: 'brief', name: 'Campaign Brief', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25' },
  { id: 'roi', name: 'ROI Calculator', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
  { id: 'campaigns', name: 'Campaigns', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 1.5l-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605' },
];

const CAMPAIGN_STATUSES = ['planning', 'active', 'completed', 'paused'];
const statusColor = (s) => {
  const map = { active: '#22c55e', planning: '#f59e0b', completed: '#3b82f6', paused: '#6b7280' };
  return map[s] || '#6b7280';
};

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];
const NICHES = ['Fashion', 'Tech', 'Food', 'Fitness', 'Beauty', 'Travel', 'Gaming', 'Finance'];
const FOLLOWER_RANGES = [{ id: 'nano', label: '1K-10K', name: 'Nano' }, { id: 'micro', label: '10K-50K', name: 'Micro' }, { id: 'mid', label: '50K-500K', name: 'Mid' }, { id: 'macro', label: '500K+', name: 'Macro' }];

const OUTREACH_TEMPLATES = [
  { name: 'Product Review', prompt: 'Write an influencer outreach email requesting a product review. Include free product offer and content guidelines.' },
  { name: 'Brand Ambassador', prompt: 'Write a brand ambassador invitation email. Include long-term partnership benefits, commission structure, and exclusivity terms.' },
  { name: 'Sponsored Post', prompt: 'Write a sponsored post collaboration proposal. Include deliverables, timeline, and compensation details.' },
  { name: 'Giveaway Collab', prompt: 'Write a giveaway collaboration proposal. Include prize details, rules, and expected reach.' },
];

export default function InfluencersPage() {
  usePageTitle('Influencer Finder');
  const [activeTool, setActiveTool] = useState(null);
  const [platform, setPlatform] = useState('Instagram');
  const [niche, setNiche] = useState('Fashion');
  const [followerRange, setFollowerRange] = useState('micro');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [budget, setBudget] = useState('5000');
  const [reach, setReach] = useState('100000');
  const [engRate, setEngRate] = useState('3');
  const [convRate, setConvRate] = useState('2');

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', budget: '', status: 'planning' });
  const [roiData, setRoiData] = useState(null);
  const [roiInputs, setRoiInputs] = useState({ followers: '', engagement_rate: '3', fee: '', avg_order_value: '50', product_margin: '40' });
  const [briefProduct, setBriefProduct] = useState('');
  const [briefGoal, setBriefGoal] = useState('Brand Awareness');
  const [briefNiche, setBriefNiche] = useState('');
  const [briefOutput, setBriefOutput] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  const [vettingHandle, setVettingHandle] = useState('');
  const [vettingPlatform, setVettingPlatform] = useState('Instagram');
  const [vettingNiche, setVettingNiche] = useState('');
  const [vettingOutput, setVettingOutput] = useState('');
  const [vettingLoading, setVettingLoading] = useState(false);

  useEffect(() => {
    if (activeTool === 'campaigns') {
      setCampaignsLoading(true);
      fetchJSON('/api/influencers/campaigns')
        .then(data => setCampaigns(Array.isArray(data) ? data : []))
        .catch(console.error)
        .finally(() => setCampaignsLoading(false));
    }
  }, [activeTool]);

  const addCampaign = async () => {
    if (!newCampaign.name.trim()) return;
    try {
      const created = await postJSON('/api/influencers/campaigns', {
        name: newCampaign.name,
        budget: newCampaign.budget ? parseFloat(newCampaign.budget) : 0,
        status: newCampaign.status || 'planning',
      });
      setCampaigns(prev => [created, ...prev]);
      setNewCampaign({ name: '', budget: '', status: 'planning' });
      setShowAddCampaign(false);
    } catch (err) { console.error(err); }
  };

  const deleteCampaign = async (id) => {
    try {
      await deleteJSON(`/api/influencers/campaigns/${id}`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  };

  const updateCampaignStatus = async (id, status) => {
    try {
      const updated = await putJSON(`/api/influencers/campaigns/${id}`, { status });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    } catch (err) { console.error(err); }
  };

  const generate = () => {
    setGenerating(true); setOutput('');
    const fullPrompt = activeTool === 'find'
      ? `Find ${followerRange} influencers on ${platform} in the ${niche} niche. Provide name suggestions, estimated followers, engagement rate, and content style.`
      : activeTool === 'roi'
        ? `Calculate ROI for an influencer campaign: Budget $${budget}, Estimated reach ${reach}, Engagement rate ${engRate}%, Conversion rate ${convRate}%. Provide detailed breakdown.`
        : prompt;
    connectSSE('/api/influencers/generate', { type: activeTool, prompt: fullPrompt }, {
      onChunk: (t) => setOutput(p => p + t),
      onResult: (d) => { setOutput(d.content || ''); setGenerating(false); },
      onError: (e) => { console.error(e); setGenerating(false); },
      onDone: () => setGenerating(false),
    });
  };

  if (!activeTool) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <ModuleWrapper moduleId="influencers">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#ec4899' }}>INFLUENCER FINDER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Influencer Marketing Hub</h1><p className="text-base text-gray-500">Discover, outreach, and manage influencer campaigns with AI</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 stagger">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActiveTool(t.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-center group">
            <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.12)' }}>
              <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
            </div>
            <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
          </button>
        ))}
      </div>
      </ModuleWrapper>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="influencers">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveTool(null); setOutput(''); setPrompt(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div><p className="hud-label text-[11px]" style={{ color: '#ec4899' }}>{TOOLS.find(t => t.id === activeTool)?.name?.toUpperCase()}</p><h2 className="text-lg font-bold text-white">{TOOLS.find(t => t.id === activeTool)?.name}</h2></div>
      </div>

      {activeTool === 'find' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">PLATFORM</p><div className="flex flex-wrap gap-1.5">{PLATFORMS.map(p => (<button key={p} onClick={() => setPlatform(p)} className={`chip text-[10px] ${platform === p ? 'active' : ''}`} style={platform === p ? { background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#f472b6' } : {}}>{p}</button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">NICHE</p><div className="flex flex-wrap gap-1.5">{NICHES.map(n => (<button key={n} onClick={() => setNiche(n)} className={`chip text-[10px] ${niche === n ? 'active' : ''}`} style={niche === n ? { background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#f472b6' } : {}}>{n}</button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">FOLLOWER RANGE</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">{FOLLOWER_RANGES.map(f => (<button key={f.id} onClick={() => setFollowerRange(f.id)} className={`chip text-[10px] justify-center flex-col items-center py-2 ${followerRange === f.id ? 'active' : ''}`} style={followerRange === f.id ? { background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#f472b6' } : {}}><span className="font-bold">{f.name}</span><span className="text-[10px] opacity-60">{f.label}</span></button>))}</div></div>
          <button onClick={generate} disabled={generating} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#ec4899' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />SEARCHING...</span> : 'FIND INFLUENCERS'}</button>
          <div className="text-[10px] text-amber-400/70 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            AI-generated archetypes for planning — not real discoverable profiles
          </div>
        </div>
      )}

      {activeTool === 'vetting' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-4">INFLUENCER VETTING CHECKLIST</p>
            <div className="space-y-3 mb-4">
              <div>
                <p className="hud-label text-[10px] mb-1.5">HANDLE</p>
                <input
                  value={vettingHandle}
                  onChange={e => setVettingHandle(e.target.value)}
                  placeholder="@username"
                  className="w-full input-field rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <p className="hud-label text-[10px] mb-1.5">PLATFORM</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Instagram', 'TikTok', 'YouTube', 'Twitter'].map(p => (
                    <button key={p} onClick={() => setVettingPlatform(p)} className={`chip text-[10px] ${vettingPlatform === p ? 'active' : ''}`} style={vettingPlatform === p ? { background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#f472b6' } : {}}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="hud-label text-[10px] mb-1.5">NICHE (OPTIONAL)</p>
                <input
                  value={vettingNiche}
                  onChange={e => setVettingNiche(e.target.value)}
                  placeholder="e.g. fitness, beauty, tech"
                  className="w-full input-field rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!vettingHandle.trim()) return;
                setVettingOutput('');
                setVettingLoading(true);
                connectSSE('/api/influencers/vetting-checklist', { handle: vettingHandle.replace(/^@/, ''), platform: vettingPlatform, niche: vettingNiche }, {
                  onChunk: (text) => setVettingOutput(prev => prev + text),
                  onResult: () => setVettingLoading(false),
                  onError: () => setVettingLoading(false),
                  onDone: () => setVettingLoading(false),
                });
              }}
              disabled={!vettingHandle.trim() || vettingLoading}
              className="btn-accent w-full py-3 rounded-lg"
              style={{ background: vettingLoading ? '#1e1e2e' : '#ec4899' }}
            >
              {vettingLoading ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING REPORT...</span> : 'GENERATE VETTING REPORT'}
            </button>
          </div>
          {vettingOutput && (
            <div className="animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${vettingLoading ? 'bg-pink-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="hud-label text-[11px]" style={{ color: vettingLoading ? '#f472b6' : '#4ade80' }}>{vettingLoading ? 'GENERATING...' : 'COMPLETE'}</span>
              </div>
              <div className="panel rounded-2xl p-4 sm:p-7">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{vettingOutput}{vettingLoading && <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse" />}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTool === 'outreach' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">OUTREACH TEMPLATES</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{OUTREACH_TEMPLATES.map(t => (<button key={t.name} onClick={() => setPrompt(t.prompt)} className={`text-left px-4 py-3 rounded-lg border text-xs transition-all ${prompt === t.prompt ? 'border-pink-500/30 bg-pink-500/8 text-pink-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'}`}><p className="font-semibold">{t.name}</p><p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{t.prompt}</p></button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">CUSTOM BRIEF</p><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Describe your outreach campaign..." className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" /></div>
          <button onClick={generate} disabled={generating || !prompt.trim()} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#ec4899' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...</span> : 'GENERATE OUTREACH'}</button>
        </div>
      )}

      {activeTool === 'brief' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Brief Generator */}
          <div className="panel animate-fade-in">
            <div className="hud-label" style={{ marginBottom: 12 }}>Campaign Brief Generator</div>
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              <input className="input" placeholder="Product/Service name" value={briefProduct} onChange={e => setBriefProduct(e.target.value)} />
              <input className="input" placeholder="Influencer niche (e.g. fitness, beauty)" value={briefNiche} onChange={e => setBriefNiche(e.target.value)} />
              <select className="input" value={briefGoal} onChange={e => setBriefGoal(e.target.value)}>
                {['Brand Awareness', 'Sales', 'Product Launch', 'Event Promotion', 'App Downloads'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <button className="btn-accent" disabled={!briefProduct || briefLoading}
              onClick={() => {
                setBriefOutput('');
                setBriefLoading(true);
                connectSSE('/api/influencers/generate-brief', { product: briefProduct, goal: briefGoal, influencer_niche: briefNiche },
                  {
                    onChunk: (text) => setBriefOutput(prev => prev + text),
                    onResult: () => setBriefLoading(false),
                    onError: () => setBriefLoading(false),
                    onDone: () => setBriefLoading(false),
                  }
                );
              }}>{briefLoading ? 'Generating...' : 'Generate Brief'}</button>
            {briefOutput && <div style={{ marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7 }}>{briefOutput}</div>}
          </div>
        </div>
      )}

      {activeTool === 'roi' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel animate-fade-in" style={{ marginBottom: 16 }}>
            <div className="hud-label" style={{ marginBottom: 12 }}>Influencer ROI Calculator</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[['Followers', 'followers', 'e.g. 50000'], ['Engagement Rate %', 'engagement_rate', 'e.g. 3.5'], ['Campaign Fee ($)', 'fee', 'e.g. 500'], ['Avg Order Value ($)', 'avg_order_value', 'e.g. 50'], ['Product Margin %', 'product_margin', 'e.g. 40']].map(([label, key, placeholder]) => (
                <div key={key}>
                  <div className="hud-label" style={{ marginBottom: 4 }}>{label}</div>
                  <input className="input" type="number" placeholder={placeholder}
                    value={roiInputs[key]} onChange={e => setRoiInputs(prev => ({ ...prev, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button className="btn-accent" onClick={async () => {
              try {
                const result = await postJSON('/api/influencers/calculate-roi', roiInputs);
                setRoiData(result);
              } catch {}
            }}>Calculate ROI</button>
            {roiData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
                {[['Estimated Reach', roiData.reach?.toLocaleString()], ['Projected Sales', roiData.projected_sales], ['ROI', roiData.roi_percent + '%']].map(([label, val]) => (
                  <div key={label} style={{ textAlign: 'center', padding: 12, background: 'var(--surface)', borderRadius: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: label === 'ROI' ? (roiData.is_profitable ? '#22c55e' : '#ef4444') : 'var(--accent)' }}>{val}</div>
                    <div className="hud-label">{label}</div>
                  </div>
                ))}
              </div>
            )}
            {roiData && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Break-even at {roiData.breakeven_sales} sales · Projected revenue: ${roiData.projected_revenue}</div>}
          </div>
        </div>
      )}

      {activeTool === 'campaigns' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowAddCampaign(!showAddCampaign)} className="chip text-[10px]" style={{ background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#f472b6' }}>+ Add Campaign</button>
          </div>
          {showAddCampaign && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="Campaign name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newCampaign.budget} onChange={e => setNewCampaign({ ...newCampaign, budget: e.target.value })} placeholder="Budget ($)" type="number" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newCampaign.status} onChange={e => setNewCampaign({ ...newCampaign, status: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <button onClick={addCampaign} className="chip text-[10px]" style={{ background: '#ec4899', color: '#fff', borderColor: '#ec4899' }}>Create Campaign</button>
            </div>
          )}
          {campaignsLoading && (
            <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading campaigns...</div>
          )}
          {!campaignsLoading && campaigns.length === 0 && (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No campaigns yet</p>
              <p className="text-xs text-gray-600 mt-1">Create your first influencer campaign to get started</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
            {campaigns.map(c => (
              <div key={c.id} className="group panel rounded-2xl p-4 sm:p-6 hover:border-pink-500/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-200 truncate">{c.name}</p>
                    {c.budget != null && (
                      <p className="text-xs text-gray-500 mt-0.5">${Number(c.budget).toLocaleString()} budget</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <select
                      value={c.status || 'planning'}
                      onChange={e => updateCampaignStatus(c.id, e.target.value)}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full appearance-none cursor-pointer focus:outline-none"
                      style={{ background: `${statusColor(c.status)}15`, color: statusColor(c.status), border: `1px solid ${statusColor(c.status)}25` }}
                    >
                      {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => deleteCampaign(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                </div>
                {c.description && <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>}
                <div className="flex gap-3 text-xs text-gray-600 mt-2">
                  {c.start_date && <span>Start: {new Date(c.start_date).toLocaleDateString()}</span>}
                  {c.end_date && <span>End: {new Date(c.end_date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {output && <div className="mt-6 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-pink-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#f472b6' : '#4ade80' }}>{generating ? 'PROCESSING...' : 'COMPLETE'}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse" />}</pre></div></div>}
      </ModuleWrapper>
    </div>
  );
}

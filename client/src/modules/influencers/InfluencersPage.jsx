import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

const TOOLS = [
  { id: 'find', name: 'Find Influencers', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
  { id: 'outreach', name: 'Outreach Generator', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { id: 'brief', name: 'Campaign Brief', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25' },
  { id: 'roi', name: 'ROI Calculator', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
];

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

  const generate = async () => {
    setGenerating(true); setOutput('');
    const fullPrompt = activeTool === 'find'
      ? `Find ${followerRange} influencers on ${platform} in the ${niche} niche. Provide name suggestions, estimated followers, engagement rate, and content style.`
      : activeTool === 'roi'
        ? `Calculate ROI for an influencer campaign: Budget $${budget}, Estimated reach ${reach}, Engagement rate ${engRate}%, Conversion rate ${convRate}%. Provide detailed breakdown.`
        : prompt;
    try {
      const res = await fetch('/api/influencers/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: activeTool, prompt: fullPrompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
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
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">CAMPAIGN DETAILS</p><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="Describe your product, campaign goals, target audience, budget, and preferred content format..." className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" /></div>
          <button onClick={generate} disabled={generating || !prompt.trim()} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#ec4899' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...</span> : 'GENERATE CAMPAIGN BRIEF'}</button>
        </div>
      )}

      {activeTool === 'roi' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">CAMPAIGN INPUTS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
              <div><label className="text-[10px] text-gray-500 block mb-1">Campaign Budget ($)</label><input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full input-field rounded-xl px-4 py-3 text-base" /></div>
              <div><label className="text-[10px] text-gray-500 block mb-1">Est. Reach</label><input type="number" value={reach} onChange={e => setReach(e.target.value)} className="w-full input-field rounded-xl px-4 py-3 text-base" /></div>
              <div><label className="text-[10px] text-gray-500 block mb-1">Engagement Rate (%)</label><input type="number" value={engRate} onChange={e => setEngRate(e.target.value)} className="w-full input-field rounded-xl px-4 py-3 text-base" /></div>
              <div><label className="text-[10px] text-gray-500 block mb-1">Conversion Rate (%)</label><input type="number" value={convRate} onChange={e => setConvRate(e.target.value)} className="w-full input-field rounded-xl px-4 py-3 text-base" /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[{ label: 'Est. Impressions', val: Number(reach).toLocaleString() }, { label: 'Est. Engagements', val: Math.round(Number(reach) * Number(engRate) / 100).toLocaleString() }, { label: 'Est. Conversions', val: Math.round(Number(reach) * Number(engRate) / 100 * Number(convRate) / 100).toLocaleString() }, { label: 'Cost / Conversion', val: `$${(Number(budget) / Math.max(1, Number(reach) * Number(engRate) / 100 * Number(convRate) / 100)).toFixed(2)}` }].map((s, i) => (<div key={i} className="panel rounded-lg p-3 sm:p-5 text-center"><p className="hud-label text-[11px] mb-1">{s.label}</p><p className="text-lg font-bold text-pink-400 font-mono">{s.val}</p></div>))}</div>
          <button onClick={generate} disabled={generating} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#ec4899' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />CALCULATING...</span> : 'CALCULATE FULL ROI'}</button>
        </div>
      )}

      {output && <div className="mt-6 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-pink-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#f472b6' : '#4ade80' }}>{generating ? 'PROCESSING...' : 'COMPLETE'}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse" />}</pre></div></div>}
      </ModuleWrapper>
    </div>
  );
}

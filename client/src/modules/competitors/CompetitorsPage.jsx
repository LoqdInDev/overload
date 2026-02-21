import { useState } from 'react';

const TOOLS = [
  { id: 'ad-spy', name: 'Ad Spy', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'content', name: 'Content Analysis', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { id: 'seo', name: 'SEO Comparison', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 'swot', name: 'SWOT Generator', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { id: 'pricing', name: 'Pricing Monitor', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const TEMPLATES = {
  'ad-spy': [{ name: 'Facebook Ad Analysis', prompt: 'Analyze competitor Facebook ad strategy' }, { name: 'Google Ad Review', prompt: 'Analyze competitor Google Ads keywords and copy' }, { name: 'Social Ad Audit', prompt: 'Full social media advertising audit' }, { name: 'Video Ad Breakdown', prompt: 'Analyze competitor video ad creative approach' }],
  'swot': [{ name: 'Direct Competitor', prompt: 'Full SWOT of a direct competitor' }, { name: 'Market Leader', prompt: 'SWOT analysis of the market leader' }, { name: 'Emerging Threat', prompt: 'SWOT of an emerging competitor' }, { name: 'Niche Player', prompt: 'SWOT of a niche competitor' }],
};

const DEPTHS = ['Quick Scan', 'Standard', 'Deep Dive'];

export default function CompetitorsPage() {
  const [activeTool, setActiveTool] = useState(null);
  const [competitorName, setCompetitorName] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [myCompany, setMyCompany] = useState('');
  const [depth, setDepth] = useState('Standard');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const generate = async () => {
    setGenerating(true); setOutput('');
    const fullPrompt = `[Tool: ${activeTool}] [Depth: ${depth}] [Competitor: ${competitorName}${competitorUrl ? ` (${competitorUrl})` : ''}]${myCompany ? ` [My Company: ${myCompany}]` : ''}\n\n${prompt || `Perform a ${depth.toLowerCase()} ${TOOLS.find(t => t.id === activeTool)?.name} for ${competitorName}`}`;
    try {
      const res = await fetch('/api/competitors/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: activeTool, prompt: fullPrompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  if (!activeTool) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#ef4444' }}>COMPETITOR INTEL</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Competitor Intelligence</h1><p className="text-base text-gray-500">AI-powered competitive analysis, ad spying, and market intelligence</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
        {TOOLS.map(t => (<button key={t.id} onClick={() => setActiveTool(t.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-center group"><div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.12)' }}><svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg></div><p className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p></button>))}
      </div>
    </div>
  );

  const templates = TEMPLATES[activeTool] || TEMPLATES['swot'];
  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveTool(null); setOutput(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div><p className="hud-label text-[11px]" style={{ color: '#ef4444' }}>{TOOLS.find(t => t.id === activeTool)?.name?.toUpperCase()}</p><h2 className="text-lg font-bold text-white">{TOOLS.find(t => t.id === activeTool)?.name}</h2></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">TEMPLATES</p><div className="grid grid-cols-2 gap-3">{templates.map(t => (<button key={t.name} onClick={() => setPrompt(t.prompt)} className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${prompt === t.prompt ? 'border-red-500/30 bg-red-500/8 text-red-300' : 'border-indigo-500/8 text-gray-400 hover:text-gray-200'}`}><p className="font-semibold">{t.name}</p></button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">COMPETITOR INFO</p><div className="space-y-4"><input value={competitorName} onChange={e => setCompetitorName(e.target.value)} placeholder="Competitor name" className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" /><input value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} placeholder="Competitor website URL (optional)" className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" /><input value={myCompany} onChange={e => setMyCompany(e.target.value)} placeholder="Your company (for comparison)" className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" /></div></div>
          <button onClick={generate} disabled={generating || !competitorName.trim()} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#ef4444' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />ANALYZING...</span> : 'ANALYZE COMPETITOR'}</button>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">ANALYSIS DEPTH</p><div className="space-y-1.5">{DEPTHS.map(d => (<button key={d} onClick={() => setDepth(d)} className={`w-full chip text-xs justify-center ${depth === d ? 'active' : ''}`} style={depth === d ? { background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' } : {}}>{d}</button>))}</div></div>
        </div>
      </div>
      {output && <div className="mt-6 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#f87171' : '#4ade80' }}>{generating ? 'ANALYZING...' : 'ANALYSIS COMPLETE'}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-red-400 ml-0.5 animate-pulse" />}</pre></div></div>}
    </div>
  );
}

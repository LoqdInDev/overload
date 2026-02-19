import { useState } from 'react';

const MOCK_ALLOCATIONS = [
  { id: 1, channel: 'Google Ads', budget: 12000, spent: 9840, roas: 4.2, status: 'active' },
  { id: 2, channel: 'Meta Ads', budget: 10000, spent: 8200, roas: 3.8, status: 'active' },
  { id: 3, channel: 'TikTok', budget: 8000, spent: 5600, roas: 2.9, status: 'active' },
  { id: 4, channel: 'Email', budget: 5000, spent: 4100, roas: 6.1, status: 'active' },
  { id: 5, channel: 'SEO', budget: 6200, spent: 5400, roas: 5.3, status: 'active' },
  { id: 6, channel: 'Affiliates', budget: 4000, spent: 2100, roas: 3.5, status: 'active' },
];

const AI_TEMPLATES = [
  { name: 'Optimize Budget Split', prompt: 'Analyze current channel performance and recommend an optimized budget allocation to maximize overall ROAS' },
  { name: 'ROAS Improvement Plan', prompt: 'Create a detailed plan to improve ROAS across underperforming channels with specific tactical recommendations' },
  { name: 'Channel Performance Analysis', prompt: 'Provide a comprehensive performance analysis of each marketing channel with benchmarks and trends' },
  { name: 'Budget Forecast', prompt: 'Generate a 90-day budget forecast with projected spend, revenue, and ROAS by channel' },
];

export default function BudgetOptimizerPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/budget-optimizer/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const totalBudget = MOCK_ALLOCATIONS.reduce((sum, a) => sum + a.budget, 0);
  const totalSpent = MOCK_ALLOCATIONS.reduce((sum, a) => sum + a.spent, 0);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 animate-fade-in"><p className="hud-label mb-2" style={{ color: '#059669' }}>BUDGET OPTIMIZER</p><h1 className="text-2xl font-bold text-white mb-1">Budget Optimizer</h1><p className="text-sm text-gray-500">Optimize spend across channels for maximum ROAS</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[{ l: 'TOTAL BUDGET', v: '$45.2K' }, { l: 'ACTIVE CHANNELS', v: '6' }, { l: 'BEST ROAS', v: '4.2x' }, { l: 'BUDGET USED', v: '78%' }].map((s, i) => (<div key={i} className="panel rounded-xl p-4"><p className="hud-label mb-1">{s.l}</p><p className="text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex gap-1 mb-4">
        {['overview', 'allocations', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(5,150,105,0.15)', borderColor: 'rgba(5,150,105,0.3)', color: '#34d399' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'overview' && (<div className="space-y-3 animate-fade-in">{MOCK_ALLOCATIONS.map(a => { const pct = Math.round((a.spent / a.budget) * 100); return (<div key={a.id} className="panel rounded-xl p-4"><div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold text-gray-200">{a.channel}</p><span className="text-sm font-bold font-mono" style={{ color: '#34d399' }}>{a.roas}x ROAS</span></div><div className="w-full h-1.5 rounded-full bg-white/5 mb-1.5"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? '#f87171' : '#059669' }} /></div><div className="flex justify-between text-[10px] text-gray-500"><span>${a.spent.toLocaleString()} / ${a.budget.toLocaleString()}</span><span>{pct}% used</span></div></div>); })}</div>)}
      {tab === 'allocations' && (<div className="panel rounded-xl overflow-hidden animate-fade-in"><div className="divide-y divide-indigo-500/[0.04]"><div className="flex items-center gap-4 px-4 py-2 text-[10px] text-gray-500 font-semibold uppercase"><span className="flex-1">Channel</span><span className="w-20 text-right">Budget</span><span className="w-20 text-right">Spent</span><span className="w-16 text-right">ROAS</span><span className="w-16 text-right">Share</span></div>{MOCK_ALLOCATIONS.map(a => (<div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors"><span className="flex-1 text-xs font-semibold text-gray-300">{a.channel}</span><span className="w-20 text-right text-xs text-gray-400 font-mono">${a.budget.toLocaleString()}</span><span className="w-20 text-right text-xs text-gray-400 font-mono">${a.spent.toLocaleString()}</span><span className="w-16 text-right text-xs font-bold font-mono" style={{ color: '#34d399' }}>{a.roas}x</span><span className="w-16 text-right text-xs text-gray-500 font-mono">{Math.round((a.budget / totalBudget) * 100)}%</span></div>))}<div className="flex items-center gap-4 px-4 py-3 border-t border-indigo-500/10"><span className="flex-1 text-xs font-bold text-gray-200">Total</span><span className="w-20 text-right text-xs font-bold text-gray-200 font-mono">${totalBudget.toLocaleString()}</span><span className="w-20 text-right text-xs font-bold text-gray-200 font-mono">${totalSpent.toLocaleString()}</span><span className="w-16" /><span className="w-16 text-right text-xs font-bold text-gray-200 font-mono">100%</span></div></div></div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 animate-fade-in"><div className="grid grid-cols-2 gap-2">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === t.name ? 'border-emerald-500/20' : ''}`}><p className="text-xs font-bold text-gray-300">{t.name}</p><p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-xl p-5"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label" style={{ color: '#34d399' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}

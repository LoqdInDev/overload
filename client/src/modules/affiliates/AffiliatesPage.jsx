import { useState } from 'react';

const MOCK_PROGRAMS = [
  { id: 1, name: 'Pro Plan Referral', type: 'percentage', rate: 25, affiliates: 48, revenue: 12400, status: 'active' },
  { id: 2, name: 'Course Affiliate', type: 'flat', rate: 50, affiliates: 23, revenue: 8200, status: 'active' },
  { id: 3, name: 'Seasonal Push', type: 'percentage', rate: 30, affiliates: 12, revenue: 3100, status: 'paused' },
];

const MOCK_AFFILIATES = [
  { id: 1, name: 'Alex Rivera', code: 'ALEX25', clicks: 1420, conversions: 89, revenue: 4250, status: 'active' },
  { id: 2, name: 'Jordan Lee', code: 'JORDAN20', clicks: 980, conversions: 54, revenue: 2700, status: 'active' },
  { id: 3, name: 'Sam Patel', code: 'SAM15', clicks: 670, conversions: 31, revenue: 1550, status: 'active' },
  { id: 4, name: 'Chris Morgan', code: 'CHRIS10', clicks: 340, conversions: 12, revenue: 600, status: 'inactive' },
];

const AI_TEMPLATES = [
  { name: 'Recruitment Email', prompt: 'Write a compelling affiliate recruitment email inviting potential partners to join our program' },
  { name: 'Program Terms', prompt: 'Generate comprehensive affiliate program terms and conditions' },
  { name: 'Welcome Onboarding', prompt: 'Write a welcome email for new affiliates with tips for success' },
  { name: 'Promotional Kit', prompt: 'Create a promotional toolkit guide with swipe copy, banner suggestions, and social media posts for affiliates' },
];

export default function AffiliatesPage() {
  const [tab, setTab] = useState('programs');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/affiliates/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 animate-fade-in"><p className="hud-label mb-2" style={{ color: '#22c55e' }}>AFFILIATE MANAGER</p><h1 className="text-2xl font-bold text-white mb-1">Affiliate Program</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[{ l: 'TOTAL AFFILIATES', v: '156' }, { l: 'TOTAL REVENUE', v: '$48.2K' }, { l: 'AVG COMMISSION', v: '12%' }, { l: 'ACTIVE PROGRAMS', v: '3' }].map((s, i) => (<div key={i} className="panel rounded-xl p-4"><p className="hud-label mb-1">{s.l}</p><p className="text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex gap-1 mb-4">
        {['programs', 'affiliates', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'programs' && (<div className="space-y-2 animate-fade-in">{MOCK_PROGRAMS.map(p => (<div key={p.id} className="panel rounded-xl p-4 flex items-center gap-4"><div className="flex-1"><p className="text-sm font-semibold text-gray-200">{p.name}</p><p className="text-[10px] text-gray-500 mt-0.5">{p.type === 'percentage' ? `${p.rate}% commission` : `$${p.rate} per sale`} &bull; {p.affiliates} affiliates</p></div><span className="text-sm font-bold text-emerald-400 font-mono">${p.revenue.toLocaleString()}</span><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{p.status}</span></div>))}</div>)}
      {tab === 'affiliates' && (<div className="panel rounded-xl overflow-hidden animate-fade-in"><div className="divide-y divide-indigo-500/[0.04]">{MOCK_AFFILIATES.map(a => (<div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors"><div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">{a.name.split(' ').map(n => n[0]).join('')}</div><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-300">{a.name}</p><p className="text-[10px] text-gray-500 font-mono">{a.code}</p></div><div className="text-right text-[10px] text-gray-500"><p>{a.clicks} clicks</p><p>{a.conversions} conv.</p></div><span className="text-sm font-bold text-emerald-400 font-mono">${a.revenue.toLocaleString()}</span></div>))}</div></div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 animate-fade-in"><div className="grid grid-cols-2 gap-2">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === t.name ? 'border-emerald-500/20' : ''}`}><p className="text-xs font-bold text-gray-300">{t.name}</p><p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-xl p-5"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label" style={{ color: '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}

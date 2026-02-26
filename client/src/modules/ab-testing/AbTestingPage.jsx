import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

const MOCK_TESTS = [
  { id: 1, name: 'Homepage Hero CTA', type: 'copy', status: 'running', variants: 3, lift: '+18.2%' },
  { id: 2, name: 'Checkout Flow Layout', type: 'creative', status: 'running', variants: 2, lift: '+7.5%' },
  { id: 3, name: 'Email Subject Lines', type: 'copy', status: 'completed', variants: 4, lift: '+22.1%' },
  { id: 4, name: 'Retargeting Audience Segments', type: 'audience', status: 'running', variants: 3, lift: '+9.8%' },
  { id: 5, name: 'Pricing Page Copy', type: 'copy', status: 'completed', variants: 2, lift: '+14.6%' },
  { id: 6, name: 'Ad Creative Variations', type: 'creative', status: 'paused', variants: 4, lift: '+3.2%' },
  { id: 7, name: 'Landing Page Hero Image', type: 'creative', status: 'running', variants: 3, lift: '+11.0%' },
  { id: 8, name: 'Cold Audience vs Warm', type: 'audience', status: 'running', variants: 3, lift: '+5.9%' },
];

const MOCK_RESULTS = [
  { test: 'Homepage Hero CTA', winner: 'Variant B', confidence: '96%', lift: '+18.2%', conversions: '1,240', sampleSize: '12,400' },
  { test: 'Email Subject Lines', winner: 'Variant C', confidence: '99%', lift: '+22.1%', conversions: '890', sampleSize: '8,200' },
  { test: 'Pricing Page Copy', winner: 'Variant A', confidence: '94%', lift: '+14.6%', conversions: '560', sampleSize: '5,600' },
];

const AI_TEMPLATES = [
  { name: 'Generate Test Hypothesis', prompt: 'Generate a data-driven A/B test hypothesis with expected outcome and metrics to track' },
  { name: 'Suggest Test Variants', prompt: 'Suggest creative test variants with differentiated messaging angles and design approaches' },
  { name: 'Analyze Test Results', prompt: 'Analyze A/B test results and provide statistical significance assessment with actionable insights' },
  { name: 'Winner Scaling Plan', prompt: 'Create a scaling plan for the winning test variant including rollout strategy and next test ideas' },
];

export default function AbTestingPage() {
  usePageTitle('A/B Testing');
  const [tab, setTab] = useState('tests');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/ab-testing/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const typeColors = { copy: 'text-pink-400 bg-pink-500/10 border-pink-500/20', creative: 'text-purple-400 bg-purple-500/10 border-purple-500/20', audience: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  const statusColors = { running: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', completed: 'text-blue-400 bg-blue-500/10 border-blue-500/20', paused: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#f472b6' }}>A/B TESTING</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">A/B Test Manager</h1><p className="text-base text-gray-500">Run experiments, track variants, and find winning combinations</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'ACTIVE TESTS', v: '8' }, { l: 'TOTAL VARIANTS', v: '24' }, { l: 'AVG LIFT', v: '+12.3%' }, { l: 'WIN RATE', v: '67%' }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['tests', 'results', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.3)', color: '#f472b6' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'tests' && (<div className="space-y-3 animate-fade-in">{MOCK_TESTS.map(t => (<div key={t.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"><div className="flex-1 min-w-0"><p className="text-base font-semibold text-gray-200">{t.name}</p><p className="text-xs text-gray-500 mt-0.5">{t.variants} variants</p></div><div className="flex flex-wrap items-center gap-2 sm:gap-4"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColors[t.type]}`}>{t.type}</span><span className="text-base font-bold text-pink-400 font-mono">{t.lift}</span><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[t.status]}`}>{t.status}</span></div></div>))}</div>)}
      {tab === 'results' && (<div className="space-y-3 animate-fade-in">{MOCK_RESULTS.map((r, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2"><p className="text-base font-semibold text-gray-200">{r.test}</p><span className="text-base font-bold text-pink-400 font-mono">{r.lift}</span></div><div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-6 text-xs text-gray-500"><span>Winner: <span className="text-gray-300 font-semibold">{r.winner}</span></span><span>Confidence: <span className="text-emerald-400 font-semibold">{r.confidence}</span></span><span>Conversions: <span className="text-gray-300">{r.conversions}</span></span><span>Sample: <span className="text-gray-300">{r.sampleSize}</span></span></div></div>))}</div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-pink-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-pink-400 animate-pulse' : 'bg-pink-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#f472b6' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}

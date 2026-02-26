import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

const MOCK_AUDIENCES = [
  { id: 1, name: 'High-Value Purchasers', platform: 'Meta', type: 'custom', size: '45K', status: 'active' },
  { id: 2, name: 'Cart Abandoners 30d', platform: 'Google', type: 'custom', size: '120K', status: 'active' },
  { id: 3, name: 'Top 1% Spenders LAL', platform: 'Meta', type: 'lookalike', size: '680K', status: 'active' },
  { id: 4, name: 'Email Engagers LAL', platform: 'Meta', type: 'lookalike', size: '520K', status: 'active' },
  { id: 5, name: 'Fitness Enthusiasts', platform: 'TikTok', type: 'interest', size: '1.2M', status: 'active' },
  { id: 6, name: 'Website Visitors 7d', platform: 'Google', type: 'custom', size: '28K', status: 'active' },
  { id: 7, name: 'Purchaser LAL 3%', platform: 'TikTok', type: 'lookalike', size: '890K', status: 'paused' },
  { id: 8, name: 'Newsletter Subscribers', platform: 'Meta', type: 'custom', size: '65K', status: 'active' },
];

const MOCK_SEGMENTS = [
  { name: 'New Customers (0-30d)', count: '2,400', trend: '+12%' },
  { name: 'Repeat Buyers (2+ orders)', count: '8,900', trend: '+5%' },
  { name: 'High AOV ($100+)', count: '3,200', trend: '+8%' },
  { name: 'At Risk (90d no purchase)', count: '1,800', trend: '-3%' },
  { name: 'VIP (Top 5% LTV)', count: '450', trend: '+2%' },
  { name: 'Email Engaged (30d)', count: '12,600', trend: '+15%' },
];

const AI_TEMPLATES = [
  { name: 'Build Custom Audience', prompt: 'Design a custom audience strategy based on customer behavior signals and purchase patterns for maximum conversion potential' },
  { name: 'Generate Lookalike Strategy', prompt: 'Create a lookalike audience expansion strategy with seed audience recommendations and percentage tiers' },
  { name: 'Audience Overlap Analysis', prompt: 'Analyze potential audience overlap between segments and recommend consolidation or exclusion strategies' },
  { name: 'Targeting Recommendations', prompt: 'Provide targeting recommendations for each stage of the funnel with audience layering strategies' },
];

export default function AudienceBuilderPage() {
  usePageTitle('Audience Builder');
  const [tab, setTab] = useState('audiences');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/audience-builder/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const platformColors = { Meta: 'text-blue-400 bg-blue-500/10 border-blue-500/20', Google: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', TikTok: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
  const typeLabels = { custom: 'Custom', lookalike: 'Lookalike', interest: 'Interest' };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8 animate-fade-in"><div><p className="hud-label text-[11px] mb-2" style={{ color: '#8b5cf6' }}>AUDIENCE BUILDER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Audience Builder</h1><p className="text-base text-gray-500">Build, manage, and optimize audiences across platforms</p></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'TOTAL AUDIENCES', v: '12' }, { l: 'TOTAL REACH', v: '2.4M' }, { l: 'SEGMENTS', v: '34' }, { l: 'LOOKALIKES', v: '8' }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['audiences', 'segments', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'audiences' && (<div className="space-y-3 animate-fade-in">{MOCK_AUDIENCES.map(a => (<div key={a.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"><div className="flex-1 min-w-0"><p className="text-base font-semibold text-gray-200">{a.name}</p><p className="text-xs text-gray-500 mt-0.5">{typeLabels[a.type]} &bull; {a.size} reach</p></div><div className="flex flex-wrap items-center gap-2"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${platformColors[a.platform]}`}>{a.platform}</span><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{a.status}</span></div></div>))}</div>)}
      {tab === 'segments' && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">{MOCK_SEGMENTS.map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6 flex items-center gap-4 sm:gap-6"><div className="flex-1 min-w-0"><p className="text-base font-semibold text-gray-200">{s.name}</p><p className="text-xs text-gray-500 mt-0.5">{s.count} users</p></div><span className={`text-xs font-bold font-mono ${s.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{s.trend}</span></div>))}</div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-violet-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-violet-400 animate-pulse' : 'bg-violet-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#a78bfa' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}

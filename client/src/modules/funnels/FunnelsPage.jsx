import { useState } from 'react';

const FUNNEL_TYPES = [
  { id: 'product-launch', name: 'Product Launch', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
    stages: ['Teaser', 'Sales Page', 'Order Form', 'Upsell', 'Thank You'] },
  { id: 'lead-magnet', name: 'Lead Magnet', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
    stages: ['Landing', 'Opt-in', 'Thank You', 'Nurture', 'Offer'] },
  { id: 'webinar', name: 'Webinar', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    stages: ['Registration', 'Confirmation', 'Live Room', 'Replay', 'Offer'] },
  { id: 'ecommerce', name: 'E-commerce', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
    stages: ['Product', 'Cart', 'Checkout', 'Upsell', 'Confirmation'] },
  { id: 'saas', name: 'SaaS Trial', icon: 'M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
    stages: ['Landing', 'Sign Up', 'Onboarding', 'Trial', 'Convert'] },
  { id: 'membership', name: 'Membership', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
    stages: ['Sales Page', 'Checkout', 'Welcome', 'Content', 'Community'] },
];

const TEMPLATES = {
  'product-launch': [{ name: 'Digital Product', prompt: 'Build a digital product launch funnel with scarcity and urgency elements' }, { name: 'Course Launch', prompt: 'Build a course launch funnel with testimonials and bonuses' }, { name: 'App Launch', prompt: 'Build a SaaS app launch funnel with free trial CTA' }, { name: 'Physical Product', prompt: 'Build a physical product launch funnel with shipping offer' }],
  'lead-magnet': [{ name: 'Ebook Download', prompt: 'Build an ebook lead magnet funnel with compelling opt-in' }, { name: 'Free Tool', prompt: 'Build a free tool/calculator lead magnet funnel' }, { name: 'Checklist', prompt: 'Build a checklist/cheatsheet lead magnet funnel' }, { name: 'Mini Course', prompt: 'Build a free mini-course email funnel' }],
  'webinar': [{ name: 'Live Training', prompt: 'Build a live webinar registration funnel' }, { name: 'On-Demand', prompt: 'Build an on-demand/evergreen webinar funnel' }, { name: 'Challenge', prompt: 'Build a 5-day challenge funnel leading to webinar' }, { name: 'Masterclass', prompt: 'Build a free masterclass funnel with limited seats' }],
};

const INDUSTRIES = ['Tech', 'Health', 'Finance', 'Education', 'E-commerce', 'Agency', 'Real Estate', 'SaaS'];
const PRICE_POINTS = ['Free', '$1-50', '$50-200', '$200+'];
const URGENCY = ['Low', 'Medium', 'High'];

export default function FunnelsPage() {
  const [activeType, setActiveType] = useState(null);
  const [activeStage, setActiveStage] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [industry, setIndustry] = useState('Tech');
  const [price, setPrice] = useState('$50-200');
  const [urgency, setUrgency] = useState('Medium');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const generate = async () => {
    if (!activeType) return;
    const funnel = FUNNEL_TYPES.find(f => f.id === activeType);
    const stage = funnel?.stages[activeStage] || '';
    setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/funnels/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, prompt: `[Funnel: ${funnel?.name}] [Stage: ${stage}] [Industry: ${industry}] [Price: ${price}] [Urgency: ${urgency}]\n\n${prompt || `Generate compelling copy for the ${stage} page of a ${funnel?.name} funnel`}` }),
      });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  if (!activeType) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: '#7c3aed' }}>FUNNEL BUILDER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Choose your funnel type</h1>
        <p className="text-base text-gray-500">AI generates high-converting copy for every stage of your funnel</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger">
        {FUNNEL_TYPES.map(f => (
          <button key={f.id} onClick={() => setActiveType(f.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-left group">
            <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.12)' }}>
              <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={f.icon} /></svg>
            </div>
            <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors mb-2">{f.name}</p>
            <div className="flex gap-1 flex-wrap">{f.stages.map((s, i) => (<span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-gray-600 border border-white/[0.04]">{s}</span>))}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const funnel = FUNNEL_TYPES.find(f => f.id === activeType);
  const templates = TEMPLATES[activeType] || TEMPLATES['product-launch'];

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveType(null); setOutput(''); setPrompt(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div><p className="hud-label text-[11px]" style={{ color: '#7c3aed' }}>{funnel?.name?.toUpperCase()} FUNNEL</p><h2 className="text-lg font-bold text-white">{funnel?.name} Funnel Builder</h2></div>
      </div>

      {/* Funnel stages pipeline */}
      <div className="panel rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <p className="hud-label text-[11px] mb-3">FUNNEL STAGES</p>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {funnel?.stages.map((stage, i) => (
            <div key={i} className="flex items-center flex-shrink-0">
              <button onClick={() => setActiveStage(i)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${i === activeStage ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300' : 'border border-indigo-500/8 text-gray-500 hover:text-gray-300 hover:border-indigo-500/15'}`}>
                <span className="text-[10px] block opacity-50 mb-0.5">STEP {i + 1}</span>{stage}
              </button>
              {i < funnel.stages.length - 1 && <svg className="w-5 h-5 text-gray-700 mx-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">TEMPLATES</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{templates.map(t => (<button key={t.name} onClick={() => setPrompt(t.prompt)} className={`text-left px-4 py-3 rounded-lg border text-xs transition-all ${prompt === t.prompt ? 'border-violet-500/30 bg-violet-500/8 text-violet-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'}`}><p className="font-semibold">{t.name}</p><p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{t.prompt}</p></button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">CUSTOM BRIEF</p><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder={`Describe what you want for the ${funnel?.stages[activeStage]} page...`} className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" /></div>
          <button onClick={generate} disabled={generating} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#7c3aed', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(124,58,237,0.4)' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...</span> : `GENERATE ${funnel?.stages[activeStage]?.toUpperCase()} COPY`}</button>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">INDUSTRY</p><div className="grid grid-cols-2 gap-1.5">{INDUSTRIES.map(i => (<button key={i} onClick={() => setIndustry(i)} className={`chip text-[10px] justify-center ${industry === i ? 'active' : ''}`} style={industry === i ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>{i}</button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">PRICE POINT</p><div className="grid grid-cols-2 gap-1.5">{PRICE_POINTS.map(p => (<button key={p} onClick={() => setPrice(p)} className={`chip text-[10px] justify-center ${price === p ? 'active' : ''}`} style={price === p ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>{p}</button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">URGENCY LEVEL</p><div className="grid grid-cols-3 gap-1.5">{URGENCY.map(u => (<button key={u} onClick={() => setUrgency(u)} className={`chip text-[10px] justify-center ${urgency === u ? 'active' : ''}`} style={urgency === u ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>{u}</button>))}</div></div>
        </div>
      </div>
      {output && <div className="mt-6 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-violet-400" /><span className="hud-label text-[11px]" style={{ color: '#a78bfa' }}>{generating ? 'GENERATING...' : `${funnel?.stages[activeStage]} COPY READY`}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />}</pre></div></div>}
    </div>
  );
}

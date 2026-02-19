import { useState } from 'react';

const TOOLS = [
  { id: 'respond', name: 'Response Generator', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
  { id: 'request', name: 'Review Request', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { id: 'sentiment', name: 'Sentiment Analysis', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 'testimonial', name: 'Testimonial Formatter', icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' },
];

const TONES = ['Grateful', 'Professional', 'Empathetic', 'Solutions-Focused', 'Apologetic', 'Casual'];
const PLATFORMS = ['Google', 'Yelp', 'Trustpilot', 'Amazon', 'G2', 'App Store'];

const TEMPLATES = [
  { name: '5-Star Thank You', prompt: 'Write a warm thank-you response to a 5-star positive review', stars: 5 },
  { name: '4-Star Appreciation', prompt: 'Write an appreciative response to a 4-star review acknowledging the feedback', stars: 4 },
  { name: '3-Star Improvement', prompt: 'Write a constructive response to a 3-star mixed review', stars: 3 },
  { name: '2-Star Recovery', prompt: 'Write a recovery-focused response to a 2-star negative review', stars: 2 },
  { name: '1-Star Crisis', prompt: 'Write a professional crisis response to a 1-star very negative review', stars: 1 },
];

export default function ReviewsPage() {
  const [activeTool, setActiveTool] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [stars, setStars] = useState(5);
  const [platform, setPlatform] = useState('Google');
  const [tone, setTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const generate = async () => {
    setGenerating(true); setOutput('');
    const prompt = activeTool === 'respond'
      ? `[Platform: ${platform}] [Rating: ${stars} stars] [Tone: ${tone}]\n\nReview: "${reviewText}"\n\nGenerate a ${tone.toLowerCase()} response to this ${stars}-star ${platform} review.`
      : activeTool === 'request'
        ? `Generate a review request ${reviewText.includes('sms') || reviewText.includes('SMS') ? 'SMS' : 'email'} that encourages customers to leave a review on ${platform}. Tone: ${tone}.${reviewText ? `\n\nContext: ${reviewText}` : ''}`
        : activeTool === 'testimonial'
          ? `Format this review into a professional marketing testimonial:\n\n"${reviewText}"`
          : `Analyze the sentiment of these reviews and provide a breakdown:\n\n${reviewText}`;
    try {
      const res = await fetch('/api/reviews/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: activeTool, prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  if (!activeTool) return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 animate-fade-in"><p className="hud-label mb-2" style={{ color: '#eab308' }}>REVIEWS & REPUTATION</p><h1 className="text-2xl font-bold text-white mb-1">Reputation Management</h1><p className="text-sm text-gray-500">AI-powered review responses, sentiment analysis, and reputation tools</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 stagger">
        {[{ l: 'AVG RATING', v: '4.2', c: '#eab308' }, { l: 'TOTAL REVIEWS', v: '1,284', c: '#3b82f6' }, { l: 'RESPONSE RATE', v: '87%', c: '#22c55e' }, { l: 'SENTIMENT', v: '+72', c: '#a855f7' }].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4"><p className="hud-label mb-1">{s.l}</p><p className="text-2xl font-bold font-mono" style={{ color: s.c }}>{s.v}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {TOOLS.map(t => (<button key={t.id} onClick={() => setActiveTool(t.id)} className="panel-interactive rounded-xl p-5 text-center group"><div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.12)' }}><svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg></div><p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p></button>))}
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setActiveTool(null); setOutput(''); setReviewText(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div><p className="hud-label" style={{ color: '#eab308' }}>{TOOLS.find(t => t.id === activeTool)?.name?.toUpperCase()}</p><h2 className="text-lg font-bold text-white">{TOOLS.find(t => t.id === activeTool)?.name}</h2></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {activeTool === 'respond' && <div className="panel rounded-xl p-4"><p className="hud-label mb-3">QUICK TEMPLATES</p><div className="grid grid-cols-2 lg:grid-cols-3 gap-2">{TEMPLATES.map(t => (<button key={t.name} onClick={() => { setStars(t.stars); setReviewText(t.prompt); }} className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${reviewText === t.prompt ? 'border-yellow-500/30 bg-yellow-500/8 text-yellow-300' : 'border-indigo-500/8 text-gray-400 hover:text-gray-200'}`}><div className="flex gap-0.5 mb-1">{Array.from({ length: 5 }, (_, i) => (<span key={i} style={{ color: i < t.stars ? '#eab308' : '#374151' }}>&#9733;</span>))}</div><p className="font-semibold">{t.name}</p></button>))}</div></div>}
          <div className="panel rounded-xl p-4"><p className="hud-label mb-3">{activeTool === 'respond' ? 'PASTE REVIEW' : activeTool === 'sentiment' ? 'PASTE REVIEWS' : 'DESCRIBE YOUR NEEDS'}</p><textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={5} placeholder={activeTool === 'respond' ? 'Paste the customer review here...' : activeTool === 'sentiment' ? 'Paste multiple reviews (one per line or paragraph)...' : 'Describe what you need...'} className="w-full input-field rounded-lg px-4 py-3 text-sm resize-none" /></div>
          {activeTool === 'respond' && <div className="panel rounded-xl p-4"><p className="hud-label mb-3">STAR RATING</p><div className="flex gap-2">{[1,2,3,4,5].map(s => (<button key={s} onClick={() => setStars(s)} className="text-2xl transition-transform hover:scale-110" style={{ color: s <= stars ? '#eab308' : '#374151' }}>&#9733;</button>))}</div></div>}
          <button onClick={generate} disabled={generating || !reviewText.trim()} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#eab308', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(234,179,8,0.4)' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...</span> : 'GENERATE WITH AI'}</button>
        </div>
        <div className="space-y-4">
          <div className="panel rounded-xl p-4"><p className="hud-label mb-3">PLATFORM</p><div className="grid grid-cols-2 gap-1.5">{PLATFORMS.map(p => (<button key={p} onClick={() => setPlatform(p)} className={`chip text-[10px] justify-center ${platform === p ? 'active' : ''}`} style={platform === p ? { background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' } : {}}>{p}</button>))}</div></div>
          <div className="panel rounded-xl p-4"><p className="hud-label mb-3">TONE</p><div className="grid grid-cols-2 gap-1.5">{TONES.map(t => (<button key={t} onClick={() => setTone(t)} className={`chip text-[10px] justify-center ${tone === t ? 'active' : ''}`} style={tone === t ? { background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' } : {}}>{t}</button>))}</div></div>
        </div>
      </div>
      {output && <div className="mt-4 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label" style={{ color: generating ? '#facc15' : '#4ade80' }}>{generating ? 'GENERATING...' : 'RESPONSE READY'}</span></div><div className="panel rounded-xl p-5"><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-0.5 animate-pulse" />}</pre></div></div>}
    </div>
  );
}

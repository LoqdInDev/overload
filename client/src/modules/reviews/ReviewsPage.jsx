import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, connectSSE, postJSON } from '../../lib/api';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

const TOOLS = [
  { id: 'respond', name: 'Response Generator', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
  { id: 'request', name: 'Review Request', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { id: 'campaign', name: 'Campaign Builder', icon: 'M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18M5.25 6h.008v.008H5.25V6zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0h.008v.008H9.75V6zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z' },
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
  usePageTitle('Reviews & Reputation');
  const [activeTool, setActiveTool] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [stars, setStars] = useState(5);
  const [platform, setPlatform] = useState('Google');
  const [tone, setTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [responseData, setResponseData] = useState({});
  const [generatingResponseFor, setGeneratingResponseFor] = useState(null);
  const [campaignBusiness, setCampaignBusiness] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [campaignOutput, setCampaignOutput] = useState('');
  const [campaignLoading, setCampaignLoading] = useState(false);

  useEffect(() => {
    fetchJSON('/api/reviews/stats')
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load review stats:', err))
      .finally(() => setLoadingStats(false));
    fetchJSON('/api/reviews/reviews')
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const generate = () => {
    setGenerating(true); setOutput('');
    const prompt = activeTool === 'respond'
      ? `[Platform: ${platform}] [Rating: ${stars} stars] [Tone: ${tone}]\n\nReview: "${reviewText}"\n\nGenerate a ${tone.toLowerCase()} response to this ${stars}-star ${platform} review.`
      : activeTool === 'request'
        ? `Generate a review request ${reviewText.includes('sms') || reviewText.includes('SMS') ? 'SMS' : 'email'} that encourages customers to leave a review on ${platform}. Tone: ${tone}.${reviewText ? `\n\nContext: ${reviewText}` : ''}`
        : activeTool === 'testimonial'
          ? `Format this review into a professional marketing testimonial:\n\n"${reviewText}"`
          : `Analyze the sentiment of these reviews and provide a breakdown:\n\n${reviewText}`;
    connectSSE('/api/reviews/generate', { type: activeTool, prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  if (!activeTool) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <ModuleWrapper moduleId="reviews">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#eab308' }}>REVIEWS & REPUTATION</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Reputation Management</h1><p className="text-base text-gray-500">AI-powered review responses, sentiment analysis, and reputation tools</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'AVG RATING', v: loadingStats ? '—' : stats?.avgRating?.toFixed(1) ?? '—', c: '#eab308' }, { l: 'TOTAL REVIEWS', v: loadingStats ? '—' : stats?.total?.toLocaleString() ?? '—', c: '#3b82f6' }, { l: 'RESPONSE RATE', v: loadingStats ? '—' : stats?.pending != null && stats?.total ? `${Math.round(((stats.total - stats.pending) / stats.total) * 100)}%` : '—', c: '#22c55e' }, { l: 'SENTIMENT', v: loadingStats ? '—' : stats?.bySentiment?.positive != null ? `+${stats.bySentiment.positive}` : '—', c: '#a855f7' }].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold font-mono" style={{ color: s.c }}>{s.v}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 stagger">
        {TOOLS.map(t => (<button key={t.id} onClick={() => setActiveTool(t.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-center group"><div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.12)' }}><svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg></div><p className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p></button>))}
      </div>
      {/* Sentiment Analysis */}
      <div className="rounded-2xl overflow-hidden animate-fade-in my-4" style={{ background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.15)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: sentimentData ? '1px solid rgba(234,179,8,0.08)' : 'none' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234,179,8,0.12)' }}>
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sentiment Trend Analysis</p>
              <p className="text-xs text-gray-500">AI breakdown of review sentiment across your business</p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(234,179,8,0.12)', color: '#facc15', border: '1px solid rgba(234,179,8,0.22)' }}
            disabled={sentimentLoading}
            onClick={async () => {
              setSentimentLoading(true);
              try {
                const result = await postJSON('/api/reviews/analyze-sentiment', {
                  reviews: reviews,
                  business_name: ''
                });
                setSentimentData(result);
              } catch {}
              setSentimentLoading(false);
            }}>{sentimentLoading ? 'Analyzing...' : 'Analyze Sentiment'}</button>
        </div>
        {sentimentData && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[['Positive', sentimentData.positive_percent, '#22c55e', 'rgba(34,197,94,0.08)', 'rgba(34,197,94,0.15)'], ['Neutral', sentimentData.neutral_percent, '#94a3b8', 'rgba(148,163,184,0.08)', 'rgba(148,163,184,0.15)'], ['Negative', sentimentData.negative_percent, '#ef4444', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.15)']].map(([label, val, color, bg, border]) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="text-2xl font-black mb-0.5" style={{ color }}>{val}%</div>
                  <p className="hud-label text-[10px]">{label.toUpperCase()}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip text-xs">Trend: {sentimentData.trajectory}</span>
              {sentimentData.alert && <span className="chip text-xs" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}>⚠ {sentimentData.alert}</span>}
            </div>
            {sentimentData.trending_topics?.length > 0 && (
              <div>
                <p className="hud-label text-[10px] mb-2">TRENDING TOPICS</p>
                <div className="flex flex-wrap gap-1.5">
                  {sentimentData.trending_topics.map((t, i) => (
                    <span key={i} className="chip text-xs" style={{ borderColor: t.sentiment === 'positive' ? 'rgba(34,197,94,0.35)' : t.sentiment === 'negative' ? 'rgba(239,68,68,0.35)' : undefined, color: t.sentiment === 'positive' ? '#4ade80' : t.sentiment === 'negative' ? '#f87171' : undefined }}>
                      {t.topic} <span className="opacity-50">({t.mention_count}x)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sentimentData.summary && <p className="text-xs text-gray-500 leading-relaxed">{sentimentData.summary}</p>}
          </div>
        )}
      </div>

      {/* Reviews list with generate response */}
      {reviews.length > 0 && (
        <div className="panel animate-fade-in" style={{ marginTop: 16 }}>
          <div className="hud-label" style={{ marginBottom: 12 }}>Reviews ({reviews.length})</div>
          <div className="divide-y divide-indigo-500/[0.04]">
            {reviews.slice(0, 10).map(r => (
              <div key={r.id} style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      {r.rating && <span style={{ color: '#eab308' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>}
                      {r.author && <span style={{ fontSize: 11, color: '#6b7280' }}>{r.author}</span>}
                      {r.source && <span className="chip" style={{ fontSize: 10 }}>{r.source}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: '#d1d5db' }}>{r.content}</p>
                  </div>
                  <button className="chip text-[10px] flex-shrink-0" style={{ color: '#eab308', borderColor: 'rgba(234,179,8,0.3)' }}
                    disabled={generatingResponseFor === r.id}
                    onClick={async () => {
                      setGeneratingResponseFor(r.id);
                      try {
                        const result = await postJSON('/api/reviews/generate-response', {
                          review_text: r.content,
                          rating: r.rating,
                          business_name: ''
                        });
                        setResponseData(prev => ({ ...prev, [r.id]: result }));
                      } catch {}
                      setGeneratingResponseFor(null);
                    }}>{generatingResponseFor === r.id ? '...' : 'Generate Response'}</button>
                </div>
                {responseData[r.id] && (
                  <div style={{ marginTop: 8, padding: 10, background: 'rgba(234,179,8,0.05)', borderRadius: 6, borderLeft: '2px solid rgba(234,179,8,0.3)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span className="chip" style={{ fontSize: 10 }}>{responseData[r.id].tone}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.6 }}>{responseData[r.id].response}</p>
                    {responseData[r.id].tip && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Tip: {responseData[r.id].tip}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      </ModuleWrapper>
    </div>
  );

  if (activeTool === 'campaign') return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="reviews">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveTool(null); setCampaignOutput(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div><p className="hud-label text-[11px]" style={{ color: '#eab308' }}>CAMPAIGN BUILDER</p><h2 className="text-lg font-bold text-white">Review Request Campaign</h2></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="panel rounded-2xl p-4 sm:p-6 space-y-4">
            <p className="hud-label text-[11px]">BUSINESS DETAILS</p>
            <input value={campaignBusiness} onChange={e => setCampaignBusiness(e.target.value)} placeholder="Business name (e.g. Bloom Coffee Co.)" className="w-full input-field rounded-xl px-4 py-3 text-sm" />
            <input value={campaignType} onChange={e => setCampaignType(e.target.value)} placeholder="Business type (e.g. café, SaaS, dental clinic)" className="w-full input-field rounded-xl px-4 py-3 text-sm" />
          </div>
          <button
            disabled={campaignLoading || !campaignBusiness.trim()}
            onClick={() => {
              setCampaignLoading(true); setCampaignOutput('');
              connectSSE('/api/reviews/request-campaign', {
                business_name: campaignBusiness,
                business_type: campaignType,
                platform,
                tone,
              }, {
                onChunk: (t) => setCampaignOutput(p => p + t),
                onResult: (d) => { if (d?.content) setCampaignOutput(d.content); setCampaignLoading(false); },
                onError: () => setCampaignLoading(false),
                onDone: () => setCampaignLoading(false),
              });
            }}
            className="btn-accent w-full py-3 rounded-lg"
            style={{ background: campaignLoading ? '#1e1e2e' : '#eab308', boxShadow: campaignLoading ? 'none' : '0 4px 20px -4px rgba(234,179,8,0.4)' }}
          >{campaignLoading ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />BUILDING CAMPAIGN...</span> : 'BUILD REVIEW CAMPAIGN'}</button>
        </div>
        <div className="space-y-4">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">TARGET PLATFORM</p><div className="grid grid-cols-2 gap-1.5">{PLATFORMS.map(p => (<button key={p} onClick={() => setPlatform(p)} className={`chip text-xs justify-center ${platform === p ? 'active' : ''}`} style={platform === p ? { background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' } : {}}>{p}</button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">TONE</p><div className="grid grid-cols-2 gap-1.5">{TONES.map(t => (<button key={t} onClick={() => setTone(t)} className={`chip text-xs justify-center ${tone === t ? 'active' : ''}`} style={tone === t ? { background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' } : {}}>{t}</button>))}</div></div>
        </div>
      </div>
      {campaignOutput && (
        <div className="mt-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${campaignLoading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: campaignLoading ? '#facc15' : '#4ade80' }}>{campaignLoading ? 'BUILDING...' : 'CAMPAIGN READY'}</span></div>
            {!campaignLoading && <button onClick={() => { const blob = new Blob([campaignOutput], { type: 'text/markdown' }); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `review-campaign-${campaignBusiness.replace(/\s+/g, '-').toLowerCase()}.md`; a.click(); URL.revokeObjectURL(u); }} className="chip text-[10px] flex items-center gap-1.5 px-3 py-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Download</button>}
          </div>
          <div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{campaignOutput}{campaignLoading && <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-0.5 animate-pulse" />}</pre></div>
        </div>
      )}
      </ModuleWrapper>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="reviews">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveTool(null); setOutput(''); setReviewText(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div className="min-w-0"><p className="hud-label text-[11px]" style={{ color: '#eab308' }}>{TOOLS.find(t => t.id === activeTool)?.name?.toUpperCase()}</p><h2 className="text-lg sm:text-xl font-bold text-white truncate">{TOOLS.find(t => t.id === activeTool)?.name}</h2></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {activeTool === 'respond' && <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">QUICK TEMPLATES</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{TEMPLATES.map(t => (<button key={t.name} onClick={() => { setStars(t.stars); setReviewText(t.prompt); }} className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${reviewText === t.prompt ? 'border-yellow-500/30 bg-yellow-500/8 text-yellow-300' : 'border-indigo-500/8 text-gray-400 hover:text-gray-200'}`}><div className="flex flex-wrap gap-0.5 mb-1">{Array.from({ length: 5 }, (_, i) => (<span key={i} style={{ color: i < t.stars ? '#eab308' : '#374151' }}>&#9733;</span>))}</div><p className="font-semibold">{t.name}</p></button>))}</div></div>}
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">{activeTool === 'respond' ? 'PASTE REVIEW' : activeTool === 'sentiment' ? 'PASTE REVIEWS' : 'DESCRIBE YOUR NEEDS'}</p><textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={5} placeholder={activeTool === 'respond' ? 'Paste the customer review here...' : activeTool === 'sentiment' ? 'Paste multiple reviews (one per line or paragraph)...' : 'Describe what you need...'} className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" /></div>
          {activeTool === 'respond' && <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">STAR RATING</p><div className="flex flex-wrap gap-3">{[1,2,3,4,5].map(s => (<button key={s} onClick={() => setStars(s)} className="text-2xl transition-transform hover:scale-110" style={{ color: s <= stars ? '#eab308' : '#374151' }}>&#9733;</button>))}</div></div>}
          <button onClick={generate} disabled={generating || !reviewText.trim()} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#eab308', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(234,179,8,0.4)' }}>{generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...</span> : 'GENERATE WITH AI'}</button>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">PLATFORM</p><div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">{PLATFORMS.map(p => (<button key={p} onClick={() => setPlatform(p)} className={`chip text-xs justify-center ${platform === p ? 'active' : ''}`} style={platform === p ? { background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' } : {}}>{p}</button>))}</div></div>
          <div className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-3">TONE</p><div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">{TONES.map(t => (<button key={t} onClick={() => setTone(t)} className={`chip text-xs justify-center ${tone === t ? 'active' : ''}`} style={tone === t ? { background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' } : {}}>{t}</button>))}</div></div>
        </div>
      </div>
      {output && <div className="mt-6 animate-fade-up"><div className="flex flex-wrap items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full shrink-0 ${generating ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#facc15' : '#4ade80' }}>{generating ? 'GENERATING...' : 'RESPONSE READY'}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed break-words">{output}{generating && <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-0.5 animate-pulse" />}</pre></div></div>}
      </ModuleWrapper>
    </div>
  );
}

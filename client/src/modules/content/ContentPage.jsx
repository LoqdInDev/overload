import { useState, useRef, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { connectSSE, fetchJSON, deleteJSON, postJSON } from '../../lib/api';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

const CONTENT_TYPES = [
  { id: 'blog', name: 'Blog Post', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { id: 'adcopy', name: 'Ad Copy', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { id: 'product', name: 'Product Desc', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'social', name: 'Social Post', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { id: 'email', name: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

const TONES = ['Professional', 'Casual', 'Witty', 'Bold', 'Empathetic', 'Urgent'];

const TEMPLATES = {
  blog: [
    { name: 'How-To Guide', prompt: 'Write a step-by-step how-to guide about ' },
    { name: 'Listicle', prompt: 'Write a listicle of the top 10 ' },
    { name: 'Industry Analysis', prompt: 'Write an in-depth analysis of trends in ' },
    { name: 'Product Review', prompt: 'Write a detailed product review comparing ' },
  ],
  adcopy: [
    { name: 'Product Launch', prompt: 'Write compelling ad copy to launch a new product: ' },
    { name: 'Seasonal Sale', prompt: 'Write urgency-driven ad copy for a seasonal sale on ' },
    { name: 'Brand Awareness', prompt: 'Write memorable brand awareness ad copy for ' },
    { name: 'App Install', prompt: 'Write ad copy that drives app installs for ' },
  ],
  product: [
    { name: 'Premium Product', prompt: 'Write a luxury-feeling product description for ' },
    { name: 'Tech Gadget', prompt: 'Write a features-driven product description for ' },
    { name: 'Fashion Item', prompt: 'Write a lifestyle-focused product description for ' },
    { name: 'Food & Beverage', prompt: 'Write a sensory product description for ' },
  ],
  social: [
    { name: 'Product Announcement', prompt: 'Write social media posts announcing the launch of ' },
    { name: 'Behind the Scenes', prompt: 'Write behind-the-scenes social posts for ' },
    { name: 'User Testimonial', prompt: 'Write social posts highlighting customer success with ' },
    { name: 'Educational Tip', prompt: 'Write educational social media tips about ' },
  ],
  email: [
    { name: 'Welcome Sequence', prompt: 'Write a 3-part welcome email sequence for new subscribers of ' },
    { name: 'Abandoned Cart', prompt: 'Write a persuasive abandoned cart email for ' },
    { name: 'Product Launch', prompt: 'Write a product launch email announcement for ' },
    { name: 'Re-engagement', prompt: 'Write a re-engagement email for inactive users of ' },
  ],
};

export default function ContentPage() {
  usePageTitle('AI Content');
  const [activeType, setActiveType] = useState(null);
  const [tone, setTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [copied, setCopied] = useState(false);
  const [wordTarget, setWordTarget] = useState('800');
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('generate');

  const cancelRef = useRef(null);
  const [contentScore, setContentScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [repurposed, setRepurposed] = useState('');
  const [repurposeLoading, setRepurposeLoading] = useState(false);
  const [showRepurpose, setShowRepurpose] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const loadHistory = () => {
    fetchJSON('/api/content/projects').then(data => { if (Array.isArray(data)) setHistory(data); }).catch(() => {});
  };

  useEffect(() => { loadHistory(); }, []);

  // Auto-analyze with AI when generation completes
  useEffect(() => {
    if (result && activeType) {
      setAnalyzing(true);
      postJSON('/api/content/score', { content: result, content_type: activeType })
        .then(score => setContentScore(score))
        .catch(() => {})
        .finally(() => setAnalyzing(false));
    }
  }, [result, activeType]);

  const text = result || streamText;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Client-side quality scoring (instant)
  const quality = useMemo(() => {
    if (!text || text.length < 50) return null;
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const avgWordsPerSentence = sentences.length ? words.length / sentences.length : 0;
    const avgSentencesPerPara = paragraphs.length ? sentences.length / paragraphs.length : 0;
    const hasHeaders = /^#{1,3}\s|^\*\*[^*]+\*\*/m.test(text);
    const hasLists = /^[-*•]\s|^\d+\.\s/m.test(text);
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
    const lexicalDiversity = words.length ? (uniqueWords.size / words.length) * 100 : 0;

    const targetWords = parseInt(wordTarget) || 800;
    const lengthRatio = Math.min(words.length / targetWords, 1.2);
    let seo = Math.round(Math.min(lengthRatio * 55 + (hasHeaders ? 18 : 0) + (hasLists ? 12 : 0) + Math.min(paragraphs.length * 2, 15), 100));

    let readability = 80;
    if (avgWordsPerSentence > 25) readability -= Math.min((avgWordsPerSentence - 25) * 2, 30);
    if (avgWordsPerSentence < 8) readability -= 10;
    if (avgSentencesPerPara > 8) readability -= 10;
    readability = Math.round(Math.max(Math.min(readability + (hasHeaders ? 8 : 0) + (hasLists ? 7 : 0), 100), 20));

    const ctaWords = /\b(try|get|start|discover|learn|join|sign up|click|download|buy|free)\b/gi;
    const ctaCount = (text.match(ctaWords) || []).length;
    let engagement = Math.round(Math.min(lexicalDiversity * 1.1 + ctaCount * 3 + (hasHeaders ? 8 : 0) + (paragraphs.length > 2 ? 8 : 0), 100));

    const avg = (seo + readability + engagement) / 3;
    const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F';

    const tips = [];
    if (!hasHeaders) tips.push('Add headings to improve structure');
    if (!hasLists) tips.push('Add bullet points or lists');
    if (words.length < targetWords * 0.6) tips.push('Content is shorter than target length');
    if (avgWordsPerSentence > 25) tips.push('Shorten some sentences for readability');
    if (ctaCount === 0) tips.push('Add a call-to-action');

    return { seo, readability, engagement, grade, avg, tips };
  }, [text, wordTarget]);

  const generate = () => {
    if (!prompt.trim() || !activeType) return;
    setGenerating(true);
    setResult('');
    setStreamText('');
    setError(null);
    setContentScore(null);
    setShowInput(false);
    setShowRepurpose(false);
    setRepurposed('');
    const fullPrompt = `[Tone: ${tone}] [Target length: ~${wordTarget} words]\n\n${prompt}`;

    let fullText = '';
    cancelRef.current = connectSSE('/api/content/generate', { type: activeType, prompt: fullPrompt }, {
      onChunk: (t) => { fullText += t; setStreamText(fullText); },
      onResult: (data) => {
        const finalContent = data?.content || fullText;
        setResult(finalContent);
        setGenerating(false);
        loadHistory();
      },
      onError: (err) => {
        console.error('Generation error:', err);
        setError(typeof err === 'string' ? err : 'Failed to generate content. Please try again.');
        setGenerating(false);
        setShowInput(true);
      },
      onDone: () => {
        if (!result && fullText) setResult(fullText);
        setGenerating(false);
      },
    });
  };

  const cancelGeneration = () => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    setGenerating(false);
    setShowInput(true);
    if (streamText) setResult(streamText);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || streamText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectTemplate = (tmpl) => setPrompt(tmpl.prompt);

  const deleteHistoryItem = (id) => {
    deleteJSON(`/api/content/projects/${id}`).then(() => { loadHistory(); if (expandedId === id) setExpandedId(null); }).catch(() => {});
  };

  const copyHistoryItem = (item) => {
    navigator.clipboard.writeText(item.content || '');
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const useHistoryItem = (item) => {
    setActiveType(item.type || 'blog');
    setResult(item.content || '');
    setStreamText('');
    setShowInput(false);
  };

  const startRepurpose = () => {
    setRepurposed('');
    setRepurposeLoading(true);
    setShowRepurpose(true);
    connectSSE('/api/content/repurpose', { content: result, original_type: activeType }, {
      onChunk: (chunk) => setRepurposed(prev => prev + chunk),
      onResult: () => setRepurposeLoading(false),
      onError: () => setRepurposeLoading(false),
      onDone: () => setRepurposeLoading(false),
    });
  };

  // ────────────────────────────────────────────────────────
  //  LANDING SCREEN (no type selected)
  // ────────────────────────────────────────────────────────
  if (!activeType) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <ModuleWrapper moduleId="content">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: '#f97316' }}>AI CONTENT ENGINE</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">What do you want to write?</h1>
          <p className="text-base text-gray-500">Select a content type to get started with AI-powered generation</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button onClick={() => setActiveTab('generate')} className={`chip text-[10px] ${activeTab === 'generate' ? 'active' : ''}`} style={activeTab === 'generate' ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>Generate</button>
          <button onClick={() => { setActiveTab('history'); loadHistory(); }} className={`chip text-[10px] ${activeTab === 'history' ? 'active' : ''}`} style={activeTab === 'history' ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>History {history.length > 0 ? `(${history.length})` : ''}</button>
        </div>

        {activeTab === 'generate' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
              {CONTENT_TYPES.map(type => (
                <button key={type.id} onClick={() => setActiveType(type.id)}
                  className="panel-interactive rounded-2xl p-4 sm:p-7 text-center group">
                  <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.12)' }}>
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{type.name}</p>
                </button>
              ))}
            </div>

            <div className="mt-10">
              <div className="flex items-center gap-3 sm:gap-5 mb-4">
                <p className="hud-label text-[11px]">POPULAR TEMPLATES</p>
                <div className="flex-1 hud-line" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
                {Object.entries(TEMPLATES).flatMap(([type, tmpls]) =>
                  tmpls.slice(0, 1).map(t => {
                    const ct = CONTENT_TYPES.find(c => c.id === type);
                    return (
                      <button key={`${type}-${t.name}`} onClick={() => { setActiveType(type); setPrompt(t.prompt); }}
                        className="panel-interactive rounded-lg p-4 sm:p-6 text-left group">
                        <p className="hud-label text-[11px] mb-1.5" style={{ color: '#f97316' }}>{ct?.name}</p>
                        <p className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{t.prompt}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="panel rounded-2xl overflow-hidden">
            {history.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No saved content yet. Generate something to see it here.</div>
            ) : (
              <div className="divide-y divide-indigo-500/[0.04]">
                {history.map(item => {
                  const ct = CONTENT_TYPES.find(c => c.id === item.type);
                  const displayTitle = item.title || (item.content || '').slice(0, 80) || 'Untitled';
                  const isExpanded = expandedId === item.id;
                  return (
                    <div key={item.id} className="group">
                      <div
                        className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.08)' }}>
                          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={ct?.icon || CONTENT_TYPES[0].icon} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-200 truncate">{displayTitle}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="hud-label text-[10px]" style={{ color: '#f97316' }}>{ct?.name || item.type}</span>
                            <span className="text-[10px] text-gray-600">{item.created_at ? item.created_at.slice(0, 10) : ''}</span>
                            {item.content && <span className="text-[10px] text-gray-600">{item.content.split(/\s+/).filter(Boolean).length} words</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity chip text-[10px] text-red-400 border-red-500/20 hover:bg-red-500/10"
                          >Delete</button>
                        </div>
                      </div>
                      {isExpanded && item.content && (
                        <div className="px-6 pb-5 animate-fade-in">
                          <div className="bg-black/40 rounded-xl p-4 sm:p-6 max-h-[50vh] overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-3" style={{ borderLeft: '2px solid rgba(249,115,22,0.3)' }}>
                            {item.content}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => copyHistoryItem(item)} className="chip text-[10px]"
                              style={copiedId === item.id ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)' } : { color: '#fb923c', borderColor: 'rgba(249,115,22,0.3)' }}>
                              {copiedId === item.id ? 'Copied!' : 'Copy Content'}
                            </button>
                            <button onClick={() => useHistoryItem(item)} className="chip text-[10px]"
                              style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)' }}>
                              Use This
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </ModuleWrapper>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  //  GENERATOR SCREEN (type selected)
  // ────────────────────────────────────────────────────────
  const currentType = CONTENT_TYPES.find(t => t.id === activeType);
  const templates = TEMPLATES[activeType] || [];
  const hasOutput = !!result || generating;

  // Use AI scores when available, fall back to client-side
  const displayScores = contentScore
    ? { seo: contentScore.seo, readability: contentScore.readability, engagement: contentScore.engagement, grade: contentScore.overall_grade, avg: ((contentScore.seo || 0) + (contentScore.readability || 0) + (contentScore.engagement || 0)) / 3 }
    : quality
    ? { seo: quality.seo, readability: quality.readability, engagement: quality.engagement, grade: quality.grade, avg: quality.avg }
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="content">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveType(null); setResult(''); setStreamText(''); setPrompt(''); setShowInput(true); setContentScore(null); setShowRepurpose(false); setRepurposed(''); }}
          className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="hud-label text-[11px]" style={{ color: '#f97316' }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Create {currentType?.name}</h2>
        </div>
        {/* Compact config chips in header when input is hidden */}
        {!showInput && result && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="chip text-[9px] pointer-events-none" style={{ color: '#fb923c', borderColor: 'rgba(249,115,22,0.2)' }}>{tone}</span>
            <span className="chip text-[9px] pointer-events-none" style={{ color: '#fb923c', borderColor: 'rgba(249,115,22,0.2)' }}>~{wordTarget}w</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ── Left: Main content area ── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">

          {/* Input section — visible before generation, toggleable after */}
          {showInput && !generating && (
            <div className="space-y-4 animate-fade-in">
              {/* Template chips (compact horizontal) */}
              <div>
                <p className="hud-label text-[11px] mb-2">TEMPLATES</p>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map(t => (
                    <button key={t.name} onClick={() => selectTemplate(t)}
                      className={`chip text-[10px] ${prompt === t.prompt ? 'active' : ''}`}
                      style={prompt === t.prompt ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brief */}
              <div className="panel rounded-2xl p-4 sm:p-5">
                <p className="hud-label text-[11px] mb-2">YOUR BRIEF</p>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                  placeholder="Describe exactly what you want. Include topic, key points, target audience, and any specific requirements..."
                  className="w-full input-field rounded-xl px-4 py-3 text-sm resize-none" />
              </div>

              {/* Generate */}
              <button onClick={generate} disabled={generating || !prompt.trim()}
                className="btn-accent w-full py-3 rounded-lg font-bold text-sm tracking-wide"
                style={{ background: !prompt.trim() ? '#1e1e2e' : '#f97316', boxShadow: !prompt.trim() ? 'none' : '0 4px 20px -4px rgba(249,115,22,0.4)' }}>
                GENERATE CONTENT
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="panel rounded-xl p-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-red-400 flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
              </div>
            </div>
          )}

          {/* Streaming output */}
          {generating && (
            <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="hud-label text-[11px]" style={{ color: '#f97316' }}>GENERATING</span>
                </div>
                <button onClick={cancelGeneration}
                  className="chip text-[10px]" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.25)' }}>
                  <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop
                </button>
              </div>
              <div className="bg-black/50 rounded-lg p-4 sm:p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {streamText}<span className="inline-block w-[2px] h-4 bg-orange-400 ml-0.5 animate-pulse" />
              </div>
            </div>
          )}

          {/* Completed output */}
          {result && !generating && (
            <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>COMPLETE</span>
                  <span className="text-[10px] text-gray-600 font-mono">{wordCount} words</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={copyToClipboard} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => { setShowInput(true); }} className="chip text-[10px]">
                    Edit Brief
                  </button>
                  <button onClick={generate} className="chip text-[10px]">Regenerate</button>
                  <button onClick={startRepurpose} disabled={repurposeLoading}
                    className="chip text-[10px]" style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.25)' }}>
                    {repurposeLoading ? 'Repurposing...' : 'Repurpose'}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-black/50 rounded-lg p-4 sm:p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {result}
              </div>
            </div>
          )}

          {/* Repurpose output */}
          {showRepurpose && (repurposeLoading || repurposed) && (
            <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {repurposeLoading ? (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                  )}
                  <span className="hud-label text-[11px]" style={{ color: '#a78bfa' }}>
                    {repurposeLoading ? 'REPURPOSING' : 'REPURPOSED'}
                  </span>
                </div>
                {!repurposeLoading && (
                  <button onClick={() => { setShowRepurpose(false); setRepurposed(''); }} className="chip text-[10px]">Close</button>
                )}
              </div>
              <div className="bg-black/40 rounded-lg p-4 sm:p-6 max-h-[50vh] overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {repurposed}
                {repurposeLoading && <span className="inline-block w-[2px] h-4 bg-purple-400 ml-0.5 animate-pulse" />}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4 sm:space-y-5">
          {/* Tone */}
          <div className="panel rounded-2xl p-4 sm:p-5">
            <p className="hud-label text-[11px] mb-2.5">TONE</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={`chip text-[10px] justify-center ${tone === t ? 'active' : ''}`}
                  style={tone === t ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div className="panel rounded-2xl p-4 sm:p-5">
            <p className="hud-label text-[11px] mb-2.5">TARGET LENGTH</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['400', '800', '1200'].map(w => (
                <button key={w} onClick={() => setWordTarget(w)}
                  className={`chip text-[10px] justify-center ${wordTarget === w ? 'active' : ''}`}
                  style={wordTarget === w ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>
                  ~{w}w
                </button>
              ))}
            </div>
          </div>

          {/* Content Intelligence (unified: stats + quality + AI analysis) */}
          {hasOutput && (
            <div className="panel rounded-2xl p-4 sm:p-5 animate-fade-up">
              <p className="hud-label text-[11px] mb-3">CONTENT INTELLIGENCE</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-base font-bold text-white font-mono">{wordCount}</div>
                  <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Words</p>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-white font-mono">{text.length.toLocaleString()}</div>
                  <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Chars</p>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-orange-400">{tone}</div>
                  <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Tone</p>
                </div>
              </div>

              {/* Quality rings */}
              {displayScores && (
                <>
                  <div className="border-t border-gray-100 pt-3 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="hud-label text-[10px]">
                        {contentScore ? 'AI QUALITY SCORE' : 'QUALITY SCORE'}
                      </p>
                      {analyzing && (
                        <span className="flex items-center gap-1.5 text-[9px] text-gray-500">
                          <span className="w-2 h-2 border border-gray-600 border-t-orange-400 rounded-full animate-spin" />
                          Analyzing
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'SEO', value: displayScores.seo, color: displayScores.seo >= 70 ? '#4ade80' : displayScores.seo >= 50 ? '#fbbf24' : '#f87171' },
                        { label: 'Read', value: displayScores.readability, color: displayScores.readability >= 70 ? '#4ade80' : displayScores.readability >= 50 ? '#fbbf24' : '#f87171' },
                        { label: 'Engage', value: displayScores.engagement, color: displayScores.engagement >= 70 ? '#4ade80' : displayScores.engagement >= 50 ? '#fbbf24' : '#f87171' },
                        { label: 'Grade', value: displayScores.grade, color: displayScores.avg >= 70 ? '#4ade80' : displayScores.avg >= 50 ? '#fbbf24' : '#f87171', isGrade: true },
                      ].map(m => (
                        <div key={m.label} className="text-center">
                          <div className="relative w-full aspect-square max-w-[48px] mx-auto mb-1">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                              <circle cx="18" cy="18" r="15" fill="none" stroke={m.color} strokeWidth="3"
                                strokeDasharray={`${(m.isGrade ? displayScores.avg : m.value) * 0.9425} 94.25`}
                                strokeLinecap="round" className="transition-all duration-700" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: m.color }}>
                              {m.value}
                            </span>
                          </div>
                          <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI top issue */}
                  {contentScore?.top_issue && (
                    <div className="flex items-start gap-2 text-[11px] mb-2 px-1">
                      <svg className="w-3 h-3 text-blue-400/70 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      <span className="text-blue-300/80">{contentScore.top_issue}</span>
                    </div>
                  )}

                  {/* Tips */}
                  {quality && quality.tips.length > 0 && !contentScore && (
                    <div className="space-y-1 px-1">
                      {quality.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px]">
                          <svg className="w-2.5 h-2.5 text-amber-400/60 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <span className="text-gray-600">{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </ModuleWrapper>
    </div>
  );
}

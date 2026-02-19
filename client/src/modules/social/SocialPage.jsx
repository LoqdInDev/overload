import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const MODULE_COLOR = '#3b82f6';

const SOCIAL_TYPES = [
  { id: 'instagram', name: 'Instagram Post', icon: 'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z', desc: 'Visual-first captions & carousels' },
  { id: 'twitter', name: 'Twitter Thread', icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z', desc: 'Multi-tweet story threads' },
  { id: 'linkedin', name: 'LinkedIn Post', icon: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0', desc: 'Professional thought leadership' },
  { id: 'tiktok', name: 'TikTok Caption', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z', desc: 'Trendy short-form captions' },
  { id: 'facebook', name: 'Facebook Post', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', desc: 'Community engagement posts' },
];

const TEMPLATES = {
  instagram: [
    { name: 'Product Launch', prompt: 'Write an Instagram caption for a product launch. Include a hook, key features, CTA, and relevant hashtags. Make it visually descriptive.' },
    { name: 'Behind the Scenes', prompt: 'Write a behind-the-scenes Instagram caption showing our team/process. Keep it authentic, personal, and engaging.' },
    { name: 'Educational Tip', prompt: 'Write an educational carousel-style Instagram caption with numbered tips. Include a strong hook and save-worthy value.' },
    { name: 'User Testimonial', prompt: 'Write an Instagram caption showcasing a customer success story. Include the transformation, quote-style text, and social proof.' },
  ],
  twitter: [
    { name: 'Product Launch', prompt: 'Write a 5-tweet Twitter thread announcing a new product launch. Start with a hook tweet, build excitement, end with CTA.' },
    { name: 'Behind the Scenes', prompt: 'Write a Twitter thread sharing a behind-the-scenes story. Make it relatable and encourage engagement.' },
    { name: 'Educational Tip', prompt: 'Write a value-packed Twitter thread teaching something useful. Use numbered points, examples, and a strong opener.' },
    { name: 'User Testimonial', prompt: 'Write a Twitter thread sharing a customer success story with real results. Include metrics and takeaways.' },
  ],
  linkedin: [
    { name: 'Product Launch', prompt: 'Write a LinkedIn post announcing a product launch. Professional tone, highlight business value, include a CTA.' },
    { name: 'Behind the Scenes', prompt: 'Write a LinkedIn post sharing a company culture story. Personal, authentic, with a leadership lesson.' },
    { name: 'Educational Tip', prompt: 'Write a LinkedIn thought leadership post with actionable advice. Include a personal anecdote and key takeaways.' },
    { name: 'User Testimonial', prompt: 'Write a LinkedIn case study post featuring a client success story with measurable results.' },
  ],
  tiktok: [
    { name: 'Product Launch', prompt: 'Write a TikTok caption for a product launch video. Short, punchy, trend-aware with relevant hashtags.' },
    { name: 'Behind the Scenes', prompt: 'Write a BTS TikTok caption that feels raw and authentic. Use trending audio references and casual tone.' },
    { name: 'Educational Tip', prompt: 'Write a "things nobody tells you about" style TikTok caption. Hook-driven, conversational, with hashtags.' },
    { name: 'User Testimonial', prompt: 'Write a TikTok caption for a customer review/reaction video. Emphasize transformation and results.' },
  ],
  facebook: [
    { name: 'Product Launch', prompt: 'Write a Facebook post announcing a new product. Include engaging copy, key features, and a link CTA.' },
    { name: 'Behind the Scenes', prompt: 'Write a Facebook post sharing a behind-the-scenes moment with photos. Encourage comments and sharing.' },
    { name: 'Educational Tip', prompt: 'Write a Facebook post sharing a helpful tip or tutorial. Make it shareable and save-worthy.' },
    { name: 'User Testimonial', prompt: 'Write a Facebook post featuring a customer review with their story and photo. Encourage others to share experiences.' },
  ],
};

const TONES = ['Professional', 'Casual', 'Witty', 'Bold', 'Empathetic', 'Trendy'];

export default function SocialPage() {
  const { dark } = useTheme();
  const [activeType, setActiveType] = useState(null);
  const [tone, setTone] = useState('Casual');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [postLength, setPostLength] = useState('Medium');
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || !activeType) return;
    setGenerating(true);
    setResult('');
    setStreamText('');
    const fullPrompt = `[Platform: ${activeType}] [Tone: ${tone}] [Length: ${postLength}] [Hashtags: ${includeHashtags ? 'Yes' : 'No'}] [Emojis: ${includeEmojis ? 'Yes' : 'No'}]\n\n${prompt}`;
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: activeType, prompt: fullPrompt, tone, includeHashtags, includeEmojis, postLength }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') { fullText += data.text; setStreamText(fullText); }
            else if (data.type === 'result') { setResult(data.data?.content || fullText); }
          } catch {}
        }
      }
      if (!result && fullText) setResult(fullText);
    } catch (e) { console.error('Generation error:', e); }
    finally { setGenerating(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || streamText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsTxt = () => {
    const content = result || streamText;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeType}-post.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectTemplate = (tmpl) => setPrompt(tmpl.prompt);

  const charLimits = { instagram: 2200, twitter: 280, linkedin: 3000, tiktok: 2200, facebook: 63206 };

  /* ---- LANDING ---- */
  if (!activeType) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>SOCIAL MEDIA ENGINE</p>
          <h1 className={`text-2xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Choose your platform</h1>
          <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Create platform-optimized content with AI</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 stagger">
          {SOCIAL_TYPES.map(type => (
            <button key={type.id} onClick={() => setActiveType(type.id)}
              className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} rounded-xl p-5 text-center group transition-all`}>
              <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: `${MODULE_COLOR}15`, border: `1px solid ${MODULE_COLOR}20` }}>
                <svg className="w-5 h-5" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                </svg>
              </div>
              <p className={`text-xs font-bold transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{type.name}</p>
              <p className={`text-[10px] mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{type.desc}</p>
            </button>
          ))}
        </div>

        {/* Templates preview */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label">POPULAR TEMPLATES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 stagger">
            {Object.entries(TEMPLATES).map(([type, tmpls]) => {
              const ct = SOCIAL_TYPES.find(c => c.id === type);
              const t = tmpls[0];
              return (
                <button key={`${type}-${t.name}`} onClick={() => { setActiveType(type); setPrompt(t.prompt); }}
                  className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'} rounded-lg p-4 text-left group transition-all`}>
                  <p className="hud-label mb-1.5" style={{ color: MODULE_COLOR }}>{ct?.name}</p>
                  <p className={`text-xs font-semibold transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700'}`}>{t.name}</p>
                  <p className={`text-[10px] mt-1 line-clamp-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform char limits */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label">PLATFORM LIMITS</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-5 gap-2 stagger">
            {SOCIAL_TYPES.map(t => (
              <div key={t.id} className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-lg p-3 text-center`}>
                <p className={`text-[10px] font-semibold ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{t.name}</p>
                <p className="text-lg font-mono font-bold mt-1" style={{ color: MODULE_COLOR }}>{charLimits[t.id].toLocaleString()}</p>
                <p className={`text-[9px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>char limit</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---- GENERATOR ---- */
  const currentType = SOCIAL_TYPES.find(t => t.id === activeType);
  const templates = TEMPLATES[activeType] || [];
  const charCount = (result || streamText).length;
  const maxChars = charLimits[activeType] || 2200;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setActiveType(null); setResult(''); setStreamText(''); setPrompt(''); }}
          className={`p-2 rounded-md border transition-all ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <p className="hud-label" style={{ color: MODULE_COLOR }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Create {currentType?.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* Templates */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4`}>
            <p className="hud-label mb-3">TEMPLATES</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(t => (
                <button key={t.name} onClick={() => selectTemplate(t)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    prompt === t.prompt
                      ? `border-blue-500/30 bg-blue-500/10 ${dark ? 'text-blue-300' : 'text-blue-700'}`
                      : `${dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-800'}`
                  }`}>
                  <p className="font-semibold">{t.name}</p>
                  <p className={`text-[10px] mt-0.5 line-clamp-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4`}>
            <p className="hud-label mb-3">YOUR BRIEF</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
              placeholder="Describe your content: topic, key message, target audience, any specific angles or hooks..."
              className="w-full input-field rounded-lg px-4 py-3 text-sm resize-none" />
          </div>

          {/* Generate */}
          <button onClick={generate} disabled={generating || !prompt.trim()}
            className="btn-accent w-full py-3 rounded-lg font-bold text-sm tracking-wide"
            style={{ background: generating ? (dark ? '#1e1e2e' : '#e5e7eb') : MODULE_COLOR, boxShadow: generating ? 'none' : `0 4px 20px -4px ${MODULE_COLOR}66` }}>
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                GENERATING...
              </span>
            ) : `GENERATE ${currentType?.name?.toUpperCase()}`}
          </button>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          {/* Platform badge */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4`}>
            <p className="hud-label mb-3">PLATFORM</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${MODULE_COLOR}15`, border: `1px solid ${MODULE_COLOR}20` }}>
                <svg className="w-5 h-5" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={currentType?.icon} />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{currentType?.name}</p>
                <p className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Max {maxChars.toLocaleString()} characters</p>
              </div>
            </div>
          </div>

          {/* Tone */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4`}>
            <p className="hud-label mb-3">TONE</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={`chip text-[10px] justify-center ${tone === t ? 'active' : ''}`}
                  style={tone === t ? { background: `${MODULE_COLOR}25`, borderColor: `${MODULE_COLOR}50`, color: MODULE_COLOR } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Post length */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4`}>
            <p className="hud-label mb-3">POST LENGTH</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['Short', 'Medium', 'Long'].map(l => (
                <button key={l} onClick={() => setPostLength(l)}
                  className={`chip text-[10px] justify-center ${postLength === l ? 'active' : ''}`}
                  style={postLength === l ? { background: `${MODULE_COLOR}25`, borderColor: `${MODULE_COLOR}50`, color: MODULE_COLOR } : {}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4`}>
            <p className="hud-label mb-3">OPTIONS</p>
            <div className="space-y-2">
              {[
                { label: 'Include Hashtags', value: includeHashtags, setter: setIncludeHashtags },
                { label: 'Include Emojis', value: includeEmojis, setter: setIncludeEmojis },
              ].map(opt => (
                <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    opt.value
                      ? `border-blue-500/30 bg-blue-500/10 ${dark ? 'text-blue-300' : 'text-blue-700'}`
                      : `${dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`
                  }`}>
                  <span className="font-semibold">{opt.label}</span>
                  <div className={`w-8 h-4 rounded-full transition-all flex items-center ${opt.value ? 'justify-end' : 'justify-start'}`}
                    style={{ background: opt.value ? `${MODULE_COLOR}40` : dark ? '#333' : '#d1d5db' }}>
                    <div className="w-3 h-3 rounded-full mx-0.5 transition-all" style={{ background: opt.value ? MODULE_COLOR : dark ? '#666' : '#9ca3af' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          {(streamText || result) && (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4 animate-fade-up`}>
              <p className="hud-label mb-3">OUTPUT STATS</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Characters</span>
                  <span className={`font-mono font-bold ${charCount > maxChars ? 'text-red-400' : dark ? 'text-white' : 'text-gray-900'}`}>{charCount}/{maxChars}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: dark ? '#1a1a2e' : '#e5e7eb' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (charCount / maxChars) * 100)}%`, background: charCount > maxChars ? '#ef4444' : MODULE_COLOR }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Words</span>
                  <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{(result || streamText).split(/\s+/).filter(Boolean).length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streaming */}
      {(generating || streamText) && !result && (
        <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-5 mt-4 animate-fade-up`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
            <span className="hud-label" style={{ color: MODULE_COLOR }}>GENERATING</span>
          </div>
          <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-5 max-h-[50vh] overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            {streamText}<span className="inline-block w-[2px] h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-5 mt-4 animate-fade-up`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="hud-label" style={{ color: '#4ade80' }}>COMPLETE</span>
            </div>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={exportAsTxt} className="chip text-[10px]">Export TXT</button>
              <button onClick={generate} className="chip text-[10px]">Regenerate</button>
            </div>
          </div>
          <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-5 max-h-[60vh] overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

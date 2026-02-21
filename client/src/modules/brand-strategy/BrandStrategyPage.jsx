import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const COLOR = '#a855f7';

const STRATEGY_TOOLS = [
  { id: 'voice', name: 'Brand Voice Generator', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', desc: 'Define your brand personality and tone of voice across all channels' },
  { id: 'positioning', name: 'Positioning Statement', icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9', desc: 'Craft your unique market position and value proposition' },
  { id: 'guidelines', name: 'Brand Guidelines', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', desc: 'Comprehensive visual and communication guidelines' },
  { id: 'persona', name: 'Buyer Persona Builder', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', desc: 'Build detailed profiles of your ideal customers' },
  { id: 'messaging', name: 'Mission/Vision & Taglines', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', desc: 'Mission statements, vision, and memorable taglines' },
];

const ARCHETYPES = [
  { id: 'hero', name: 'Hero', desc: 'Courageous, bold, driven to prove worth through mastery', emoji: 'Brave' },
  { id: 'explorer', name: 'Explorer', desc: 'Freedom-seeking, adventurous, authentic', emoji: 'Free' },
  { id: 'creator', name: 'Creator', desc: 'Innovative, artistic, visionary', emoji: 'Artistic' },
  { id: 'sage', name: 'Sage', desc: 'Wise, knowledgeable, truth-seeking', emoji: 'Wise' },
  { id: 'rebel', name: 'Rebel', desc: 'Revolutionary, disruptive, liberating', emoji: 'Bold' },
  { id: 'magician', name: 'Magician', desc: 'Transformative, visionary, charismatic', emoji: 'Visionary' },
  { id: 'lover', name: 'Lover', desc: 'Passionate, sensual, intimate', emoji: 'Passion' },
  { id: 'jester', name: 'Jester', desc: 'Fun, playful, irreverent', emoji: 'Playful' },
  { id: 'caregiver', name: 'Caregiver', desc: 'Nurturing, generous, compassionate', emoji: 'Caring' },
  { id: 'ruler', name: 'Ruler', desc: 'Authoritative, commanding, premium', emoji: 'Power' },
  { id: 'everyman', name: 'Everyman', desc: 'Relatable, honest, down-to-earth', emoji: 'Real' },
  { id: 'innocent', name: 'Innocent', desc: 'Optimistic, pure, simple', emoji: 'Pure' },
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'E-commerce', 'SaaS', 'Education',
  'Fashion', 'Food & Beverage', 'Real Estate', 'Fitness', 'Travel', 'Entertainment',
  'Automotive', 'B2B Services', 'Non-Profit', 'Luxury',
];

const TONE_SPECTRUM = [
  { id: 'formal', name: 'Formal', opposite: 'Casual' },
  { id: 'serious', name: 'Serious', opposite: 'Playful' },
  { id: 'respectful', name: 'Respectful', opposite: 'Irreverent' },
  { id: 'enthusiastic', name: 'Enthusiastic', opposite: 'Matter-of-fact' },
];

export default function BrandStrategyPage() {
  const { dark } = useTheme();
  const [activeTool, setActiveTool] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [archetype, setArchetype] = useState(null);
  const [toneValues, setToneValues] = useState({ formal: 50, serious: 50, respectful: 50, enthusiastic: 70 });
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedBrands, setSavedBrands] = useState([]);

  const generate = async () => {
    if (!brandName.trim() || !activeTool) return;
    setGenerating(true);
    setResult('');
    setStreamText('');

    const archetypeInfo = archetype ? ARCHETYPES.find(a => a.id === archetype) : null;
    const toneDesc = TONE_SPECTRUM.map(t => {
      const val = toneValues[t.id];
      return val < 40 ? t.opposite : val > 60 ? t.name : `Balanced ${t.name}/${t.opposite}`;
    }).join(', ');

    try {
      const res = await fetch('/api/brand/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          industry,
          targetAudience,
          elementType: activeTool,
          currentBrand: {
            archetype: archetypeInfo ? archetypeInfo.name : null,
            archetypeDesc: archetypeInfo ? archetypeInfo.desc : null,
            toneProfile: toneDesc,
          },
        }),
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
            else if (data.type === 'error') { console.error('SSE error:', data.message); }
          } catch {}
        }
      }
      if (!result && fullText) setResult(fullText);
    } catch (e) {
      console.error('Generation error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const saveBrand = async () => {
    try {
      const res = await fetch('/api/brand/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName,
          voice: activeTool === 'voice' ? (result || streamText) : null,
          positioning: activeTool === 'positioning' ? (result || streamText) : null,
          guidelines: activeTool === 'guidelines' ? (result || streamText) : null,
          personas: activeTool === 'persona' ? (result || streamText) : null,
        }),
      });
      if (res.ok) {
        const brand = await res.json();
        setSavedBrands(prev => [brand, ...prev]);
      }
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || streamText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Landing: tool selection
  if (!activeTool) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: COLOR }}>BRAND STRATEGY AI</p>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Build Your Brand Identity</h1>
          <p className={`text-base ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Select a strategy tool to develop your brand with AI</p>
        </div>

        {/* Strategy Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 stagger mb-6 sm:mb-10">
          {STRATEGY_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => setActiveTool(tool.id)}
              className="panel-interactive rounded-2xl p-4 sm:p-7 text-left group">
              <div className="flex items-start gap-3 sm:gap-5">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${COLOR}12`, border: `1px solid ${COLOR}20` }}>
                  <svg className="w-6 h-6" style={{ color: COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-bold mb-1 transition-colors ${dark ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{tool.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Archetype Templates */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label text-[11px]">BRAND ARCHETYPE TEMPLATES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 stagger">
            {ARCHETYPES.map(arc => (
              <button key={arc.id} onClick={() => { setArchetype(arc.id); setActiveTool('voice'); }}
                className="panel-interactive rounded-lg p-5 text-left group">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
                    style={{ background: `${COLOR}12`, color: COLOR }}>
                    {arc.name.charAt(0)}
                  </div>
                  <p className={`text-xs font-bold ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700'} transition-colors`}>{arc.name}</p>
                </div>
                <p className="text-[9px] text-gray-500 leading-relaxed">{arc.desc}</p>
                <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${COLOR}10`, color: COLOR, border: `1px solid ${COLOR}20` }}>{arc.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Industry Quick Start */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label text-[11px]">QUICK START BY INDUSTRY</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRIES.map(ind => (
              <button key={ind} onClick={() => { setIndustry(ind); setActiveTool('voice'); }}
                className={`chip text-[10px] ${dark ? '' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}>
                {ind}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentTool = STRATEGY_TOOLS.find(t => t.id === activeTool);
  const wordCount = (result || streamText).split(/\s+/).filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <button onClick={() => { setActiveTool(null); setResult(''); setStreamText(''); }}
          className={`p-2 rounded-md border transition-all ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${COLOR}15`, border: `1px solid ${COLOR}20` }}>
            <svg className="w-5 h-5" style={{ color: COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={currentTool?.icon} />
            </svg>
          </div>
          <div>
            <p className="hud-label text-[11px]" style={{ color: COLOR }}>{currentTool?.name?.toUpperCase()}</p>
            <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{currentTool?.name}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Brand Name */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">BRAND NAME</p>
            <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter your brand name..."
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
          </div>

          {/* Industry */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">INDUSTRY</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  className={`chip text-[10px] ${industry === ind ? 'active' : ''}`}
                  style={industry === ind ? { background: `${COLOR}15`, borderColor: `${COLOR}30`, color: COLOR } : {}}>
                  {ind}
                </button>
              ))}
            </div>
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
              placeholder="Or type your industry..."
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
          </div>

          {/* Target Audience */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">TARGET AUDIENCE</p>
            <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} rows={3}
              placeholder="Describe your ideal customer... age, interests, pain points, goals..."
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
          </div>

          {/* Generate */}
          <button onClick={generate} disabled={!brandName.trim() || generating}
            className="btn-accent w-full py-3 rounded-lg"
            style={{ background: generating ? '#1e1e2e' : COLOR, boxShadow: generating ? 'none' : `0 4px 20px -4px ${COLOR}66` }}>
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                GENERATING {currentTool?.name?.toUpperCase()}...
              </span>
            ) : `GENERATE ${currentTool?.name?.toUpperCase()}`}
          </button>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4 sm:space-y-6">
          {/* Tool Switcher */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">STRATEGY TOOL</p>
            <div className="space-y-1.5">
              {STRATEGY_TOOLS.map(tool => (
                <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs transition-all ${
                    activeTool === tool.id
                      ? `border-[${COLOR}30]`
                      : dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200' : 'border-gray-200 text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTool === tool.id ? { background: `${COLOR}10`, borderColor: `${COLOR}30`, color: COLOR } : {}}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                  </svg>
                  <span className="font-semibold">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Archetype */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">BRAND ARCHETYPE</p>
            <div className="grid grid-cols-3 gap-1">
              {ARCHETYPES.map(arc => (
                <button key={arc.id} onClick={() => setArchetype(arc.id)}
                  className={`text-center px-1.5 py-2 rounded-lg border text-[9px] transition-all ${
                    archetype === arc.id
                      ? ''
                      : dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-500 hover:text-gray-300' : 'border-gray-200 text-gray-500 hover:text-gray-700'
                  }`}
                  style={archetype === arc.id ? { background: `${COLOR}12`, borderColor: `${COLOR}30`, color: COLOR } : {}}>
                  <p className="font-bold">{arc.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Spectrum */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">TONE SPECTRUM</p>
            <div className="space-y-4">
              {TONE_SPECTRUM.map(tone => (
                <div key={tone.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-gray-500 font-semibold">{tone.name}</span>
                    <span className="text-[9px] text-gray-500 font-semibold">{tone.opposite}</span>
                  </div>
                  <input type="range" min="0" max="100" value={toneValues[tone.id]}
                    onChange={(e) => setToneValues(prev => ({ ...prev, [tone.id]: parseInt(e.target.value) }))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${COLOR} 0%, ${COLOR} ${toneValues[tone.id]}%, ${dark ? '#1e1e2e' : '#e5e7eb'} ${toneValues[tone.id]}%, ${dark ? '#1e1e2e' : '#e5e7eb'} 100%)`,
                    }} />
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {(streamText || result) && (
            <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
              <p className="hud-label text-[11px] mb-3">OUTPUT STATS</p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Words</span>
                  <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{wordCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Characters</span>
                  <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{(result || streamText).length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tool</span>
                  <span className="font-semibold" style={{ color: COLOR }}>{currentTool?.name}</span>
                </div>
                {archetype && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Archetype</span>
                    <span className="font-semibold" style={{ color: COLOR }}>{ARCHETYPES.find(a => a.id === archetype)?.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streaming Output */}
      {(generating || streamText) && !result && (
        <div className="panel rounded-2xl p-4 sm:p-7 mt-6 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLOR }} />
            <span className="hud-label text-[11px]" style={{ color: COLOR }}>GENERATING</span>
          </div>
          <div className={`rounded-lg p-4 sm:p-7 max-h-[50vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed font-[system-ui] ${dark ? 'bg-black/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
            {streamText}<span className="inline-block w-[2px] h-4 ml-0.5 animate-pulse" style={{ background: COLOR }} />
          </div>
        </div>
      )}

      {/* Final Result */}
      {result && (
        <div className="panel rounded-2xl p-4 sm:p-7 mt-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>COMPLETE</span>
            </div>
            <div className="flex gap-2">
              <button onClick={copyToClipboard}
                className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={saveBrand}
                className="chip text-[10px]" style={{ color: COLOR }}>
                Save Brand
              </button>
              <button onClick={generate} className="chip text-[10px]">Regenerate</button>
            </div>
          </div>
          <div className={`rounded-lg p-4 sm:p-7 max-h-[60vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'bg-black/50 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

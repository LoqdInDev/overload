import { useState } from 'react';

const MODULE_COLOR = '#64748b';

const AI_TEMPLATES = [
  { name: 'Generate Brand Voice Guide', prompt: 'Create a comprehensive brand voice guide including tone, personality, do\'s and don\'ts, and examples for consistent brand communication' },
  { name: 'Create Brand Persona', prompt: 'Develop a detailed brand persona including demographics, psychographics, pain points, goals, and preferred communication channels' },
  { name: 'Write Brand Story', prompt: 'Write a compelling brand origin story that connects emotionally with the target audience and communicates the brand mission' },
  { name: 'Generate Tagline Options', prompt: 'Generate 10 creative tagline options that capture the brand essence, are memorable, and resonate with the target audience' },
];

const INDUSTRIES = [
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'agency', label: 'Agency' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'playful', label: 'Playful' },
  { value: 'luxurious', label: 'Luxurious' },
];

export default function BrandProfilePage() {
  const [tab, setTab] = useState('profile');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Profile fields
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('ecommerce');
  const [website, setWebsite] = useState('');
  const [mission, setMission] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [keywords, setKeywords] = useState('');

  // Voice fields
  const [tone, setTone] = useState('professional');
  const [personality, setPersonality] = useState('');
  const [writingGuidelines, setWritingGuidelines] = useState('');
  const [wordsToUse, setWordsToUse] = useState('');
  const [wordsToAvoid, setWordsToAvoid] = useState('');

  // Visual fields
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b');
  const [fontPreference, setFontPreference] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/brand-profile/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const inputClass = 'w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/30';
  const selectClass = 'w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/30 appearance-none';
  const textareaClass = 'w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/30 resize-none';

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>BRAND PROFILE</p>
        <h1 className="text-2xl font-bold text-white mb-1">Brand DNA</h1>
        <p className="text-sm text-gray-500">Your brand identity feeds every module in Overload</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {['profile', 'voice', 'visual', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(100,116,139,0.2)', borderColor: 'rgba(100,116,139,0.35)', color: '#94a3b8' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="panel rounded-xl p-6 animate-fade-in">
          <p className="hud-label mb-5" style={{ color: MODULE_COLOR }}>BRAND INFORMATION</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1 block">BRAND NAME</span>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name" className={inputClass} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1 block">TAGLINE</span>
                <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Your brand tagline" className={inputClass} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1 block">INDUSTRY</span>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className={selectClass}>
                  {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1 block">WEBSITE</span>
                <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" className={inputClass} />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">MISSION STATEMENT</span>
              <textarea value={mission} onChange={e => setMission(e.target.value)} rows={3} placeholder="What is your brand's mission and purpose?" className={textareaClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">TARGET AUDIENCE</span>
              <textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)} rows={3} placeholder="Describe your ideal customer demographics, interests, and pain points" className={textareaClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">KEY COMPETITORS</span>
              <textarea value={competitors} onChange={e => setCompetitors(e.target.value)} rows={2} placeholder="Competitor 1, Competitor 2, Competitor 3" className={textareaClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">BRAND KEYWORDS</span>
              <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={2} placeholder="keyword1, keyword2, keyword3" className={textareaClass} />
            </label>
          </div>

          <button className="mt-6 w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all"
            style={{ background: MODULE_COLOR, boxShadow: `0 4px 20px -4px ${MODULE_COLOR}66` }}>
            SAVE PROFILE
          </button>
        </div>
      )}

      {/* Voice Tab */}
      {tab === 'voice' && (
        <div className="panel rounded-xl p-6 animate-fade-in">
          <p className="hud-label mb-5" style={{ color: MODULE_COLOR }}>BRAND VOICE</p>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">TONE</span>
              <select value={tone} onChange={e => setTone(e.target.value)} className={selectClass}>
                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">PERSONALITY</span>
              <textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={3} placeholder="Describe your brand's personality traits. e.g., 'Innovative, approachable, bold, forward-thinking...'" className={textareaClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">WRITING GUIDELINES</span>
              <textarea value={writingGuidelines} onChange={e => setWritingGuidelines(e.target.value)} rows={3} placeholder="Specific writing rules: sentence length, formatting preferences, capitalization rules..." className={textareaClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">WORDS TO USE</span>
              <textarea value={wordsToUse} onChange={e => setWordsToUse(e.target.value)} rows={2} placeholder="innovative, empower, seamless, premium, transform..." className={textareaClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">WORDS TO AVOID</span>
              <textarea value={wordsToAvoid} onChange={e => setWordsToAvoid(e.target.value)} rows={2} placeholder="cheap, basic, simple, just, maybe..." className={textareaClass} />
            </label>
          </div>

          <button className="mt-6 w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all"
            style={{ background: MODULE_COLOR, boxShadow: `0 4px 20px -4px ${MODULE_COLOR}66` }}>
            SAVE VOICE SETTINGS
          </button>
        </div>
      )}

      {/* Visual Tab */}
      {tab === 'visual' && (
        <div className="panel rounded-xl p-6 animate-fade-in">
          <p className="hud-label mb-5" style={{ color: MODULE_COLOR }}>VISUAL IDENTITY</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1 block">PRIMARY COLOR</span>
                <div className="flex items-center gap-2">
                  <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#6366f1" className={inputClass + ' flex-1'} />
                  <div className="w-10 h-10 rounded-lg border border-indigo-500/[0.08] flex-shrink-0" style={{ background: primaryColor }} />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1 block">SECONDARY COLOR</span>
                <div className="flex items-center gap-2">
                  <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} placeholder="#f59e0b" className={inputClass + ' flex-1'} />
                  <div className="w-10 h-10 rounded-lg border border-indigo-500/[0.08] flex-shrink-0" style={{ background: secondaryColor }} />
                </div>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">FONT PREFERENCE</span>
              <input type="text" value={fontPreference} onChange={e => setFontPreference(e.target.value)} placeholder="e.g., Inter, Helvetica, Playfair Display" className={inputClass} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1 block">LOGO URL</span>
              <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://yourbrand.com/logo.png" className={inputClass} />
            </label>

            {/* Color Preview */}
            <div className="mt-4">
              <span className="text-xs font-medium text-gray-400 mb-2 block">COLOR PREVIEW</span>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg p-4 text-center" style={{ background: primaryColor }}>
                  <p className="text-xs font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Primary</p>
                  <p className="text-[10px] text-white/70">{primaryColor}</p>
                </div>
                <div className="flex-1 rounded-lg p-4 text-center" style={{ background: secondaryColor }}>
                  <p className="text-xs font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Secondary</p>
                  <p className="text-[10px] text-white/70">{secondaryColor}</p>
                </div>
                <div className="flex-1 rounded-lg p-4 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  <p className="text-xs font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Gradient</p>
                  <p className="text-[10px] text-white/70">Combined</p>
                </div>
              </div>
            </div>
          </div>

          <button className="mt-6 w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all"
            style={{ background: MODULE_COLOR, boxShadow: `0 4px 20px -4px ${MODULE_COLOR}66` }}>
            SAVE VISUAL IDENTITY
          </button>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-slate-500/20' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? MODULE_COLOR : undefined }} />
                <span className="hud-label" style={{ color: generating ? '#94a3b8' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

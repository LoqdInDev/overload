import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useBrand } from '../../context/BrandContext';

const AI_TEMPLATES = [
  { name: 'Brand Voice Guide', prompt: 'Create a comprehensive brand voice guide including tone, personality, do\'s and don\'ts, and examples for consistent brand communication' },
  { name: 'Brand Persona', prompt: 'Develop a detailed brand persona including demographics, psychographics, pain points, goals, and preferred communication channels' },
  { name: 'Brand Story', prompt: 'Write a compelling brand origin story that connects emotionally with the target audience and communicates the brand mission' },
  { name: 'Tagline Options', prompt: 'Generate 10 creative tagline options that capture the brand essence, are memorable, and resonate with the target audience' },
];

const INDUSTRIES = [
  'E-Commerce', 'SaaS', 'Agency', 'Healthcare', 'Finance', 'Education',
  'Food & Beverage', 'Fashion', 'Real Estate', 'Fitness', 'Travel', 'Technology', 'Other',
];

const TONES = [
  'Professional', 'Casual', 'Friendly', 'Authoritative', 'Playful',
  'Luxurious', 'Bold', 'Minimalist', 'Warm', 'Edgy',
];

const EMPTY_PROFILE = {
  brand_name: '', tagline: '', industry: '', website: '',
  mission: '', vision: '', values: '',
  voice_tone: '', voice_personality: '',
  guidelines: '', words_to_use: '', words_to_avoid: '',
  target_audience: '', competitors: '', keywords: '',
  colors: { primary: '#C45D3E', secondary: '#5E8E6E' },
  fonts: '', logo_url: '',
};

export default function BrandProfilePage() {
  const { dark } = useTheme();
  const { refreshBrand } = useBrand();
  const [tab, setTab] = useState('basics');
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileId, setProfileId] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer = useRef(null);

  // AI generation
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Load profile on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/brand-profile/profile');
        const data = await res.json();
        if (data && data.id) {
          const parse = (v) => { try { return JSON.parse(v); } catch { return v; } };
          setProfile({
            brand_name: data.brand_name || '',
            tagline: data.tagline || '',
            industry: data.industry || '',
            website: data.website || '',
            mission: data.mission || '',
            vision: data.vision || '',
            values: Array.isArray(parse(data.values)) ? parse(data.values).join(', ') : (data.values || ''),
            voice_tone: data.voice_tone || '',
            voice_personality: data.voice_personality || '',
            guidelines: data.guidelines || '',
            words_to_use: data.words_to_use || '',
            words_to_avoid: data.words_to_avoid || '',
            target_audience: typeof parse(data.target_audience) === 'object' && !Array.isArray(parse(data.target_audience))
              ? (parse(data.target_audience)?.description || JSON.stringify(parse(data.target_audience)))
              : (data.target_audience || ''),
            competitors: Array.isArray(parse(data.competitors)) ? parse(data.competitors).join(', ') : (data.competitors || ''),
            keywords: Array.isArray(parse(data.keywords)) ? parse(data.keywords).join(', ') : (data.keywords || ''),
            colors: parse(data.colors) || { primary: '#C45D3E', secondary: '#5E8E6E' },
            fonts: typeof parse(data.fonts) === 'object' ? (parse(data.fonts)?.primary || '') : (data.fonts || ''),
            logo_url: data.logo_url || '',
          });
          setProfileId(data.id);
        }
      } catch (e) {
        console.error('Failed to load brand profile:', e);
      } finally {
        setHasLoaded(true);
      }
    })();
  }, []);

  // Auto-save with debounce
  const doSave = useCallback(async (data) => {
    setSaveStatus('saving');
    try {
      const payload = {
        brand_name: data.brand_name,
        tagline: data.tagline,
        industry: data.industry,
        website: data.website,
        mission: data.mission,
        vision: data.vision,
        values: data.values ? data.values.split(',').map(s => s.trim()).filter(Boolean) : [],
        voice_tone: data.voice_tone,
        voice_personality: data.voice_personality,
        guidelines: data.guidelines,
        words_to_use: data.words_to_use,
        words_to_avoid: data.words_to_avoid,
        target_audience: data.target_audience,
        competitors: data.competitors ? data.competitors.split(',').map(s => s.trim()).filter(Boolean) : [],
        keywords: data.keywords ? data.keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: data.colors,
        fonts: data.fonts,
        logo_url: data.logo_url,
      };

      const method = profileId ? 'PUT' : 'POST';
      const url = profileId ? `/api/brand-profile/profile/${profileId}` : '/api/brand-profile/profile';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!profileId && result.id) setProfileId(result.id);
      setSaveStatus('saved');
      refreshBrand();
    } catch (e) {
      console.error('Failed to save brand profile:', e);
      setSaveStatus('error');
    }
  }, [profileId, refreshBrand]);

  useEffect(() => {
    if (!hasLoaded) return;
    setSaveStatus('idle');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(profile), 1500);
    return () => clearTimeout(saveTimer.current);
  }, [profile, hasLoaded, doSave]);

  const update = (field, value) => setProfile(prev => ({ ...prev, [field]: value }));
  const updateColor = (key, value) => setProfile(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));

  // Completion tracking
  const completionFields = ['brand_name', 'tagline', 'industry', 'mission', 'target_audience', 'voice_tone', 'voice_personality', 'guidelines', 'values', 'keywords', 'competitors', 'keywords'];
  const filledCount = completionFields.filter(f => profile[f]?.trim?.()).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  // AI generation
  const generate = async (template) => {
    setSelectedTemplate(template);
    setGenerating(true);
    setOutput('');
    try {
      const res = await fetch('/api/brand-profile/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'content', prompt: template.prompt }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'chunk') setOutput(p => p + d.text);
            else if (d.type === 'result') setOutput(d.data.content);
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const tabs = [
    { id: 'basics', label: 'Basics', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'voice', label: 'Voice & Tone', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: 'visual', label: 'Visual', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'preview', label: 'Preview', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  ];

  // Shared styles
  const card = dark ? 'bg-white/[0.02] border border-white/[0.06]' : 'bg-white border border-[#e8e0d4]';
  const inputCls = dark
    ? 'w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#C45D3E]/40 transition-colors'
    : 'w-full bg-white border border-[#e8e0d4] rounded-xl px-4 py-3 text-sm text-[#332F2B] placeholder-[#94908A] focus:outline-none focus:border-[#C45D3E]/40 transition-colors';
  const labelCls = `block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 sm:p-10 lg:p-12 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 ${dark ? 'text-[#C45D3E]/70' : 'text-[#C45D3E]'}`}>Brand Identity</p>
              <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${dark ? 'text-white' : 'text-[#332F2B]'}`} style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                Your Brand DNA
              </h1>
              <p className={`text-sm mt-1 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                Every AI module in Overload references this profile when generating content.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 mt-2">
              {/* Save status */}
              <div className={`flex items-center gap-1.5 text-[11px] ${
                saveStatus === 'saving' ? (dark ? 'text-amber-400/70' : 'text-amber-600')
                  : saveStatus === 'saved' ? (dark ? 'text-emerald-400/70' : 'text-[#5E8E6E]')
                  : saveStatus === 'error' ? 'text-red-400'
                  : (dark ? 'text-gray-600' : 'text-[#b5b0a8]')
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  saveStatus === 'saving' ? 'bg-amber-400 animate-pulse'
                    : saveStatus === 'saved' ? (dark ? 'bg-emerald-400' : 'bg-[#5E8E6E]')
                    : saveStatus === 'error' ? 'bg-red-400'
                    : (dark ? 'bg-gray-600' : 'bg-[#b5b0a8]')
                }`} />
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Auto-save'}
              </div>
            </div>
          </div>

          {/* Completion bar */}
          <div className={`rounded-xl p-3 flex items-center gap-4 ${dark ? 'bg-white/[0.02] border border-white/[0.04]' : 'bg-[#FAF7F2] border border-[#e8e0d4]/60'}`}>
            <div className="flex-1">
              <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/[0.04]' : 'bg-[#EDE5DA]'}`}>
                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                  width: `${completionPct}%`,
                  background: completionPct === 100 ? '#5E8E6E' : '#C45D3E',
                }} />
              </div>
            </div>
            <span className={`text-[11px] font-medium tabular-nums flex-shrink-0 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
              {filledCount}/{completionFields.length} fields
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex rounded-xl p-1 mb-8 ${dark ? 'bg-white/[0.02] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                tab === t.id
                  ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] shadow-sm' : 'bg-white text-[#C45D3E] shadow-sm border border-[#e8e0d4]'
                  : dark ? 'text-gray-500 hover:text-gray-300' : 'text-[#94908A] hover:text-[#332F2B]'
              }`}
            >
              <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        {/* Basics Tab */}
        {tab === 'basics' && (
          <div className={`rounded-2xl p-6 sm:p-8 animate-fade-in ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-6 ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Brand Information</p>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Brand Name <span className="text-[#C45D3E]">*</span></label>
                  <input type="text" value={profile.brand_name} onChange={e => update('brand_name', e.target.value)} placeholder="Your brand name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tagline</label>
                  <input type="text" value={profile.tagline} onChange={e => update('tagline', e.target.value)} placeholder="Your brand tagline" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Industry</label>
                  <div className="flex flex-wrap gap-1.5">
                    {INDUSTRIES.map(ind => (
                      <button
                        key={ind}
                        onClick={() => update('industry', ind.toLowerCase())}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                          profile.industry === ind.toLowerCase()
                            ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] border border-[#C45D3E]/25' : 'bg-[#C45D3E]/8 text-[#C45D3E] border border-[#C45D3E]/20'
                            : dark ? 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300' : 'bg-[#F5F0E8] text-[#94908A] border border-[#e8e0d4] hover:text-[#332F2B]'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input type="text" value={profile.website} onChange={e => update('website', e.target.value)} placeholder="https://yourbrand.com" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Mission Statement</label>
                <textarea value={profile.mission} onChange={e => update('mission', e.target.value)} rows={3} placeholder="What is your brand's mission and purpose?" className={inputCls + ' resize-none'} />
              </div>

              <div>
                <label className={labelCls}>Vision</label>
                <textarea value={profile.vision} onChange={e => update('vision', e.target.value)} rows={2} placeholder="Where is your brand headed? What future are you building?" className={inputCls + ' resize-none'} />
              </div>

              <div>
                <label className={labelCls}>Core Values</label>
                <input type="text" value={profile.values} onChange={e => update('values', e.target.value)} placeholder="Innovation, Transparency, Customer-first (comma-separated)" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Target Audience</label>
                <textarea value={profile.target_audience} onChange={e => update('target_audience', e.target.value)} rows={3} placeholder="Describe your ideal customer: demographics, interests, pain points, goals" className={inputCls + ' resize-none'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Key Competitors</label>
                  <input type="text" value={profile.competitors} onChange={e => update('competitors', e.target.value)} placeholder="Competitor 1, Competitor 2 (comma-separated)" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Brand Keywords</label>
                  <input type="text" value={profile.keywords} onChange={e => update('keywords', e.target.value)} placeholder="keyword1, keyword2 (comma-separated)" className={inputCls} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voice & Tone Tab */}
        {tab === 'voice' && (
          <div className={`rounded-2xl p-6 sm:p-8 animate-fade-in ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-6 ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Brand Voice</p>

            <div className="space-y-5">
              <div>
                <label className={labelCls}>Voice Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => update('voice_tone', t.toLowerCase())}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                        profile.voice_tone === t.toLowerCase()
                          ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] border border-[#C45D3E]/25 shadow-sm' : 'bg-[#C45D3E]/8 text-[#C45D3E] border border-[#C45D3E]/20 shadow-sm'
                          : dark ? 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300 hover:border-white/10' : 'bg-[#F5F0E8] text-[#94908A] border border-[#e8e0d4] hover:text-[#332F2B] hover:border-[#d5cdc2]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Voice Personality</label>
                <textarea value={profile.voice_personality} onChange={e => update('voice_personality', e.target.value)} rows={3} placeholder="Describe your brand's personality traits. e.g., 'Innovative, approachable, bold, forward-thinking...'" className={inputCls + ' resize-none'} />
              </div>

              <div>
                <label className={labelCls}>Writing Guidelines</label>
                <textarea value={profile.guidelines} onChange={e => update('guidelines', e.target.value)} rows={3} placeholder="Specific writing rules: sentence length, formatting preferences, capitalization rules, active vs passive voice..." className={inputCls + ' resize-none'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Words to Use</label>
                  <textarea value={profile.words_to_use} onChange={e => update('words_to_use', e.target.value)} rows={3} placeholder="innovative, empower, seamless, premium, transform..." className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className={labelCls}>Words to Avoid</label>
                  <textarea value={profile.words_to_avoid} onChange={e => update('words_to_avoid', e.target.value)} rows={3} placeholder="cheap, basic, simple, just, maybe..." className={inputCls + ' resize-none'} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visual Tab */}
        {tab === 'visual' && (
          <div className={`rounded-2xl p-6 sm:p-8 animate-fade-in ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-6 ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Visual Identity</p>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="text" value={profile.colors?.primary || ''} onChange={e => updateColor('primary', e.target.value)} placeholder="#C45D3E" className={inputCls + ' flex-1'} />
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 border" style={{
                      background: profile.colors?.primary || '#C45D3E',
                      borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="text" value={profile.colors?.secondary || ''} onChange={e => updateColor('secondary', e.target.value)} placeholder="#5E8E6E" className={inputCls + ' flex-1'} />
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 border" style={{
                      background: profile.colors?.secondary || '#5E8E6E',
                      borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Font Preference</label>
                  <input type="text" value={profile.fonts} onChange={e => update('fonts', e.target.value)} placeholder="e.g., Inter, Helvetica, Playfair Display" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Logo URL</label>
                  <input type="text" value={profile.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="https://yourbrand.com/logo.png" className={inputCls} />
                </div>
              </div>

              {/* Color Preview */}
              <div className="mt-2">
                <label className={labelCls}>Palette Preview</label>
                <div className="flex gap-3 mt-1">
                  <div className="flex-1 rounded-xl p-5 text-center" style={{ background: profile.colors?.primary || '#C45D3E' }}>
                    <p className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Primary</p>
                    <p className="text-[11px] text-white/60 mt-0.5">{profile.colors?.primary || '#C45D3E'}</p>
                  </div>
                  <div className="flex-1 rounded-xl p-5 text-center" style={{ background: profile.colors?.secondary || '#5E8E6E' }}>
                    <p className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Secondary</p>
                    <p className="text-[11px] text-white/60 mt-0.5">{profile.colors?.secondary || '#5E8E6E'}</p>
                  </div>
                  <div className="flex-1 rounded-xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${profile.colors?.primary || '#C45D3E'}, ${profile.colors?.secondary || '#5E8E6E'})` }}>
                    <p className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Gradient</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Combined</p>
                  </div>
                </div>
              </div>

              {/* Logo preview */}
              {profile.logo_url && (
                <div>
                  <label className={labelCls}>Logo Preview</label>
                  <div className={`inline-flex items-center justify-center p-4 rounded-xl mt-1 ${dark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
                    <img src={profile.logo_url} alt="Logo" className="max-h-16 max-w-[200px] object-contain" onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {tab === 'preview' && (
          <div className="animate-fade-in space-y-6">
            {/* Brand Brief Card */}
            <div className={`rounded-2xl p-6 sm:p-8 ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(196,93,62,0.1)' }}>
                  <svg className="w-4 h-4 text-[#C45D3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Brand Brief</p>
                  <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-[#b5b0a8]'}`}>This is what AI modules see when generating content</p>
                </div>
              </div>

              {profile.brand_name ? (
                <div className={`rounded-xl p-5 space-y-3 text-sm leading-relaxed ${dark ? 'bg-white/[0.02] border border-white/[0.04]' : 'bg-[#FAF7F2] border border-[#e8e0d4]/60'}`}>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#332F2B]'}`}>{profile.brand_name}</span>
                    {profile.tagline && <span className={`text-xs italic ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>"{profile.tagline}"</span>}
                  </div>

                  {profile.industry && (
                    <span className={`inline-block px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md ${dark ? 'bg-[#C45D3E]/10 text-[#C45D3E]/80' : 'bg-[#C45D3E]/8 text-[#C45D3E]'}`}>
                      {profile.industry}
                    </span>
                  )}

                  {profile.voice_tone && (
                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Voice: </span>
                      <span className={dark ? 'text-gray-300' : 'text-[#332F2B]'}>{profile.voice_tone}{profile.voice_personality ? ` — ${profile.voice_personality}` : ''}</span>
                    </div>
                  )}

                  {profile.mission && (
                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Mission: </span>
                      <span className={dark ? 'text-gray-400' : 'text-[#332F2B]/80'}>{profile.mission}</span>
                    </div>
                  )}

                  {profile.target_audience && (
                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Audience: </span>
                      <span className={dark ? 'text-gray-400' : 'text-[#332F2B]/80'}>{profile.target_audience}</span>
                    </div>
                  )}

                  {profile.guidelines && (
                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Guidelines: </span>
                      <span className={dark ? 'text-gray-400' : 'text-[#332F2B]/80'}>{profile.guidelines}</span>
                    </div>
                  )}

                  {profile.values && (
                    <div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Values: </span>
                      <span className={dark ? 'text-gray-400' : 'text-[#332F2B]/80'}>{profile.values}</span>
                    </div>
                  )}

                  {(profile.words_to_use || profile.words_to_avoid) && (
                    <div className="flex gap-4">
                      {profile.words_to_use && (
                        <div className="flex-1">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-emerald-500/60' : 'text-[#5E8E6E]'}`}>Use: </span>
                          <span className={dark ? 'text-gray-400' : 'text-[#332F2B]/80'}>{profile.words_to_use}</span>
                        </div>
                      )}
                      {profile.words_to_avoid && (
                        <div className="flex-1">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-red-400/60' : 'text-red-500/70'}`}>Avoid: </span>
                          <span className={dark ? 'text-gray-400' : 'text-[#332F2B]/80'}>{profile.words_to_avoid}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-xl p-8 text-center ${dark ? 'bg-white/[0.02] border border-white/[0.04]' : 'bg-[#FAF7F2] border border-[#e8e0d4]/60'}`}>
                  <p className={`text-sm ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Fill in your brand details to see the preview.</p>
                  <button onClick={() => setTab('basics')} className="mt-3 px-4 py-2 text-xs font-semibold text-white rounded-lg" style={{ background: '#C45D3E' }}>
                    Get Started
                  </button>
                </div>
              )}

              {profile.brand_name && (
                <div className={`mt-4 flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg ${dark ? 'bg-[#5E8E6E]/10 text-[#5E8E6E]/80' : 'bg-[#5E8E6E]/8 text-[#5E8E6E]'}`}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Brand profile is active — all AI modules reference this automatically.
                </div>
              )}
            </div>

            {/* AI Tools */}
            <div>
              <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-3 ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>AI Brand Tools</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AI_TEMPLATES.map(tool => (
                  <button
                    key={tool.name}
                    onClick={() => generate(tool)}
                    disabled={generating}
                    className={`rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 ${
                      selectedTemplate?.name === tool.name
                        ? dark ? 'bg-[#C45D3E]/10 border border-[#C45D3E]/20' : 'bg-[#C45D3E]/5 border border-[#C45D3E]/15'
                        : card
                    }`}
                    style={{ boxShadow: dark ? 'none' : '0 1px 8px -2px rgba(0,0,0,0.04)' }}
                  >
                    <p className={`text-xs font-bold ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>{tool.name}</p>
                    <p className={`text-[10px] mt-1 line-clamp-2 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>{tool.prompt.slice(0, 60)}...</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Output */}
            {(generating || output) && (
              <div className={`rounded-2xl p-5 sm:p-7 ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-1.5 h-1.5 rounded-full ${generating ? 'bg-[#C45D3E] animate-pulse' : 'bg-[#5E8E6E]'}`} />
                  <span className={`text-[10px] uppercase tracking-[0.15em] font-semibold ${generating ? (dark ? 'text-[#C45D3E]/70' : 'text-[#C45D3E]') : (dark ? 'text-[#5E8E6E]/70' : 'text-[#5E8E6E]')}`}>
                    {generating ? 'Generating...' : 'Complete'}
                  </span>
                </div>
                <div className={`text-sm whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
                  {output}
                  {generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ background: '#C45D3E' }} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

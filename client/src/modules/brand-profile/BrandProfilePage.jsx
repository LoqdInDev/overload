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

  // Media assets
  const [media, setMedia] = useState([]);
  const [mediaCategory, setMediaCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  // Load media assets
  const loadMedia = useCallback(async (cat) => {
    try {
      const q = cat && cat !== 'all' ? `?category=${cat}` : '';
      const res = await fetch(`/api/brand-profile/media${q}`);
      const data = await res.json();
      if (data.success) setMedia(data.data);
    } catch (e) {
      console.error('Failed to load media:', e);
    }
  }, []);

  useEffect(() => {
    if (tab === 'media') loadMedia(mediaCategory);
  }, [tab, mediaCategory, loadMedia]);

  const uploadFiles = async (files, category = 'other') => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of files) form.append('files', file);
      form.append('category', category);
      const res = await fetch('/api/brand-profile/media', { method: 'POST', body: form });
      const data = await res.json();
      if (data.success) loadMedia(mediaCategory);
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (id) => {
    try {
      await fetch(`/api/brand-profile/media/${id}`, { method: 'DELETE' });
      setMedia(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const updateMediaCategory = async (id, category) => {
    try {
      await fetch(`/api/brand-profile/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      setMedia(prev => prev.map(m => m.id === id ? { ...m, category } : m));
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files, mediaCategory === 'all' ? 'other' : mediaCategory);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const MEDIA_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'logo', label: 'Logos' },
    { id: 'banner', label: 'Banners' },
    { id: 'icon', label: 'Icons' },
    { id: 'social', label: 'Social Media' },
    { id: 'product', label: 'Product' },
    { id: 'other', label: 'Other' },
  ];

  const tabs = [
    { id: 'basics', label: 'Basics', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'voice', label: 'Voice & Tone', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: 'visual', label: 'Visual', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'media', label: 'Media', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
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
      <div className="p-4 sm:p-6 lg:p-12 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 ${dark ? 'text-[#C45D3E]/70' : 'text-[#C45D3E]'}`}>Brand Identity</p>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${dark ? 'text-white' : 'text-[#332F2B]'}`} style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                Your Brand DNA
              </h1>
              <p className={`text-sm mt-1 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                Every AI module in Overload references this profile when generating content.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
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
        <div className={`flex flex-wrap rounded-xl p-1 mb-6 sm:mb-8 ${dark ? 'bg-white/[0.02] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-0 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  <div className="rounded-xl p-5 text-center" style={{ background: profile.colors?.primary || '#C45D3E' }}>
                    <p className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Primary</p>
                    <p className="text-[11px] text-white/60 mt-0.5">{profile.colors?.primary || '#C45D3E'}</p>
                  </div>
                  <div className="rounded-xl p-5 text-center" style={{ background: profile.colors?.secondary || '#5E8E6E' }}>
                    <p className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Secondary</p>
                    <p className="text-[11px] text-white/60 mt-0.5">{profile.colors?.secondary || '#5E8E6E'}</p>
                  </div>
                  <div className="rounded-xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${profile.colors?.primary || '#C45D3E'}, ${profile.colors?.secondary || '#5E8E6E'})` }}>
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

        {/* Media Tab */}
        {tab === 'media' && (
          <div className="animate-fade-in space-y-6">
            {/* Upload Zone */}
            <div
              className={`rounded-2xl p-6 sm:p-8 transition-all ${card} ${dragOver ? (dark ? 'ring-2 ring-[#C45D3E]/40 bg-[#C45D3E]/5' : 'ring-2 ring-[#C45D3E]/30 bg-[#C45D3E]/[0.03]') : ''}`}
              style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="text-center py-6 sm:py-10">
                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
                  <svg className={`w-7 h-7 ${dragOver ? 'text-[#C45D3E]' : dark ? 'text-gray-600' : 'text-[#94908A]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className={`text-sm font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
                  {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                </p>
                <p className={`text-[11px] mb-4 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>
                  JPG, PNG, SVG, WebP, GIF, ICO, PDF — up to 10MB each
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-5 py-2.5 text-xs font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#C45D3E' }}
                >
                  {uploading ? 'Uploading...' : 'Choose Files'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.svg,.ico"
                  className="hidden"
                  onChange={(e) => {
                    uploadFiles(Array.from(e.target.files), mediaCategory === 'all' ? 'other' : mediaCategory);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5">
              {MEDIA_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setMediaCategory(cat.id)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    mediaCategory === cat.id
                      ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] border border-[#C45D3E]/25' : 'bg-[#C45D3E]/8 text-[#C45D3E] border border-[#C45D3E]/20'
                      : dark ? 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300' : 'bg-[#F5F0E8] text-[#94908A] border border-[#e8e0d4] hover:text-[#332F2B]'
                  }`}
                >
                  {cat.label}
                  {cat.id !== 'all' && (() => {
                    const count = cat.id === 'all' ? media.length : media.filter(m => m.category === cat.id).length;
                    return count > 0 ? <span className="ml-1 opacity-60">({count})</span> : null;
                  })()}
                </button>
              ))}
            </div>

            {/* Media Gallery */}
            {media.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {media.map(item => {
                  const isImage = item.mimetype?.startsWith('image/');
                  return (
                    <div
                      key={item.id}
                      className={`group rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 ${card}`}
                      style={{ boxShadow: dark ? 'none' : '0 1px 8px -2px rgba(0,0,0,0.04)' }}
                    >
                      {/* Preview */}
                      <div className={`relative aspect-square flex items-center justify-center ${dark ? 'bg-white/[0.02]' : 'bg-[#FAF7F2]'}`}>
                        {isImage ? (
                          <img src={item.url} alt={item.original_name} className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className="text-center p-4">
                            <svg className={`w-10 h-10 mx-auto ${dark ? 'text-gray-600' : 'text-[#94908A]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <p className={`text-[10px] mt-1 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>PDF</p>
                          </div>
                        )}
                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                          <button
                            onClick={() => deleteMedia(item.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/40 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className={`text-xs font-medium truncate ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>{item.original_name}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <select
                            value={item.category}
                            onChange={(e) => updateMediaCategory(item.id, e.target.value)}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border appearance-none cursor-pointer ${
                              dark ? 'bg-white/[0.03] border-white/[0.06] text-gray-500' : 'bg-[#F5F0E8] border-[#e8e0d4] text-[#94908A]'
                            }`}
                          >
                            {MEDIA_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                          <span className={`text-[10px] ${dark ? 'text-gray-600' : 'text-[#b5b0a8]'}`}>{formatSize(item.size)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-2xl p-10 text-center ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
                <svg className={`w-12 h-12 mx-auto mb-3 ${dark ? 'text-gray-700' : 'text-[#d5cdc2]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>No media assets yet</p>
                <p className={`text-[11px] mt-1 ${dark ? 'text-gray-600' : 'text-[#b5b0a8]'}`}>Upload your logos, banners, and brand imagery</p>
              </div>
            )}
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
                  <div className="flex flex-wrap items-baseline gap-2">
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
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

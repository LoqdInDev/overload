import { useState, useEffect, useRef, useCallback } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../context/ThemeContext';
import { useBrand } from '../../context/BrandContext';
import { fetchJSON, postJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const API_BASE = import.meta.env.VITE_API_URL || '';

const COLOR = '#C45D3E';

/* ── Profile constants ── */
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
};

/* ── Strategy constants ── */
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

const STRATEGY_INDUSTRIES = [
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

/* ── Media constants ── */
const MEDIA_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'logo', label: 'Logos' },
  { id: 'banner', label: 'Banners' },
  { id: 'icon', label: 'Icons' },
  { id: 'social', label: 'Social Media' },
  { id: 'product', label: 'Product' },
  { id: 'other', label: 'Other' },
];

/* ══════════════════════════════════════════════════════════════════════
   BrandHubPage — unified Brand Profile + Brand Strategy + Media
   ══════════════════════════════════════════════════════════════════════ */
export default function BrandHubPage() {
  usePageTitle('Brand Hub');
  const { dark } = useTheme();
  const { refreshBrand } = useBrand();

  /* ── Top-level tab ── */
  const [tab, setTab] = useState('profile');
  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'media', label: 'Media' },
  ];

  /* ═══════════════════ PROFILE STATE ═══════════════════ */
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileId, setProfileId] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  /* ═══════════════════ STRATEGY STATE ═══════════════════ */
  const [activeTool, setActiveTool] = useState(null);
  const [stratBrandName, setStratBrandName] = useState('');
  const [stratIndustry, setStratIndustry] = useState('');
  const [stratAudience, setStratAudience] = useState('');
  const [archetype, setArchetype] = useState(null);
  const [toneValues, setToneValues] = useState({ formal: 50, serious: 50, respectful: 50, enthusiastic: 70 });
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedBrands, setSavedBrands] = useState([]);

  /* ═══════════════════ MEDIA STATE ═══════════════════ */
  const [media, setMedia] = useState([]);
  const [mediaCategory, setMediaCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Shared styling helpers ── */
  const card = dark ? 'bg-white/[0.02] border border-white/[0.06]' : 'bg-white border border-[#e8e0d4]';
  const inputCls = dark
    ? 'w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#C45D3E]/40 transition-colors'
    : 'w-full bg-white border border-[#e8e0d4] rounded-xl px-4 py-3 text-sm text-[#332F2B] placeholder-[#94908A] focus:outline-none focus:border-[#C45D3E]/40 transition-colors';
  const labelCls = `block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`;

  /* ═══════════════════════════════════════════════════════
     PROFILE: Load / Save
     ═══════════════════════════════════════════════════════ */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/brand-profile/profile`);
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
          });
          setProfileId(data.id);
          // Pre-fill strategy fields from profile
          if (data.brand_name) setStratBrandName(data.brand_name);
          if (data.industry) setStratIndustry(data.industry);
          if (data.target_audience) setStratAudience(
            typeof parse(data.target_audience) === 'object' && !Array.isArray(parse(data.target_audience))
              ? (parse(data.target_audience)?.description || '')
              : (data.target_audience || '')
          );
        }
      } catch (e) {
        console.error('Failed to load brand profile:', e);
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        brand_name: profile.brand_name,
        tagline: profile.tagline,
        industry: profile.industry,
        website: profile.website,
        mission: profile.mission,
        vision: profile.vision,
        values: profile.values ? profile.values.split(',').map(s => s.trim()).filter(Boolean) : [],
        voice_tone: profile.voice_tone,
        voice_personality: profile.voice_personality,
        guidelines: profile.guidelines,
        words_to_use: profile.words_to_use,
        words_to_avoid: profile.words_to_avoid,
        target_audience: profile.target_audience,
        competitors: profile.competitors ? profile.competitors.split(',').map(s => s.trim()).filter(Boolean) : [],
        keywords: profile.keywords ? profile.keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: profile.colors,
      };

      const method = profileId ? 'PUT' : 'POST';
      const url = profileId ? `/api/brand-profile/profile/${profileId}` : '/api/brand-profile/profile';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!profileId && data.id) setProfileId(data.id);
      setSaveStatus('saved');
      refreshBrand();
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.error('Failed to save profile:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const update = (field, value) => setProfile(prev => ({ ...prev, [field]: value }));
  const updateColor = (key, value) => setProfile(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));

  /* ═══════════════════════════════════════════════════════
     STRATEGY: Generate / Save / Copy
     ═══════════════════════════════════════════════════════ */
  const generate = async () => {
    if (!stratBrandName.trim() || !activeTool) return;
    setGenerating(true);
    setResult('');
    setStreamText('');

    const archetypeInfo = archetype ? ARCHETYPES.find(a => a.id === archetype) : null;
    const toneDesc = TONE_SPECTRUM.map(t => {
      const val = toneValues[t.id];
      return val < 40 ? t.opposite : val > 60 ? t.name : `Balanced ${t.name}/${t.opposite}`;
    }).join(', ');

    try {
      const res = await fetch(`${API_BASE}/api/brand/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: stratBrandName,
          industry: stratIndustry,
          targetAudience: stratAudience,
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
          } catch { /* ignore partial chunks */ }
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
      const res = await fetch(`${API_BASE}/api/brand/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stratBrandName,
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

  /* ═══════════════════════════════════════════════════════
     MEDIA: Load / Upload / Delete
     ═══════════════════════════════════════════════════════ */
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
      const res = await fetch(`${API_BASE}/api/brand-profile/media`, { method: 'POST', body: form });
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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files), mediaCategory === 'all' ? 'other' : mediaCategory);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  const currentTool = STRATEGY_TOOLS.find(t => t.id === activeTool);
  const wordCount = (result || streamText).split(/\s+/).filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-12 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: COLOR }}>BRAND HUB</p>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${dark ? 'text-white' : 'text-[#332F2B]'}`}
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
            Your Brand Command Center
          </h1>
          <p className={`text-sm mt-1 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
            Profile, strategy, and assets -- all in one place.
          </p>
        </div>

        {/* ── Tab Bar ── */}
        <div className={`flex rounded-xl p-1 mb-6 sm:mb-8 ${dark ? 'bg-white/[0.02] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                tab === t.id
                  ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] shadow-sm' : 'bg-white text-[#C45D3E] shadow-sm border border-[#e8e0d4]'
                  : dark ? 'text-gray-500 hover:text-gray-300' : 'text-[#94908A] hover:text-[#332F2B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
           PROFILE TAB
           ══════════════════════════════════════════════════ */}
        {tab === 'profile' && (
          <div className="animate-fade-in space-y-6">

            {/* Brand Basics */}
            <div className={`rounded-2xl p-4 sm:p-6 ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
              <p className="hud-label text-[11px] mb-5" style={{ color: COLOR }}>BRAND INFORMATION</p>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Brand Name <span className="text-[#C45D3E]">*</span></label>
                    <input type="text" value={profile.brand_name} onChange={e => update('brand_name', e.target.value)}
                      placeholder="Your brand name" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tagline</label>
                    <input type="text" value={profile.tagline} onChange={e => update('tagline', e.target.value)}
                      placeholder="Your brand tagline" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Industry</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {INDUSTRIES.map(ind => (
                        <button key={ind} onClick={() => update('industry', ind.toLowerCase())}
                          className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                            profile.industry === ind.toLowerCase()
                              ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] border border-[#C45D3E]/25' : 'bg-[#C45D3E]/8 text-[#C45D3E] border border-[#C45D3E]/20'
                              : dark ? 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300' : 'bg-[#F5F0E8] text-[#94908A] border border-[#e8e0d4] hover:text-[#332F2B]'
                          }`}>
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Website</label>
                    <input type="text" value={profile.website} onChange={e => update('website', e.target.value)}
                      placeholder="https://yourbrand.com" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Mission Statement</label>
                  <textarea value={profile.mission} onChange={e => update('mission', e.target.value)} rows={3}
                    placeholder="What is your brand's mission and purpose?" className={inputCls + ' resize-none'} />
                </div>

                <div>
                  <label className={labelCls}>Vision</label>
                  <textarea value={profile.vision} onChange={e => update('vision', e.target.value)} rows={2}
                    placeholder="Where is your brand headed? What future are you building?" className={inputCls + ' resize-none'} />
                </div>

                <div>
                  <label className={labelCls}>Core Values</label>
                  <input type="text" value={profile.values} onChange={e => update('values', e.target.value)}
                    placeholder="Innovation, Transparency, Customer-first (comma-separated)" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Target Audience</label>
                  <textarea value={profile.target_audience} onChange={e => update('target_audience', e.target.value)} rows={3}
                    placeholder="Describe your ideal customer: demographics, interests, pain points" className={inputCls + ' resize-none'} />
                </div>
              </div>
            </div>

            {/* Voice & Tone */}
            <div className={`rounded-2xl p-4 sm:p-6 ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
              <p className="hud-label text-[11px] mb-5" style={{ color: COLOR }}>VOICE & TONE</p>

              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Voice Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(t => (
                      <button key={t} onClick={() => update('voice_tone', t.toLowerCase())}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                          profile.voice_tone === t.toLowerCase()
                            ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E] border border-[#C45D3E]/25 shadow-sm' : 'bg-[#C45D3E]/8 text-[#C45D3E] border border-[#C45D3E]/20 shadow-sm'
                            : dark ? 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300' : 'bg-[#F5F0E8] text-[#94908A] border border-[#e8e0d4] hover:text-[#332F2B]'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Voice Personality</label>
                  <textarea value={profile.voice_personality} onChange={e => update('voice_personality', e.target.value)} rows={2}
                    placeholder="Describe your brand's personality traits..." className={inputCls + ' resize-none'} />
                </div>

                <div>
                  <label className={labelCls}>Writing Guidelines</label>
                  <textarea value={profile.guidelines} onChange={e => update('guidelines', e.target.value)} rows={2}
                    placeholder="Specific writing rules, formatting preferences..." className={inputCls + ' resize-none'} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Words to Use</label>
                    <textarea value={profile.words_to_use} onChange={e => update('words_to_use', e.target.value)} rows={2}
                      placeholder="innovative, empower, seamless..." className={inputCls + ' resize-none'} />
                  </div>
                  <div>
                    <label className={labelCls}>Words to Avoid</label>
                    <textarea value={profile.words_to_avoid} onChange={e => update('words_to_avoid', e.target.value)} rows={2}
                      placeholder="cheap, basic, just..." className={inputCls + ' resize-none'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className={`rounded-2xl p-4 sm:p-6 ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
              <p className="hud-label text-[11px] mb-5" style={{ color: COLOR }}>BRAND COLORS</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={profile.colors?.primary || '#C45D3E'}
                      onChange={e => updateColor('primary', e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0.5" />
                    <input type="text" value={profile.colors?.primary || ''}
                      onChange={e => updateColor('primary', e.target.value)}
                      placeholder="#C45D3E" className={inputCls + ' flex-1'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={profile.colors?.secondary || '#5E8E6E'}
                      onChange={e => updateColor('secondary', e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0.5" />
                    <input type="text" value={profile.colors?.secondary || ''}
                      onChange={e => updateColor('secondary', e.target.value)}
                      placeholder="#5E8E6E" className={inputCls + ' flex-1'} />
                  </div>
                </div>
              </div>

              {/* Palette Preview */}
              <div className="grid grid-cols-3 gap-3 mt-5">
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

            {/* Additional Fields */}
            <div className={`rounded-2xl p-4 sm:p-6 ${card}`} style={{ boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)' }}>
              <p className="hud-label text-[11px] mb-5" style={{ color: COLOR }}>ADDITIONAL</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Key Competitors</label>
                  <input type="text" value={profile.competitors} onChange={e => update('competitors', e.target.value)}
                    placeholder="Competitor 1, Competitor 2 (comma-separated)" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Brand Keywords</label>
                  <input type="text" value={profile.keywords} onChange={e => update('keywords', e.target.value)}
                    placeholder="keyword1, keyword2 (comma-separated)" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button onClick={saveProfile}
              disabled={saveStatus === 'saving'}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: COLOR, boxShadow: `0 4px 20px -4px ${COLOR}66` }}>
              {saveStatus === 'saving' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </span>
              ) : saveStatus === 'error' ? 'Error -- Try Again' : 'Save Brand Profile'}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
           STRATEGY TAB
           ══════════════════════════════════════════════════ */}
        {tab === 'strategy' && !activeTool && (
          <div className="animate-fade-in">
            {/* Strategy Tools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-10">
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                    <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${COLOR}10`, color: COLOR, border: `1px solid ${COLOR}20` }}>{arc.emoji}</span>
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
                {STRATEGY_INDUSTRIES.map(ind => (
                  <button key={ind} onClick={() => { setStratIndustry(ind); setActiveTool('voice'); }}
                    className={`chip text-[10px] ${dark ? '' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Strategy -- Active Tool View */}
        {tab === 'strategy' && activeTool && (
          <div className="animate-fade-in">
            {/* Tool Header */}
            <div className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8">
              <button onClick={() => { setActiveTool(null); setResult(''); setStreamText(''); }}
                className={`p-2 rounded-md border transition-all flex-shrink-0 ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${COLOR}15`, border: `1px solid ${COLOR}20` }}>
                  <svg className="w-5 h-5" style={{ color: COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={currentTool?.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="hud-label text-[11px]" style={{ color: COLOR }}>{currentTool?.name?.toUpperCase()}</p>
                  <h2 className={`text-base sm:text-lg font-bold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{currentTool?.name}</h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left: Inputs */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Brand Name */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-3">BRAND NAME</p>
                  <input type="text" value={stratBrandName} onChange={(e) => setStratBrandName(e.target.value)}
                    placeholder="Enter your brand name..."
                    className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
                </div>

                {/* Industry */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-3">INDUSTRY</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {STRATEGY_INDUSTRIES.map(ind => (
                      <button key={ind} onClick={() => setStratIndustry(ind)}
                        className={`chip text-[10px] ${stratIndustry === ind ? 'active' : ''}`}
                        style={stratIndustry === ind ? { background: `${COLOR}15`, borderColor: `${COLOR}30`, color: COLOR } : {}}>
                        {ind}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={stratIndustry} onChange={(e) => setStratIndustry(e.target.value)}
                    placeholder="Or type your industry..."
                    className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
                </div>

                {/* Target Audience */}
                <div className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-3">TARGET AUDIENCE</p>
                  <textarea value={stratAudience} onChange={(e) => setStratAudience(e.target.value)} rows={3}
                    placeholder="Describe your ideal customer... age, interests, pain points, goals..."
                    className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
                </div>

                {/* Generate Button */}
                <button onClick={generate} disabled={!stratBrandName.trim() || generating}
                  className="btn-accent w-full py-3 rounded-lg text-sm sm:text-base"
                  style={{ background: generating ? '#1e1e2e' : COLOR, boxShadow: generating ? 'none' : `0 4px 20px -4px ${COLOR}66` }}>
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin flex-shrink-0" />
                      <span className="truncate">GENERATING {currentTool?.name?.toUpperCase()}...</span>
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
                            ? ''
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
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

                {/* Output Stats */}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>COMPLETE</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
        )}

        {/* ══════════════════════════════════════════════════
           MEDIA TAB
           ══════════════════════════════════════════════════ */}
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
                  JPG, PNG, SVG, WebP, GIF, ICO, PDF -- up to 10MB each
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-5 py-2.5 text-xs font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: COLOR }}
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
                    const count = media.filter(m => m.category === cat.id).length;
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
                    <div key={item.id}
                      className={`group rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 ${card}`}
                      style={{ boxShadow: dark ? 'none' : '0 1px 8px -2px rgba(0,0,0,0.04)' }}>
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
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a href={item.url} target="_blank" rel="noreferrer"
                            className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                          <button onClick={() => deleteMedia(item.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/40 transition-colors">
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
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${dark ? 'bg-white/[0.03] text-gray-500' : 'bg-[#F5F0E8] text-[#94908A]'}`}>
                            {item.category || 'other'}
                          </span>
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

      </div>
      <AIInsightsPanel moduleId="brand-hub" />
    </div>
  );
}

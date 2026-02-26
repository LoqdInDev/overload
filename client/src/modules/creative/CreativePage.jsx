import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

const CREATIVE_TYPES = [
  { id: 'ad-creative', name: 'Ad Creatives', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'product-photo', name: 'Product Photos', icon: 'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z' },
  { id: 'social-graphic', name: 'Social Graphics', icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z' },
  { id: 'banner', name: 'Banner Designs', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
];

const STYLES = [
  { id: 'minimal', name: 'Minimal', desc: 'Clean lines, whitespace, modern' },
  { id: 'bold', name: 'Bold & Vibrant', desc: 'High contrast, saturated colors' },
  { id: 'luxury', name: 'Luxury', desc: 'Premium, elegant, dark tones' },
  { id: 'playful', name: 'Playful', desc: 'Fun, colorful, rounded shapes' },
  { id: 'corporate', name: 'Corporate', desc: 'Professional, structured, clean' },
  { id: 'retro', name: 'Retro / Vintage', desc: 'Nostalgic, warm, textured' },
];

const DIMENSIONS = {
  'ad-creative': [
    { id: '1080x1080', label: '1080×1080', desc: 'Feed Square' },
    { id: '1080x1350', label: '1080×1350', desc: 'Feed Portrait' },
    { id: '1200x628', label: '1200×628', desc: 'Landscape Ad' },
    { id: '1080x1920', label: '1080×1920', desc: 'Story/Reel' },
  ],
  'product-photo': [
    { id: '1080x1080', label: '1080×1080', desc: 'Square' },
    { id: '1500x1500', label: '1500×1500', desc: 'Marketplace' },
    { id: '2000x2000', label: '2000×2000', desc: 'High Res' },
    { id: '800x1000', label: '800×1000', desc: 'Product Card' },
  ],
  'social-graphic': [
    { id: '1080x1080', label: '1080×1080', desc: 'Instagram Post' },
    { id: '1080x1920', label: '1080×1920', desc: 'Story / Reel' },
    { id: '1200x630', label: '1200×630', desc: 'Facebook / OG' },
    { id: '1500x500', label: '1500×500', desc: 'Twitter Header' },
  ],
  'banner': [
    { id: '728x90', label: '728×90', desc: 'Leaderboard' },
    { id: '300x250', label: '300×250', desc: 'Medium Rectangle' },
    { id: '160x600', label: '160×600', desc: 'Wide Skyscraper' },
    { id: '1920x600', label: '1920×600', desc: 'Hero Banner' },
  ],
};

const TEMPLATES = {
  'ad-creative': [
    { name: 'Product Showcase', prompt: 'Create a clean product showcase ad featuring the product centered on a gradient background with bold headline text and a clear CTA button' },
    { name: 'Before & After', prompt: 'Design a split-screen before/after comparison ad showing transformation results with compelling stats overlay' },
    { name: 'Social Proof', prompt: 'Create a testimonial-style ad with a customer quote, star rating, product image, and trust badges' },
    { name: 'Limited Offer', prompt: 'Design an urgency-driven flash sale ad with countdown timer visual, discount badge, and product hero shot' },
  ],
  'product-photo': [
    { name: 'Studio White', prompt: 'Professional product photo on pure white background with soft studio lighting, subtle shadows, and clean reflections' },
    { name: 'Lifestyle Scene', prompt: 'Product placed in a natural lifestyle setting that matches the brand aesthetic — warm lighting, styled environment' },
    { name: 'Flat Lay', prompt: 'Top-down flat lay arrangement with the product surrounded by complementary props and texture elements' },
    { name: 'Close-Up Detail', prompt: 'Macro close-up shot highlighting product texture, material quality, and craftsmanship details' },
  ],
  'social-graphic': [
    { name: 'Quote Card', prompt: 'Create an elegant quote card with typography, brand colors, subtle background pattern, and logo placement' },
    { name: 'Infographic', prompt: 'Design a data-driven infographic with charts, icons, key stats, and a visual hierarchy for easy scanning' },
    { name: 'Announcement', prompt: 'Bold announcement graphic with large text, decorative elements, and exciting visual treatment' },
    { name: 'Carousel Slide', prompt: 'Design a swipeable carousel slide with consistent branding, numbered sequence, and educational content' },
  ],
  'banner': [
    { name: 'Hero CTA', prompt: 'Create a hero banner with headline, subtext, product image, and prominent call-to-action button' },
    { name: 'Event Promo', prompt: 'Design an event promotion banner with date, venue details, speaker photos, and registration CTA' },
    { name: 'Sale Banner', prompt: 'Bold sale banner with percentage off, product thumbnails, and urgency messaging' },
    { name: 'Newsletter Header', prompt: 'Clean email newsletter header banner with logo, tagline, and subtle branding elements' },
  ],
};

const COLOR_PALETTES = [
  { id: 'brand', name: 'Brand Colors', colors: ['#6366f1', '#8b5cf6', '#a78bfa'] },
  { id: 'warm', name: 'Warm Tones', colors: ['#f97316', '#ef4444', '#eab308'] },
  { id: 'cool', name: 'Cool Tones', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'] },
  { id: 'earth', name: 'Earth Tones', colors: ['#92400e', '#78716c', '#65a30d'] },
  { id: 'mono', name: 'Monochrome', colors: ['#18181b', '#71717a', '#e4e4e7'] },
  { id: 'neon', name: 'Neon Pop', colors: ['#f43f5e', '#a855f7', '#22d3ee'] },
];

export default function CreativePage() {
  usePageTitle('Creative & Design');
  const [activeType, setActiveType] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('minimal');
  const [dimension, setDimension] = useState(null);
  const [palette, setPalette] = useState('brand');
  const [quantity, setQuantity] = useState('4');
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (!prompt.trim() || !activeType) return;
    setGenerating(true);
    setError(null);
    const selectedStyle = STYLES.find(s => s.id === style);
    const selectedDim = (DIMENSIONS[activeType] || []).find(d => d.id === dimension);
    const fullPrompt = `[Style: ${selectedStyle?.name}] [Dimensions: ${selectedDim?.label || 'Auto'}] [Palette: ${COLOR_PALETTES.find(p => p.id === palette)?.name}] [Quantity: ${quantity}]\n\n${prompt}`;
    try {
      const res = await fetch('/api/creative/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, prompt: fullPrompt }),
      });
      const data = await res.json();
      if (data.images) setImages(data.images);
    } catch (e) {
      console.error('Generation error:', e);
      setError(e.message || 'Failed to generate creatives. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!activeType) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <ModuleWrapper moduleId="creative">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: '#06b6d4' }}>AI CREATIVE STUDIO</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">What do you want to design?</h1>
          <p className="text-base text-gray-500">Select a creative type to start generating AI-powered visuals</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {CREATIVE_TYPES.map(type => (
            <button key={type.id} onClick={() => { setActiveType(type.id); setDimension(DIMENSIONS[type.id]?.[0]?.id || null); }}
              className="panel-interactive rounded-2xl p-4 sm:p-7 text-center group">
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.12)' }}>
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{type.name}</p>
            </button>
          ))}
        </div>

        {/* Templates Preview */}
        <div className="mt-10">
          <div className="flex items-center gap-3 sm:gap-5 mb-4">
            <p className="hud-label text-[11px]">QUICK START TEMPLATES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {Object.entries(TEMPLATES).flatMap(([type, tmpls]) =>
              tmpls.slice(0, 1).map(t => {
                const ct = CREATIVE_TYPES.find(c => c.id === type);
                return (
                  <button key={`${type}-${t.name}`} onClick={() => { setActiveType(type); setPrompt(t.prompt); setDimension(DIMENSIONS[type]?.[0]?.id || null); }}
                    className="panel-interactive rounded-lg p-4 sm:p-6 text-left group">
                    <p className="hud-label text-[11px] mb-1.5" style={{ color: '#06b6d4' }}>{ct?.name}</p>
                    <p className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">{t.prompt}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
        </ModuleWrapper>
      </div>
    );
  }

  const currentType = CREATIVE_TYPES.find(t => t.id === activeType);
  const templates = TEMPLATES[activeType] || [];
  const dims = DIMENSIONS[activeType] || [];

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="creative">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveType(null); setImages([]); setPrompt(''); }}
          className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <p className="hud-label text-[11px]" style={{ color: '#06b6d4' }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Create {currentType?.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Templates */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">TEMPLATES</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map(t => (
                <button key={t.name} onClick={() => setPrompt(t.prompt)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                    prompt === t.prompt ? 'border-cyan-500/30 bg-cyan-500/8 text-cyan-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200 hover:border-indigo-500/15'
                  }`}>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{t.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">CREATIVE BRIEF</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
              placeholder="Describe your visual in detail — subject, composition, mood, lighting, colors, text overlays..."
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
          </div>

          {/* Generate */}
          <button onClick={generate} disabled={generating || !prompt.trim()}
            className="btn-accent w-full py-3 rounded-lg"
            style={{ background: generating ? '#1e1e2e' : '#06b6d4', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(6,182,212,0.4)' }}>
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                GENERATING...
              </span>
            ) : `GENERATE ${quantity} CREATIVES`}
          </button>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4 sm:space-y-6">
          {/* Style */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">VISUAL STYLE</p>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className={`chip text-[10px] justify-center flex-col items-start px-2.5 py-2 ${style === s.id ? 'active' : ''}`}
                  style={style === s.id ? { background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.3)', color: '#22d3ee' } : {}}>
                  <span className="font-bold">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">DIMENSIONS</p>
            <div className="grid grid-cols-2 gap-1.5">
              {dims.map(d => (
                <button key={d.id} onClick={() => setDimension(d.id)}
                  className={`chip text-[10px] justify-center flex-col items-center py-2 ${dimension === d.id ? 'active' : ''}`}
                  style={dimension === d.id ? { background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.3)', color: '#22d3ee' } : {}}>
                  <span className="font-bold">{d.label}</span>
                  <span className="text-[10px] opacity-60">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">COLOR PALETTE</p>
            <div className="space-y-1.5">
              {COLOR_PALETTES.map(p => (
                <button key={p.id} onClick={() => setPalette(p.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs transition-all ${
                    palette === p.id ? 'border-cyan-500/30 bg-cyan-500/8 text-cyan-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'
                  }`}>
                  <div className="flex gap-1">
                    {p.colors.map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="font-semibold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">QUANTITY</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['2', '4', '6'].map(q => (
                <button key={q} onClick={() => setQuantity(q)}
                  className={`chip text-[10px] justify-center ${quantity === q ? 'active' : ''}`}
                  style={quantity === q ? { background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.3)', color: '#22d3ee' } : {}}>
                  {q} images
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="panel rounded-xl p-4 mt-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
          </div>
        </div>
      )}

      {/* Generation Loading */}
      {generating && (
        <div className="panel rounded-2xl p-6 sm:p-10 mt-6 animate-fade-up text-center">
          <div className="flex items-center justify-center gap-3 sm:gap-5 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hud-label text-[11px]" style={{ color: '#06b6d4' }}>RENDERING VISUALS</span>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-1.5 h-8 rounded-full bg-cyan-500/20" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }}>
                <div className="w-full rounded-full bg-cyan-400" style={{ height: '40%', animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Creating {quantity} variations with {STYLES.find(s => s.id === style)?.name} style...</p>
        </div>
      )}

      {/* Output Gallery */}
      {images.length > 0 && (
        <div className="mt-6 animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>GENERATED — {images.length} CREATIVES</span>
            </div>
            <button onClick={generate} className="chip text-[10px] self-start sm:self-auto">Regenerate</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {images.map((img, i) => (
              <div key={i} className="panel rounded-2xl overflow-hidden group">
                <div className="relative">
                  <img src={img.url} alt={img.alt || 'Generated creative'} className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-wrap items-end justify-center pb-4 gap-2">
                    <a href={img.url} download className="chip text-[10px]" style={{ background: 'rgba(6,182,212,0.2)', borderColor: 'rgba(6,182,212,0.3)', color: '#22d3ee' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </ModuleWrapper>
    </div>
  );
}

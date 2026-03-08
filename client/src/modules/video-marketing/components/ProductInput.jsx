import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ProductInput({ onSubmit, welcome }) {
  const { dark } = useTheme();
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [form, setForm] = useState({
    name: '', price: '', description: '',
    features: ['', '', '', '', ''],
    targetAudience: '', painPoints: '', competitors: '',
  });

  // Creative image import
  const [creativeImages, setCreativeImages] = useState([]); // selected image URLs
  const [showGallery, setShowGallery] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Auto-load image passed via "Create Video" button in Creative module
  useEffect(() => {
    const stored = localStorage.getItem('creative_video_import');
    if (stored) {
      try {
        const { url: imgUrl, alt } = JSON.parse(stored);
        if (imgUrl) setCreativeImages([{ url: imgUrl, alt }]);
      } catch {}
      localStorage.removeItem('creative_video_import');
    }
  }, []);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/creative/projects`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('overload_access_token')}`, 'X-Workspace-Id': localStorage.getItem('overload_workspace_id') || '' },
      });
      const data = await res.json();
      // Flatten all completed images from all projects
      const imgs = [];
      for (const project of (data.projects || [])) {
        for (const img of (project.images || [])) {
          if (img.status === 'completed' && img.url) {
            imgs.push({ url: img.url, alt: img.alt || project.title, projectType: project.type });
          }
        }
      }
      setGallery(imgs.slice(0, 24));
    } catch {}
    setGalleryLoading(false);
  };

  const toggleGallery = () => {
    if (!showGallery && gallery.length === 0) loadGallery();
    setShowGallery(v => !v);
  };

  const addCreativeImage = (img) => {
    if (creativeImages.length >= 3) return;
    if (creativeImages.find(i => i.url === img.url)) return;
    setCreativeImages(prev => [...prev, img]);
  };

  const removeCreativeImage = (url) => setCreativeImages(prev => prev.filter(i => i.url !== url));

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    setScrapeError('');
    try {
      const res = await fetch(`${API_BASE}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && data.product) {
        const p = data.product;
        setForm({
          name: p.name || '', price: p.price || '', description: p.description || '',
          features: [...(p.features || []).slice(0, 5), '', '', '', '', ''].slice(0, 5),
          targetAudience: '', painPoints: '', competitors: '',
        });
        setMode('manual');
      } else {
        setScrapeError(data.message || 'Failed to scrape URL');
        setMode('manual');
      }
    } catch (e) {
      setScrapeError('Network error. Please enter details manually.');
      setMode('manual');
    } finally { setScraping(false); }
  };

  const updateFeature = (index, value) => {
    const updated = [...form.features];
    updated[index] = value;
    setForm({ ...form, features: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      features: form.features.filter(f => f.trim()),
      url: url || undefined,
      images: creativeImages.map(i => i.url),
    });
  };

  const inputClass = dark
    ? 'w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 bg-transparent placeholder-gray-400'
    : 'w-full rounded-xl px-4 py-3 text-sm focus:outline-none bg-white border border-[#e8e0d4] text-[#332F2B] placeholder-[#94908A] focus:border-[#C45D3E]/30 transition-colors';

  const labelClass = dark ? 'text-gray-400' : 'text-[#94908A]';

  return (
    <div className="animate-fade-in">
      {/* Welcome hero — shown when no campaigns exist */}
      {welcome && (
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{
            background: dark ? 'rgba(139,92,246,0.1)' : 'rgba(196,93,62,0.08)',
            border: dark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(196,93,62,0.12)',
          }}>
            <svg className="w-8 h-8" fill="none" stroke={dark ? '#a78bfa' : '#C45D3E'} viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className={`text-3xl sm:text-4xl font-bold mb-3 tracking-tight ${dark ? 'text-white' : 'text-[#332F2B]'}`} style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
            Video Marketing Studio
          </h1>
          <p className={`text-base max-w-lg mx-auto leading-relaxed ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
            Generate AI-powered scripts, hooks, storyboards, and video-ready content from any product. Start by adding your first product.
          </p>

          {/* Quick feature highlights */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8">
            {[
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Angles & Hooks' },
              { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'AI Scripts' },
              { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Storyboards' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: 'UGC Briefs' },
            ].map((f, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs font-medium ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                <svg className="w-4 h-4" fill="none" stroke={dark ? '#6366f1' : '#C45D3E'} viewBox="0 0 24 24" strokeWidth={1.5} style={{ opacity: 0.6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact hero — shown when campaigns exist but user clicks New Campaign */}
      {!welcome && (
        <div className="text-center mb-8">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-2 tracking-tight ${dark ? 'text-white' : 'text-[#332F2B]'}`} style={{ letterSpacing: '-0.03em' }}>
            Create Your Campaign
          </h2>
          <p className={`text-sm max-w-md mx-auto leading-relaxed ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
            Paste a product URL or enter details manually.
          </p>
        </div>
      )}

      {/* Campaign creation card */}
      <div className={`max-w-2xl mx-auto rounded-2xl p-6 sm:p-8 ${dark ? 'glass' : 'bg-white border border-[#e8e0d4]'}`} style={{
        boxShadow: dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)',
      }}>
        {/* Mode toggle */}
        <div className={`flex rounded-xl p-1 mb-6 ${dark ? 'glass' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
          {[
            { id: 'url', label: 'Paste URL', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
            { id: 'manual', label: 'Manual Entry', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === m.id
                  ? dark
                    ? 'bg-violet-500/20 text-violet-200 shadow-sm'
                    : 'bg-white text-[#332F2B] shadow-sm border border-[#e8e0d4]'
                  : dark
                    ? 'text-gray-500 hover:text-gray-300'
                    : 'text-[#94908A] hover:text-[#332F2B]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
              </svg>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'url' && (
          <div className="mb-6 animate-fade-in">
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/product/..."
                className={inputClass + ' flex-1'}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              />
              <button
                onClick={handleScrape}
                disabled={scraping || !url.trim()}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
                style={{
                  background: dark ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'var(--lp-terra)',
                  boxShadow: dark ? '0 4px 16px -4px rgba(139,92,246,0.3)' : '0 4px 16px -4px rgba(196,93,62,0.25)',
                }}
              >
                {scraping ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scraping
                  </span>
                ) : 'Scrape'}
              </button>
            </div>
            {scrapeError && (
              <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${dark ? 'text-amber-400/80 glass' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {scrapeError}
              </div>
            )}
            <p className={`text-xs mt-3 flex items-center gap-1.5 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Supports Shopify, Amazon, and most product pages
            </p>
          </div>
        )}

        {(mode === 'manual' || form.name) && (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            <InputField label="Product Name" required value={form.name} onChange={v => setForm({ ...form, name: v })} dark={dark} inputClass={inputClass} labelClass={labelClass} />

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Price" value={form.price} onChange={v => setForm({ ...form, price: v })} placeholder="$29.99" dark={dark} inputClass={inputClass} labelClass={labelClass} />
              <InputField label="Target Audience" value={form.targetAudience} onChange={v => setForm({ ...form, targetAudience: v })} placeholder="e.g., Women 25-40" dark={dark} inputClass={inputClass} labelClass={labelClass} />
            </div>

            <div>
              <label className={`block text-xs mb-1.5 font-medium ${labelClass}`}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className={inputClass + ' resize-none'}
              />
            </div>

            <div>
              <label className={`block text-xs mb-1.5 font-medium ${labelClass}`}>Key Features (up to 5)</label>
              <div className="space-y-2">
                {form.features.map((f, i) => (
                  <input
                    key={i}
                    type="text"
                    value={f}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder={`Feature ${i + 1}`}
                    className={inputClass}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-xs mb-1.5 font-medium ${labelClass}`}>Pain Points</label>
              <textarea
                value={form.painPoints}
                onChange={(e) => setForm({ ...form, painPoints: e.target.value })}
                rows={2}
                placeholder="What problems does this product fix?"
                className={inputClass + ' resize-none'}
              />
            </div>

            <InputField label="Competitors (optional)" value={form.competitors} onChange={v => setForm({ ...form, competitors: v })} placeholder="e.g., Brand X, Brand Y" dark={dark} inputClass={inputClass} labelClass={labelClass} />

            {/* Creative Image Import */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-medium ${labelClass}`}>
                  Reference Images <span className={`text-[10px] font-normal ${dark ? 'text-gray-600' : 'text-[#b0a89e]'}`}>(from Creative &amp; Design)</span>
                </label>
                <button
                  type="button"
                  onClick={toggleGallery}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all duration-150 ${
                    dark
                      ? 'text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20'
                      : 'text-[#C45D3E] hover:text-[#a84d32] bg-[#C45D3E]/08 hover:bg-[#C45D3E]/12 border border-[#C45D3E]/20'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Browse Gallery
                </button>
              </div>

              {/* Selected images strip */}
              {creativeImages.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {creativeImages.map((img, idx) => (
                    <div key={img.url} className="relative group">
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="w-16 h-16 object-cover rounded-lg"
                        style={{ border: dark ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(196,93,62,0.2)' }}
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold px-1 rounded-sm leading-tight"
                          style={{ background: dark ? 'rgba(139,92,246,0.85)' : 'rgba(196,93,62,0.85)', color: '#fff' }}>
                          PRIMARY
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCreativeImage(img.url)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold leading-none"
                        style={{ background: '#ef4444' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {creativeImages.length < 3 && (
                    <button
                      type="button"
                      onClick={toggleGallery}
                      className={`w-16 h-16 rounded-lg flex items-center justify-center text-xs transition-all duration-150 ${
                        dark ? 'bg-white/5 hover:bg-white/10 text-gray-500' : 'bg-[#F5F0E8] hover:bg-[#ede8df] text-[#94908A] border border-dashed border-[#e8e0d4]'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Gallery picker panel */}
              {showGallery && (
                <div className={`rounded-xl overflow-hidden ${dark ? 'glass border border-white/5' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
                  <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e8e0d4' }}>
                    <span className={`text-xs font-semibold ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>Creative Gallery</span>
                    <button type="button" onClick={() => setShowGallery(false)} className={`text-xs ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-[#94908A] hover:text-[#332F2B]'}`}>✕ Close</button>
                  </div>
                  {galleryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke={dark ? '#a78bfa' : '#C45D3E'} strokeWidth="4" />
                        <path className="opacity-75" fill={dark ? '#a78bfa' : '#C45D3E'} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : gallery.length === 0 ? (
                    <div className={`text-center py-8 text-xs ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                      No Creative images yet.<br />Generate some in the Creative &amp; Design module first.
                    </div>
                  ) : (
                    <div className="p-3 grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                      {gallery.map((img) => {
                        const selected = creativeImages.find(i => i.url === img.url);
                        return (
                          <button
                            key={img.url}
                            type="button"
                            onClick={() => selected ? removeCreativeImage(img.url) : addCreativeImage(img)}
                            disabled={!selected && creativeImages.length >= 3}
                            className="relative group rounded-lg overflow-hidden transition-all duration-150 disabled:opacity-40"
                            style={{ aspectRatio: '1/1' }}
                            title={img.alt}
                          >
                            <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                            {selected && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ background: dark ? 'rgba(139,92,246,0.5)' : 'rgba(196,93,62,0.5)' }}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {!selected && (
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className={`px-3 py-2 text-[10px] ${dark ? 'text-gray-600' : 'text-[#b0a89e]'}`} style={{ borderTop: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e8e0d4' }}>
                    {creativeImages.length}/3 selected · First image used as primary reference for image-to-video scenes
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 text-sm text-white hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: dark ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'var(--lp-terra)',
                boxShadow: dark ? '0 6px 24px -4px rgba(139,92,246,0.3)' : '0 6px 24px -4px rgba(196,93,62,0.25)',
              }}
            >
              Create Campaign
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, required, inputClass, labelClass }) {
  return (
    <div>
      <label className={`block text-xs mb-1.5 font-medium ${labelClass}`}>
        {label} {required && <span style={{ color: 'var(--lp-terra)' }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        required={required}
      />
    </div>
  );
}

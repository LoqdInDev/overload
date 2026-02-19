import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';

export default function ProductInput({ onSubmit }) {
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

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    setScrapeError('');
    try {
      const res = await fetch('/api/scrape', {
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
    onSubmit({ ...form, features: form.features.filter(f => f.trim()), url: url || undefined });
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-violet-300 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI-Powered Ad Generation
        </div>
        <h2 className="text-4xl font-bold text-gradient mb-3 leading-tight">
          Create Your Campaign
        </h2>
        <p className={`text-sm max-w-md mx-auto leading-relaxed ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
          Paste a product URL or enter details manually. We'll generate scripts, hooks, storyboards, and video-ready content.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex glass rounded-2xl p-1.5 mb-8">
        {[
          { id: 'url', label: 'Paste URL', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
          { id: 'manual', label: 'Manual Entry', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl transition-all duration-200 ${
              mode === m.id
                ? dark ? 'bg-violet-500/20 text-violet-200 shadow-sm' : 'bg-violet-100 text-violet-700 shadow-sm'
                : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
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
        <div className="mb-8 animate-fade-in">
          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/product/..."
                className="relative w-full glass rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-violet-500/50 placeholder-gray-600 bg-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={scraping || !url.trim()}
              className={`px-6 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-medium text-white transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:shadow-none ${dark ? 'disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600' : 'disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400'}`}
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
            <div className="mt-3 flex items-center gap-2 text-amber-400/80 text-sm glass rounded-lg px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {scrapeError}
            </div>
          )}
          <p className={`text-xs mt-3 flex items-center gap-1.5 ${dark ? 'text-gray-600' : 'text-gray-500'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Supports Shopify, Amazon, and most product pages
          </p>
        </div>
      )}

      {(mode === 'manual' || form.name) && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
          <InputField label="Product Name" required value={form.name} onChange={v => setForm({ ...form, name: v })} />

          <div className="grid grid-cols-2 gap-4">
            <InputField label="Price" value={form.price} onChange={v => setForm({ ...form, price: v })} placeholder="$29.99" />
            <InputField label="Target Audience" value={form.targetAudience} onChange={v => setForm({ ...form, targetAudience: v })} placeholder="e.g., Women 25-40" />
          </div>

          <div>
            <label className={`block text-xs mb-1.5 font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 resize-none bg-transparent placeholder-gray-600"
            />
          </div>

          <div>
            <label className={`block text-xs mb-1.5 font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Key Features (up to 5)</label>
            <div className="space-y-2">
              {form.features.map((f, i) => (
                <input
                  key={i}
                  type="text"
                  value={f}
                  onChange={(e) => updateFeature(i, e.target.value)}
                  placeholder={`Feature ${i + 1}`}
                  className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 bg-transparent placeholder-gray-600"
                />
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs mb-1.5 font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Pain Points</label>
            <textarea
              value={form.painPoints}
              onChange={(e) => setForm({ ...form, painPoints: e.target.value })}
              rows={2}
              placeholder="What problems does this product fix?"
              className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 resize-none bg-transparent placeholder-gray-600"
            />
          </div>

          <InputField label="Competitors (optional)" value={form.competitors} onChange={v => setForm({ ...form, competitors: v })} placeholder="e.g., Brand X, Brand Y" />

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide"
          >
            Create Campaign
          </button>
        </form>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, required }) {
  const { dark } = useTheme();
  return (
    <div>
      <label className={`block text-xs mb-1.5 font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
        {label} {required && <span className="text-violet-400">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 bg-transparent placeholder-gray-600"
        required={required}
      />
    </div>
  );
}

import { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { fetchJSON } from '../../../../lib/api';

export default function StockMediaPanel({ editor }) {
  const { dark } = useTheme();
  const [tab, setTab] = useState('videos');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B] placeholder-[#94908A]'
  } border focus:outline-none`;
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const endpoint = tab === 'videos' ? '/api/video/stock-videos' : '/api/video/stock-images';
      const data = await fetchJSON(`${endpoint}?q=${encodeURIComponent(query)}`);
      setResults(data.hits || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const addStockVideo = (hit) => {
    const url = hit.url || hit.preview;
    if (!url) return;
    editor.addClip(url, hit.duration || 10, hit.thumbnail);
  };

  const addStockImage = (hit) => {
    const url = hit.url || hit.thumbnail;
    if (!url) return;
    // Add as logo overlay using the URL directly
    // We store the URL instead of dataUrl for stock images
    editor.addLogo(url);
  };

  return (
    <div className="space-y-3">
      <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
        Stock Media
      </p>

      {/* Tabs */}
      <div className="flex gap-1">
        {['videos', 'images'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setResults([]); }}
            className={`flex-1 px-2 py-1.5 rounded text-[10px] font-medium border transition-all ${
              tab === t ? chipActive : chipIdle
            }`}
          >
            {t === 'videos' ? 'Videos' : 'Images'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-1.5">
        <input
          className={inputCls}
          placeholder={`Search ${tab}...`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button
          onClick={search}
          disabled={searching}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
            dark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-[#C45D3E] text-white hover:bg-[#b5533a]'
          } disabled:opacity-50`}
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <p className={`text-[10px] mb-2 ${label}`}>{results.length} results from Pixabay</p>
          <div className="grid grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto">
            {results.map((hit, i) => (
              <button
                key={hit.id || i}
                onClick={() => tab === 'videos' ? addStockVideo(hit) : addStockImage(hit)}
                className={`group rounded-lg overflow-hidden border transition-all ${
                  dark ? 'border-white/[0.06] hover:border-violet-500/30' : 'border-[#e8e0d4] hover:border-[#C45D3E]/30'
                }`}
              >
                <div className="aspect-video bg-black relative">
                  <img
                    src={hit.thumbnail}
                    alt={hit.tags || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <span className={`opacity-0 group-hover:opacity-100 text-[9px] font-medium px-2 py-1 rounded-full transition-all ${
                      dark ? 'bg-violet-600 text-white' : 'bg-[#C45D3E] text-white'
                    }`}>
                      + Add
                    </span>
                  </div>
                  {tab === 'videos' && hit.duration && (
                    <span className="absolute bottom-1 right-1 text-[8px] px-1 py-0.5 rounded bg-black/60 text-white">
                      {hit.duration}s
                    </span>
                  )}
                </div>
                <div className={`px-1.5 py-1 ${dark ? 'bg-[#0e0e14]' : 'bg-[#f8f4ef]'}`}>
                  <p className={`text-[8px] truncate ${label}`}>
                    {hit.tags || hit.user || 'Stock media'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !searching && (
        <div className={`text-center py-6 ${label}`}>
          <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[11px]">Search free stock {tab}</p>
          <p className="text-[10px] opacity-60 mt-1">Powered by Pixabay</p>
        </div>
      )}
    </div>
  );
}

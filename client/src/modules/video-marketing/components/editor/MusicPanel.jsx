import { useState, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { fetchJSON } from '../../../../lib/api';

export default function MusicPanel({ editor }) {
  const { dark } = useTheme();
  const { musicTracks, addMusic, removeMusic, updateMusic } = editor;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const audioRef = useRef(null);

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B] placeholder-[#94908A]'
  } border focus:outline-none`;

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await fetchJSON(`/api/video/music-search?q=${encodeURIComponent(query)}`);
      setResults(data.hits || []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const togglePreview = (url) => {
    if (previewUrl === url) {
      audioRef.current?.pause();
      setPreviewUrl(null);
    } else {
      setPreviewUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      addMusic(file.name, url, audio.duration || 30);
    };
    audio.onerror = () => {
      addMusic(file.name, url, 30);
    };
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <audio ref={audioRef} onEnded={() => setPreviewUrl(null)} />

      {/* Search */}
      <div>
        <p className={`text-[11px] font-medium mb-2 ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>Find Free Music</p>
        <div className="flex gap-1.5">
          <input
            className={inputCls}
            placeholder="Search music..."
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
      </div>

      {/* Upload */}
      <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all border border-dashed ${
        dark ? 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:border-[#C45D3E]/30 hover:text-[#332F2B]'
      }`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload your own audio file
        <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
      </label>

      {/* Search results */}
      {results.length > 0 && (
        <div>
          <p className={`text-[10px] mb-2 ${label}`}>{results.length} results</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((hit, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  dark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#EDE5DA]'
                }`}
              >
                <button
                  onClick={() => togglePreview(hit.previewUrl || hit.audio)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    previewUrl === (hit.previewUrl || hit.audio)
                      ? dark ? 'bg-violet-500 text-white' : 'bg-[#C45D3E] text-white'
                      : dark ? 'bg-white/[0.06] text-gray-400' : 'bg-[#EDE5DA] text-[#5c5955]'
                  }`}
                >
                  {previewUrl === (hit.previewUrl || hit.audio) ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  ) : (
                    <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-medium truncate ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
                    {hit.title || hit.tags || `Track ${i + 1}`}
                  </p>
                  <p className={`text-[10px] ${label}`}>{hit.duration ? `${hit.duration}s` : ''}</p>
                </div>
                <button
                  onClick={() => addMusic(hit.title || hit.tags || `Track ${i + 1}`, hit.audio || hit.previewUrl, hit.duration || 30)}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-all ${
                    dark ? 'text-violet-300 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'
                  }`}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Added tracks */}
      {musicTracks.length > 0 && (
        <div>
          <p className={`text-[11px] font-medium mb-2 ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
            Added Tracks ({musicTracks.length})
          </p>
          <div className="space-y-2">
            {musicTracks.map(track => (
              <div key={track.id} className={`p-2 rounded-lg border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-[#e8e0d4] bg-[#f8f4ef]'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-medium truncate ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {track.title}
                  </span>
                  <button
                    onClick={() => removeMusic(track.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div>
                  <label className={`text-[9px] ${label}`}>Volume</label>
                  <input
                    type="range"
                    className="w-full accent-emerald-500"
                    min={0} max={1} step={0.05}
                    value={track.volume}
                    onChange={e => updateMusic(track.id, { volume: parseFloat(e.target.value) })}
                  />
                  <span className={`text-[9px] ${label}`}>{Math.round(track.volume * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

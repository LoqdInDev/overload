import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODULE_REGISTRY, CATEGORIES } from '../../config/modules';
import { useTheme } from '../../context/ThemeContext';

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { dark } = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return MODULE_REGISTRY.slice(0, 8);
    const q = query.toLowerCase();
    return MODULE_REGISTRY.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.category.includes(q)
    ).slice(0, 10);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (mod) => {
    navigate(mod.path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const bg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.1)';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#F8F6F3';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const muted = '#94908A';
  const selectedBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(196,93,62,0.06)';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[18vh] p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-up overflow-hidden"
        style={{ background: bg, border: `1px solid ${border}` }}
        role="dialog"
        aria-modal="true"
        aria-label="Search modules"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: muted }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: ink }}
            aria-label="Search modules"
          />
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: inputBg, color: muted, border: `1px solid ${border}` }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2" role="listbox">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: muted }}>
              No modules found
            </div>
          ) : (
            results.map((mod, i) => {
              const cat = CATEGORIES.find(c => c.id === mod.category);
              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelect(mod)}
                  role="option"
                  aria-selected={i === selectedIndex}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100"
                  style={{
                    background: i === selectedIndex ? selectedBg : 'transparent',
                    color: ink,
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${mod.color}15` }}
                  >
                    <svg className="w-4 h-4" style={{ color: mod.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{mod.name}</div>
                  </div>
                  <span
                    className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded"
                    style={{ color: cat?.color || muted, background: `${cat?.color || muted}12` }}
                  >
                    {cat?.label || mod.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 text-[10px]" style={{ borderTop: `1px solid ${border}`, color: muted }}>
          <span>Navigate with <kbd className="font-mono">↑↓</kbd> &middot; Select with <kbd className="font-mono">↵</kbd></span>
        </div>
      </div>
    </div>
  );
}

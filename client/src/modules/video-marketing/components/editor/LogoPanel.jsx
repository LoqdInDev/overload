import { useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

export default function LogoPanel({ editor }) {
  const { dark } = useTheme();
  const fileRef = useRef(null);
  const { logos, selectedLogo, selectedLogoId, setSelectedLogoId, addLogo, removeLogo, updateLogo } = editor;

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B]'
  } border focus:outline-none`;

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addLogo(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (selectedLogo) {
    const l = selectedLogo;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedLogoId(null)}
            className={`flex items-center gap-1 text-[11px] ${dark ? 'text-gray-400 hover:text-white' : 'text-[#94908A] hover:text-[#332F2B]'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>Edit Logo</span>
        </div>

        <div className={`w-full rounded-lg p-4 flex items-center justify-center ${dark ? 'bg-white/[0.04]' : 'bg-[#f0ebe4]'}`}>
          <img src={l.dataUrl} alt="Logo" style={{ maxWidth: '120px', maxHeight: '80px', opacity: l.opacity ?? 0.8 }} />
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Width (px)</label>
          <input type="range" className="w-full accent-violet-500" min={20} max={200} value={l.width || 80}
            onChange={e => updateLogo(l.id, { width: parseInt(e.target.value) })} />
          <span className={`text-[10px] ${label}`}>{l.width || 80}px</span>
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Opacity</label>
          <input type="range" className="w-full accent-violet-500" min={0.05} max={1} step={0.05} value={l.opacity ?? 0.8}
            onChange={e => updateLogo(l.id, { opacity: parseFloat(e.target.value) })} />
          <span className={`text-[10px] ${label}`}>{Math.round((l.opacity ?? 0.8) * 100)}%</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>X Position (%)</label>
            <input type="range" className="w-full accent-violet-500" min={0} max={100} value={l.x}
              onChange={e => updateLogo(l.id, { x: parseInt(e.target.value) })} />
          </div>
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>Y Position (%)</label>
            <input type="range" className="w-full accent-violet-500" min={0} max={100} value={l.y}
              onChange={e => updateLogo(l.id, { y: parseInt(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Quick Position</label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'TL', x: 10, y: 10 }, { label: 'TC', x: 50, y: 10 }, { label: 'TR', x: 90, y: 10 },
              { label: 'ML', x: 10, y: 50 }, { label: 'MC', x: 50, y: 50 }, { label: 'MR', x: 90, y: 50 },
              { label: 'BL', x: 10, y: 90 }, { label: 'BC', x: 50, y: 90 }, { label: 'BR', x: 90, y: 90 },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => updateLogo(l.id, { x: p.x, y: p.y })}
                className={`py-1 rounded text-[9px] font-medium border transition-all ${
                  l.x === p.x && l.y === p.y
                    ? dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]'
                    : dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => removeLogo(l.id)}
          className="w-full py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
        >
          Remove Logo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
          Logos & Watermarks ({logos.length})
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            dark ? 'text-violet-300 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload Logo
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>

      {logos.length === 0 ? (
        <div className={`text-center py-6 ${label}`}>
          <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[11px]">No logos yet</p>
          <p className="text-[10px] opacity-60 mt-1">Upload a PNG/SVG for your watermark</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logos.map(l => (
            <button
              key={l.id}
              onClick={() => setSelectedLogoId(l.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                dark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#EDE5DA]'
              }`}
            >
              <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/[0.04]' : 'bg-[#f0ebe4]'}`}>
                <img src={l.dataUrl} alt="" className="max-w-full max-h-full object-contain" style={{ opacity: l.opacity ?? 0.8 }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
                  Logo ({l.width || 80}px)
                </p>
                <p className={`text-[10px] ${label}`}>
                  Position: {l.x}%, {l.y}% &middot; {Math.round((l.opacity ?? 0.8) * 100)}% opacity
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useTheme } from '../../../../context/ThemeContext';
import { ANIMATIONS } from './hooks/useEditorState';

export default function TextOverlayPanel({ editor }) {
  const { dark } = useTheme();
  const { textOverlays, selectedOverlay, selectedOverlayId, setSelectedOverlayId,
          addOverlay, removeOverlay, updateOverlay, clearAllOverlays, totalDuration } = editor;

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B]'
  } border focus:outline-none`;

  if (selectedOverlay) {
    const o = selectedOverlay;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedOverlayId(null)}
            className={`flex items-center gap-1 text-[11px] ${dark ? 'text-gray-400 hover:text-white' : 'text-[#94908A] hover:text-[#332F2B]'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>Edit Text</span>
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Text</label>
          <input className={inputCls} value={o.text} onChange={e => updateOverlay(o.id, { text: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>Font Size</label>
            <input type="number" className={inputCls} value={o.fontSize} min={12} max={120} onChange={e => updateOverlay(o.id, { fontSize: parseInt(e.target.value) || 32 })} />
          </div>
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>Color</label>
            <div className="flex gap-1">
              <input type="color" className="w-8 h-8 rounded cursor-pointer" value={o.color} onChange={e => updateOverlay(o.id, { color: e.target.value })} />
              <input className={inputCls} value={o.color} onChange={e => updateOverlay(o.id, { color: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>X Position (%)</label>
            <input type="range" className="w-full accent-violet-500" min={0} max={100} value={o.x} onChange={e => updateOverlay(o.id, { x: parseInt(e.target.value) })} />
          </div>
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>Y Position (%)</label>
            <input type="range" className="w-full accent-violet-500" min={0} max={100} value={o.y} onChange={e => updateOverlay(o.id, { y: parseInt(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Background</label>
          <select className={inputCls} value={o.bg} onChange={e => updateOverlay(o.id, { bg: e.target.value })}>
            <option value="rgba(0,0,0,0.5)">Dark</option>
            <option value="rgba(0,0,0,0.8)">Dark (strong)</option>
            <option value="rgba(255,255,255,0.8)">Light</option>
            <option value="transparent">None</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>Start (s)</label>
            <input type="number" className={inputCls} value={o.startTime.toFixed(1)} min={0} max={o.endTime - 0.5} step={0.1} onChange={e => updateOverlay(o.id, { startTime: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className={`text-[10px] font-medium mb-1 block ${label}`}>End (s)</label>
            <input type="number" className={inputCls} value={o.endTime.toFixed(1)} min={o.startTime + 0.5} max={totalDuration} step={0.1} onChange={e => updateOverlay(o.id, { endTime: parseFloat(e.target.value) || o.endTime })} />
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Style</label>
          <div className="flex gap-1.5">
            {['bold', 'normal'].map(w => (
              <button
                key={w}
                onClick={() => updateOverlay(o.id, { fontWeight: w })}
                className={`px-3 py-1 rounded text-[10px] font-medium border transition-all ${
                  o.fontWeight === w
                    ? dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]'
                    : dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]'
                }`}
                style={{ fontWeight: w }}
              >
                {w === 'bold' ? 'Bold' : 'Normal'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Animation</label>
          <div className="flex flex-wrap gap-1">
            {ANIMATIONS.map(a => (
              <button
                key={a.key}
                onClick={() => updateOverlay(o.id, { animation: a.key })}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                  (o.animation || 'none') === a.key
                    ? dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]'
                    : dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => removeOverlay(o.id)}
          className="w-full py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
        >
          Remove Overlay
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
          Text Overlays ({textOverlays.length})
        </p>
        <button
          onClick={() => addOverlay()}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            dark ? 'text-violet-300 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Text
        </button>
      </div>

      {textOverlays.length === 0 ? (
        <div className={`text-center py-6 ${label}`}>
          <p className="text-[11px]">No text overlays</p>
          <p className="text-[10px] opacity-60 mt-1">Add captions, titles, or labels</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {textOverlays.map(o => (
              <div
                key={o.id}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                  dark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#EDE5DA]'
                }`}
              >
                <div
                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ background: o.bg, color: o.color, fontSize: 10, fontWeight: o.fontWeight }}
                  onClick={() => setSelectedOverlayId(o.id)}
                >
                  Aa
                </div>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedOverlayId(o.id)}>
                  <p className={`text-[11px] font-medium truncate ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>{o.text}</p>
                  <p className={`text-[10px] ${label}`}>{o.startTime.toFixed(1)}s - {o.endTime.toFixed(1)}s</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeOverlay(o.id); }}
                  className={`flex-shrink-0 p-1 rounded-md transition-all ${
                    dark ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10' : 'text-[#c0b8ac] hover:text-red-500 hover:bg-red-500/10'
                  }`}
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {textOverlays.length > 1 && (
            <button
              onClick={clearAllOverlays}
              className={`w-full mt-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                dark ? 'border-white/[0.08] text-gray-500 hover:text-red-400 hover:border-red-500/20' : 'border-[#e8e0d4] text-[#94908A] hover:text-red-500 hover:border-red-500/20'
              }`}
            >
              Clear All Overlays
            </button>
          )}
        </>
      )}
    </div>
  );
}

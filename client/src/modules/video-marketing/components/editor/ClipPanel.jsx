import { useTheme } from '../../../../context/ThemeContext';
import { TRANSITIONS, SPEED_OPTIONS } from './hooks/useEditorState';

export default function ClipPanel({ editor }) {
  const { dark } = useTheme();
  const { clips, selectedClip, selectedClipId, setSelectedClipId, updateClip, removeClip,
          duplicateClip, splitClip, playheadTime, getSplitPointForClip, getEffectiveDuration } = editor;

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B]'
  } border focus:outline-none`;
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  if (clips.length === 0) {
    return (
      <div className={`text-center py-8 ${label}`}>
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-[11px]">No clips yet</p>
        <p className="text-[10px] opacity-60 mt-1">Import videos to start editing</p>
      </div>
    );
  }

  if (!selectedClip) {
    return (
      <div>
        <p className={`text-[11px] font-medium mb-3 ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
          Clips ({clips.length})
        </p>
        <div className="space-y-1.5">
          {clips.map((clip, i) => (
            <button
              key={clip.id}
              onClick={() => setSelectedClipId(clip.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                dark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#EDE5DA]'
              }`}
            >
              <div className="w-12 h-8 rounded bg-black flex-shrink-0 overflow-hidden">
                {clip.thumbnail ? (
                  <img src={clip.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
                  Clip {i + 1}
                  {clip.speed !== 1 && <span className="ml-1 opacity-60">{clip.speed}x</span>}
                </p>
                <p className={`text-[10px] ${label}`}>
                  {getEffectiveDuration(clip).toFixed(1)}s
                  {clip.transition !== 'none' && <span className="ml-1">+ {clip.transition}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const clip = selectedClip;
  const effectiveDur = getEffectiveDuration(clip);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedClipId(null)}
          className={`flex items-center gap-1 text-[11px] ${dark ? 'text-gray-400 hover:text-white' : 'text-[#94908A] hover:text-[#332F2B]'}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
          Clip Properties
        </span>
      </div>

      {/* Thumbnail */}
      <div className="w-full aspect-video rounded-lg bg-black overflow-hidden">
        {clip.thumbnail ? (
          <img src={clip.thumbnail} className="w-full h-full object-cover" alt="" />
        ) : (
          <video src={clip.sourceUrl} className="w-full h-full object-contain" muted preload="metadata" />
        )}
      </div>

      {/* Zoom & Pan */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-[10px] font-medium ${label}`}>Zoom & Focus</label>
          {(clip.zoom || 1) > 1 && (
            <button
              onClick={() => updateClip(clip.id, { zoom: 1, panX: 50, panY: 50 })}
              className={`text-[9px] px-1 rounded ${dark ? 'text-violet-400 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'}`}
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <input type="range" className="flex-1 accent-violet-500" min={1} max={3} step={0.1} value={clip.zoom || 1}
            onChange={(e) => updateClip(clip.id, { zoom: parseFloat(e.target.value) })} />
          <span className={`text-[10px] font-mono w-8 text-right ${dark ? 'text-gray-400' : 'text-[#5c5955]'}`}>{(clip.zoom || 1).toFixed(1)}x</span>
        </div>
        {(clip.zoom || 1) > 1 && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[9px] mb-0.5 block ${label}`}>Focus X</label>
              <input type="range" className="w-full accent-violet-500" min={0} max={100} value={clip.panX ?? 50}
                onChange={(e) => updateClip(clip.id, { panX: parseInt(e.target.value) })} />
              <div className={`flex justify-between text-[8px] ${label}`}><span>Left</span><span>Right</span></div>
            </div>
            <div>
              <label className={`text-[9px] mb-0.5 block ${label}`}>Focus Y</label>
              <input type="range" className="w-full accent-violet-500" min={0} max={100} value={clip.panY ?? 50}
                onChange={(e) => updateClip(clip.id, { panY: parseInt(e.target.value) })} />
              <div className={`flex justify-between text-[8px] ${label}`}><span>Top</span><span>Bottom</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-1.5">
        <button
          onClick={() => duplicateClip(clip.id)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${chipIdle}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Duplicate
        </button>
        <button
          onClick={() => {
            const sp = getSplitPointForClip(playheadTime);
            if (sp && sp.clipId === clip.id) splitClip(clip.id, sp.localTime);
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${chipIdle}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
          </svg>
          Split
        </button>
      </div>

      {/* Trim controls */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Trim Start</label>
          <input type="number" className={inputCls} value={clip.trimStart.toFixed(1)} min={0} max={clip.trimEnd - 0.5} step={0.1}
            onChange={(e) => updateClip(clip.id, { trimStart: Math.max(0, parseFloat(e.target.value) || 0) })} />
        </div>
        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Trim End</label>
          <input type="number" className={inputCls} value={clip.trimEnd.toFixed(1)} min={clip.trimStart + 0.5} max={clip.duration} step={0.1}
            onChange={(e) => updateClip(clip.id, { trimEnd: Math.min(clip.duration, parseFloat(e.target.value) || clip.duration) })} />
        </div>
      </div>

      <p className={`text-[10px] ${label}`}>
        Effective: {effectiveDur.toFixed(1)}s (of {clip.duration.toFixed(1)}s source)
      </p>

      {/* Speed */}
      <div>
        <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Speed</label>
        <div className="flex flex-wrap gap-1">
          {SPEED_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => updateClip(clip.id, { speed: s })}
              className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                (clip.speed || 1) === s ? chipActive : chipIdle
              }`}
            >
              {s === 1 ? '1x' : s < 1 ? `${s}x slow` : `${s}x`}
            </button>
          ))}
        </div>
      </div>

      {/* Transition */}
      <div>
        <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Transition (into this clip)</label>
        <div className="flex flex-wrap gap-1">
          {TRANSITIONS.map(t => (
            <button
              key={t.key}
              onClick={() => updateClip(clip.id, { transition: t.key })}
              className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                (clip.transition || 'none') === t.key ? chipActive : chipIdle
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Volume</label>
        <input type="range" className="w-full accent-violet-500" min={0} max={1} step={0.05} value={clip.volume}
          onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })} />
        <span className={`text-[10px] ${label}`}>{Math.round(clip.volume * 100)}%</span>
      </div>

      {/* Delete */}
      <button
        onClick={() => removeClip(clip.id)}
        className="w-full py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
      >
        Remove Clip
      </button>
    </div>
  );
}

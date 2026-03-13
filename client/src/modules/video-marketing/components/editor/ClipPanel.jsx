import { useTheme } from '../../../../context/ThemeContext';

export default function ClipPanel({ editor }) {
  const { dark } = useTheme();
  const { clips, selectedClip, selectedClipId, setSelectedClipId, updateClip, removeClip } = editor;

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B]'
  } border focus:outline-none`;

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
                </p>
                <p className={`text-[10px] ${label}`}>
                  {(clip.trimEnd - clip.trimStart).toFixed(1)}s
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Selected clip detail
  const clip = selectedClip;
  const effectiveDur = clip.trimEnd - clip.trimStart;

  return (
    <div className="space-y-4">
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

      {/* Trim controls */}
      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Trim Start (s)</label>
        <input
          type="number"
          className={inputCls}
          value={clip.trimStart.toFixed(1)}
          min={0}
          max={clip.trimEnd - 0.5}
          step={0.1}
          onChange={(e) => updateClip(clip.id, { trimStart: Math.max(0, parseFloat(e.target.value) || 0) })}
        />
      </div>

      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Trim End (s)</label>
        <input
          type="number"
          className={inputCls}
          value={clip.trimEnd.toFixed(1)}
          min={clip.trimStart + 0.5}
          max={clip.duration}
          step={0.1}
          onChange={(e) => updateClip(clip.id, { trimEnd: Math.min(clip.duration, parseFloat(e.target.value) || clip.duration) })}
        />
      </div>

      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Duration</label>
        <p className={`text-xs ${dark ? 'text-white' : 'text-[#332F2B]'}`}>{effectiveDur.toFixed(1)}s (of {clip.duration.toFixed(1)}s)</p>
      </div>

      {/* Volume */}
      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Volume</label>
        <input
          type="range"
          className="w-full accent-violet-500"
          min={0}
          max={1}
          step={0.05}
          value={clip.volume}
          onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
        />
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

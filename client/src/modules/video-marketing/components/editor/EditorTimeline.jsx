import { useRef, useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PX_PER_SEC = 80;
const TRACK_HEIGHT = 56;
const RULER_HEIGHT = 24;

const TRANSITION_ICONS = {
  fade: 'F',
  dissolve: 'D',
  'slide-left': '\u2190',
  'slide-right': '\u2192',
  'slide-up': '\u2191',
  wipe: 'W',
  zoom: 'Z',
};

export default function EditorTimeline({ editor }) {
  const { dark } = useTheme();
  const scrollRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const { clips, musicTracks, textOverlays, playheadTime, setPlayheadTime, totalDuration,
          selectedClipId, setSelectedClipId, moveClip, updateClip, getEffectiveDuration } = editor;

  const timelineWidth = Math.max(totalDuration * PX_PER_SEC, 600);
  const border = dark ? 'border-white/[0.06]' : 'border-[#e8e0d4]';

  const handleTimelineClick = useCallback((e) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    const time = Math.max(0, Math.min(x / PX_PER_SEC, totalDuration));
    setPlayheadTime(time);
  }, [totalDuration, setPlayheadTime]);

  const handlePlayheadDown = (e) => {
    e.stopPropagation();
    setDragging({ type: 'playhead' });
  };

  const handleClipDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.dataTransfer.effectAllowed = 'move';
    setDragging({ type: 'clip', index });
  };

  const handleClipDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(index);
  };

  const handleClipDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      moveClip(fromIndex, toIndex);
    }
    setDragging(null);
    setDragOver(null);
  };

  const handleTrimDown = (e, clipId, edge) => {
    e.stopPropagation();
    e.preventDefault();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    const startX = e.clientX;
    const origStart = clip.trimStart;
    const origEnd = clip.trimEnd;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dt = dx / PX_PER_SEC * (clip.speed || 1);
      if (edge === 'start') {
        const newStart = Math.max(0, Math.min(origStart + dt, origEnd - 0.5));
        updateClip(clipId, { trimStart: newStart });
      } else {
        const newEnd = Math.max(origStart + 0.5, Math.min(origEnd + dt, clip.duration));
        updateClip(clipId, { trimEnd: newEnd });
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (!dragging || dragging.type !== 'playhead') return;
    const onMove = (e) => {
      const rect = scrollRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
      setPlayheadTime(Math.max(0, Math.min(x / PX_PER_SEC, totalDuration)));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, totalDuration]);

  const ticks = [];
  const step = totalDuration > 30 ? 5 : totalDuration > 10 ? 2 : 1;
  for (let t = 0; t <= totalDuration + step; t += step) ticks.push(t);

  let clipPositions = [];
  let acc = 0;
  for (const clip of clips) {
    const dur = getEffectiveDuration(clip);
    clipPositions.push({ clip, x: acc * PX_PER_SEC, width: dur * PX_PER_SEC });
    acc += dur;
  }

  const accent = dark ? '#8b5cf6' : '#C45D3E';

  return (
    <div className={`flex-shrink-0 border-t ${border} ${dark ? 'bg-[#08080d]' : 'bg-[#f0ebe4]'}`}>
      <div className="flex">
        <div className={`w-10 sm:w-20 flex-shrink-0 border-r ${border}`}>
          <div style={{ height: RULER_HEIGHT }} />
          <div className={`flex items-center justify-center text-[10px] font-medium ${dark ? 'text-gray-500' : 'text-[#94908A]'}`} style={{ height: TRACK_HEIGHT }}>
            Video
          </div>
          {musicTracks.length > 0 && (
            <div className={`flex items-center justify-center text-[10px] font-medium ${dark ? 'text-gray-500' : 'text-[#94908A]'}`} style={{ height: 36 }}>
              Music
            </div>
          )}
          {textOverlays.length > 0 && (
            <div className={`flex items-center justify-center text-[10px] font-medium ${dark ? 'text-gray-500' : 'text-[#94908A]'}`} style={{ height: 36 }}>
              Text
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden" style={{ minHeight: RULER_HEIGHT + TRACK_HEIGHT + (musicTracks.length > 0 ? 36 : 0) + (textOverlays.length > 0 ? 36 : 0) + 8 }}>
          <div style={{ width: timelineWidth + 40, position: 'relative' }} onClick={handleTimelineClick}>
            {/* Ruler */}
            <div className={`border-b ${border} relative`} style={{ height: RULER_HEIGHT }}>
              {ticks.map(t => (
                <div key={t} className="absolute top-0" style={{ left: t * PX_PER_SEC }}>
                  <div className={`w-px h-2 ${dark ? 'bg-white/10' : 'bg-[#d0c8bc]'}`} />
                  <span className={`absolute top-2 text-[9px] -translate-x-1/2 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>{t}s</span>
                </div>
              ))}
            </div>

            {/* Video track */}
            <div className={`relative border-b ${border}`} style={{ height: TRACK_HEIGHT }}>
              {clipPositions.map(({ clip, x, width }, i) => {
                const selected = clip.id === selectedClipId;
                const isDropTarget = dragOver === i;
                const hasTransition = clip.transition && clip.transition !== 'none' && i > 0;
                return (
                  <div key={clip.id} className="absolute" style={{ left: x, top: 0, bottom: 0, width: Math.max(width, 24) }}>
                    {/* Transition marker */}
                    {hasTransition && (
                      <div
                        className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{
                          background: dark ? 'rgba(139,92,246,0.9)' : 'rgba(196,93,62,0.9)',
                          color: '#fff',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}
                        title={`Transition: ${clip.transition}`}
                      >
                        {TRANSITION_ICONS[clip.transition] || 'T'}
                      </div>
                    )}

                    <div
                      draggable
                      onDragStart={(e) => handleClipDragStart(e, i)}
                      onDragOver={(e) => handleClipDragOver(e, i)}
                      onDrop={(e) => handleClipDrop(e, i)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                      className={`absolute inset-x-0 top-1 bottom-1 rounded-lg cursor-grab active:cursor-grabbing transition-all overflow-hidden ${
                        selected
                          ? dark ? 'ring-2 ring-violet-400' : 'ring-2 ring-[#C45D3E]'
                          : isDropTarget
                            ? dark ? 'ring-1 ring-violet-400/50' : 'ring-1 ring-[#C45D3E]/50'
                            : ''
                      }`}
                      style={{
                        background: dark
                          ? `linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.1))`
                          : `linear-gradient(135deg, rgba(196,93,62,0.2), rgba(196,93,62,0.08))`,
                        border: `1px solid ${dark ? 'rgba(139,92,246,0.3)' : 'rgba(196,93,62,0.25)'}`,
                      }}
                    >
                      {clip.thumbnail && (
                        <img src={clip.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
                      )}

                      <div className="relative z-10 flex items-center gap-1 px-2 h-full">
                        <svg className={`w-3 h-3 flex-shrink-0 ${dark ? 'text-violet-300' : 'text-[#C45D3E]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                        <span className={`text-[10px] font-medium truncate ${dark ? 'text-white/80' : 'text-[#332F2B]'}`}>
                          {getEffectiveDuration(clip).toFixed(1)}s
                        </span>
                        {clip.speed !== 1 && (
                          <span className={`text-[8px] px-1 py-0.5 rounded ${dark ? 'bg-white/10 text-violet-300' : 'bg-[#C45D3E]/10 text-[#C45D3E]'}`}>
                            {clip.speed}x
                          </span>
                        )}
                      </div>

                      {/* Trim handles */}
                      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20 z-20"
                        onMouseDown={(e) => handleTrimDown(e, clip.id, 'start')}>
                        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ background: accent }} />
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20 z-20"
                        onMouseDown={(e) => handleTrimDown(e, clip.id, 'end')}>
                        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ background: accent }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Music track */}
            {musicTracks.length > 0 && (
              <div className={`relative border-b ${border}`} style={{ height: 36 }}>
                {musicTracks.map(track => (
                  <div key={track.id} className="absolute top-1 bottom-1 rounded-md"
                    style={{
                      left: track.startTime * PX_PER_SEC,
                      width: Math.min((track.duration || totalDuration) * PX_PER_SEC, timelineWidth),
                      background: dark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.12)',
                      border: `1px solid ${dark ? 'rgba(52,211,153,0.3)' : 'rgba(16,185,129,0.25)'}`,
                    }}>
                    <div className="flex items-center gap-1 px-2 h-full">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13" />
                      </svg>
                      <span className={`text-[9px] truncate ${dark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>{track.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Text overlay track */}
            {textOverlays.length > 0 && (
              <div className={`relative border-b ${border}`} style={{ height: 36 }}>
                {textOverlays.map(o => (
                  <div key={o.id}
                    className={`absolute top-1 bottom-1 rounded-md cursor-pointer ${
                      o.id === editor.selectedOverlayId ? (dark ? 'ring-1 ring-amber-400' : 'ring-1 ring-amber-600') : ''
                    }`}
                    onClick={(e) => { e.stopPropagation(); editor.setSelectedOverlayId(o.id); }}
                    style={{
                      left: o.startTime * PX_PER_SEC,
                      width: Math.max((o.endTime - o.startTime) * PX_PER_SEC, 20),
                      background: dark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)',
                      border: `1px solid ${dark ? 'rgba(251,191,36,0.3)' : 'rgba(217,119,6,0.25)'}`,
                    }}>
                    <div className="flex items-center gap-1 px-2 h-full">
                      <span className={`text-[9px] truncate ${dark ? 'text-amber-300/80' : 'text-amber-700'}`}>{o.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Playhead */}
            <div className="absolute z-30 cursor-col-resize"
              style={{ left: playheadTime * PX_PER_SEC - 5, top: 0, bottom: 0, width: 10 }}
              onMouseDown={handlePlayheadDown}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2"
                style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${accent}` }} />
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bottom-0"
                style={{ width: 1.5, background: accent, borderRadius: 1 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

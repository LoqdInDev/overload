import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { ASPECT_RATIOS } from './hooks/useEditorState';

const ANIM_DURATION = 0.6; // seconds
const TRANSITION_DURATION = 0.5; // seconds

const getTransitionStyle = (transition, progress) => {
  if (!transition || transition === 'none' || progress >= TRANSITION_DURATION) return {};
  const t = Math.min(progress / TRANSITION_DURATION, 1);
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  switch (transition) {
    case 'fade':
      return { opacity: ease };
    case 'dissolve':
      return { opacity: ease, filter: `blur(${(1 - ease) * 4}px)` };
    case 'slide-left':
      return { opacity: 1, transform: `translateX(${(1 - ease) * 100}%)` };
    case 'slide-right':
      return { opacity: 1, transform: `translateX(${(ease - 1) * 100}%)` };
    case 'slide-up':
      return { opacity: 1, transform: `translateY(${(1 - ease) * 100}%)` };
    case 'wipe':
      return { clipPath: `inset(0 ${(1 - ease) * 100}% 0 0)` };
    case 'zoom': {
      const scale = 0.3 + ease * 0.7;
      return { opacity: ease, transform: `scale(${scale})` };
    }
    default:
      return {};
  }
};

const getAnimationStyle = (animation, progress) => {
  if (!animation || animation === 'none' || progress >= 1) return {};
  const t = Math.min(progress / ANIM_DURATION, 1);
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  switch (animation) {
    case 'fade-in':
      return { opacity: ease };
    case 'slide-up':
      return { opacity: ease, transform: `translate(-50%, -50%) translateY(${(1 - ease) * 30}px)` };
    case 'slide-down':
      return { opacity: ease, transform: `translate(-50%, -50%) translateY(${(ease - 1) * 30}px)` };
    case 'slide-left':
      return { opacity: ease, transform: `translate(-50%, -50%) translateX(${(1 - ease) * 40}px)` };
    case 'slide-right':
      return { opacity: ease, transform: `translate(-50%, -50%) translateX(${(ease - 1) * 40}px)` };
    case 'pop-in': {
      const scale = ease < 1 ? 0.3 + ease * 0.7 + Math.sin(ease * Math.PI) * 0.15 : 1;
      return { opacity: ease, transform: `translate(-50%, -50%) scale(${scale})` };
    }
    case 'bounce-in': {
      const bounce = ease < 0.6 ? ease / 0.6 : 1 + Math.sin((ease - 0.6) / 0.4 * Math.PI * 2) * 0.12 * (1 - ease);
      return { opacity: Math.min(ease * 2, 1), transform: `translate(-50%, -50%) scale(${0.3 + bounce * 0.7})` };
    }
    case 'blur-in':
      return { opacity: ease, filter: `blur(${(1 - ease) * 8}px)` };
    case 'typewriter':
      return { clipPath: `inset(0 ${(1 - ease) * 100}% 0 0)` };
    default:
      return {};
  }
};

export default function EditorPreview({ editor, mobile }) {
  const { dark } = useTheme();
  const videoRef = useRef(null);
  const animRef = useRef(null);
  const viewportRef = useRef(null);

  const { clips, textOverlays, logos, playheadTime, setPlayheadTime, playing, setPlaying,
          getClipAtTime, totalDuration, aspectRatio, setAspectRatio,
          updateOverlay, updateLogo, selectedOverlayId, setSelectedOverlayId,
          selectedLogoId, setSelectedLogoId } = editor;

  const current = getClipAtTime(playheadTime);
  const ratioObj = ASPECT_RATIOS.find(r => r.key === aspectRatio) || ASPECT_RATIOS[0];

  // Calculate how far into the current clip we are (for transitions)
  const clipElapsed = useMemo(() => {
    if (!current) return 0;
    let acc = 0;
    for (const clip of clips) {
      if (clip.id === current.clip.id) {
        return playheadTime - acc;
      }
      acc += (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
    }
    return 0;
  }, [current?.clip?.id, playheadTime, clips]);

  // Build CSS filter string for current clip (filters + color grading)
  const buildFilter = (clip) => {
    const parts = [];
    if (clip?.filters) {
      const f = clip.filters;
      if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
      if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
      if (f.saturation !== 100) parts.push(`saturate(${f.saturation}%)`);
      if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
    }
    // Color grading: temperature, tint, exposure, highlights, shadows
    if (clip?.grading) {
      const g = clip.grading;
      if (g.temperature && g.temperature !== 0) {
        // Warm = more sepia, Cool = more hue-rotate
        if (g.temperature > 0) parts.push(`sepia(${g.temperature / 2}%)`);
        else parts.push(`hue-rotate(${g.temperature * 0.5}deg)`);
      }
      if (g.exposure && g.exposure !== 0) {
        parts.push(`brightness(${100 + g.exposure}%)`);
      }
      if (g.highlights && g.highlights !== 0) {
        // Approximate highlights with contrast
        parts.push(`contrast(${100 + g.highlights * 0.3}%)`);
      }
    }
    return parts.length ? parts.join(' ') : 'none';
  };

  // Sync video element with playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;

    if (video.src !== current.clip.sourceUrl) {
      video.src = current.clip.sourceUrl;
    }

    const speed = current.clip.speed || 1;
    if (video.playbackRate !== speed) video.playbackRate = speed;

    const diff = Math.abs(video.currentTime - current.localTime);
    if (diff > 0.3) {
      video.currentTime = current.localTime;
    }
  }, [current?.clip?.sourceUrl, current?.localTime, playheadTime]);

  // Play/pause sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing && current) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, current?.clip?.id]);

  // Advance playhead during playback
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayheadTime(t => {
        const next = t + dt;
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, totalDuration]);

  const togglePlay = () => {
    if (clips.length === 0) return;
    if (playheadTime >= totalDuration) setPlayheadTime(0);
    setPlaying(!playing);
  };

  const activeOverlays = textOverlays.filter(o => playheadTime >= o.startTime && playheadTime <= o.endTime);

  const handleDragStart = useCallback((e, type, id) => {
    e.preventDefault();
    e.stopPropagation();
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (type === 'overlay') setSelectedOverlayId(id);
    else setSelectedLogoId(id);

    const rect = viewport.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const item = type === 'overlay'
      ? textOverlays.find(o => o.id === id)
      : logos.find(l => l.id === id);
    if (!item) return;

    const origX = item.x;
    const origY = item.y;

    const onMove = (ev) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, origX + dx));
      const newY = Math.max(0, Math.min(100, origY + dy));
      if (type === 'overlay') updateOverlay(id, { x: Math.round(newX), y: Math.round(newY) });
      else updateLogo(id, { x: Math.round(newX), y: Math.round(newY) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [textOverlays, logos, updateOverlay, updateLogo, setSelectedOverlayId, setSelectedLogoId]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col items-center w-full ${mobile ? 'gap-1.5 p-2' : 'gap-3 p-4'}`}>
      {/* Aspect ratio picker */}
      <div className={`flex items-center gap-1.5 flex-wrap justify-center ${mobile ? 'hidden' : ''}`}>
        {ASPECT_RATIOS.map(r => {
          const active = aspectRatio === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setAspectRatio(r.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                active
                  ? dark ? 'bg-violet-500/15 border-violet-500/25 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]'
                  : dark ? 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/10' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B] hover:border-[#d0c8bc]'
              }`}
              title={r.label}
            >
              {/* Mini ratio preview box */}
              <div
                className={`border rounded-sm ${active ? (dark ? 'border-violet-400' : 'border-[#C45D3E]') : (dark ? 'border-gray-600' : 'border-[#c0b8ac]')}`}
                style={{
                  width: Math.round(14 * (r.w / Math.max(r.w, r.h))),
                  height: Math.round(14 * (r.h / Math.max(r.w, r.h))),
                }}
              />
              {r.key}
            </button>
          );
        })}
      </div>

      {/* Video viewport */}
      <div
        ref={viewportRef}
        className="relative bg-black rounded-xl overflow-hidden shadow-2xl w-full"
        style={{
          aspectRatio: ratioObj.css,
          maxHeight: mobile ? '30vh' : '50vh',
          maxWidth: ratioObj.w >= ratioObj.h ? '100%' : `calc(${mobile ? '30vh' : '50vh'} * ${ratioObj.w / ratioObj.h})`,
          margin: '0 auto',
        }}
      >
        {current ? (
          <>
            {(() => {
              const transStyle = getTransitionStyle(current.clip.transition, clipElapsed);
              const zoomTransform = current.clip.zoom > 1
                ? `scale(${current.clip.zoom}) translate(${(50 - current.clip.panX) * (current.clip.zoom - 1) / current.clip.zoom}%, ${(50 - current.clip.panY) * (current.clip.zoom - 1) / current.clip.zoom}%)`
                : '';
              const transTransform = transStyle.transform || '';
              const combinedTransform = [transTransform, zoomTransform].filter(Boolean).join(' ') || undefined;
              const baseFilter = buildFilter(current.clip);
              const transFilter = transStyle.filter || '';
              const combinedFilter = [baseFilter !== 'none' ? baseFilter : '', transFilter].filter(Boolean).join(' ') || 'none';

              return (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{
                    filter: combinedFilter,
                    transform: combinedTransform,
                    transformOrigin: 'center center',
                    opacity: transStyle.opacity ?? 1,
                    clipPath: transStyle.clipPath,
                  }}
                  muted={false}
                  playsInline
                />
              );
            })()}
            {/* Vignette overlay */}
            {current.clip.filters?.vignette > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${current.clip.filters.vignette / 100}) 100%)`,
                }}
              />
            )}
            {/* Speed badge */}
            {current.clip.speed && current.clip.speed !== 1 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                {current.clip.speed}x
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <svg className={`w-12 h-12 ${dark ? 'text-white/10' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Import clips to start editing</p>
          </div>
        )}

        {/* Text overlays with animations — draggable */}
        {activeOverlays.map(o => {
          const elapsed = playheadTime - o.startTime;
          const animStyle = getAnimationStyle(o.animation, elapsed);
          const selected = o.id === selectedOverlayId;
          return (
            <div
              key={o.id}
              className="absolute cursor-grab active:cursor-grabbing z-20"
              onMouseDown={(e) => handleDragStart(e, 'overlay', o.id)}
              style={{
                left: `${o.x}%`,
                top: `${o.y}%`,
                transform: 'translate(-50%, -50%)',
                ...animStyle,
                outline: selected ? '2px solid rgba(196,93,62,0.8)' : 'none',
                outlineOffset: '2px',
                borderRadius: '6px',
              }}
            >
              <span style={{
                fontSize: `${o.fontSize}px`,
                color: o.color,
                fontWeight: o.fontWeight || 'bold',
                backgroundColor: o.bg || 'rgba(0,0,0,0.5)',
                padding: '4px 12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                userSelect: 'none',
              }}>
                {o.text}
              </span>
            </div>
          );
        })}

        {/* Logo/watermark overlays — draggable */}
        {logos.map(l => {
          const selected = l.id === selectedLogoId;
          return (
            <div
              key={l.id}
              className="absolute cursor-grab active:cursor-grabbing z-20"
              onMouseDown={(e) => handleDragStart(e, 'logo', l.id)}
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: l.opacity ?? 0.8,
                outline: selected ? '2px solid rgba(196,93,62,0.8)' : 'none',
                outlineOffset: '2px',
                borderRadius: '4px',
              }}
            >
              <img
                src={l.dataUrl}
                alt="Logo"
                style={{ width: `${l.width || 80}px`, height: 'auto', userSelect: 'none' }}
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={clips.length === 0}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30 ${
            dark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-[#C45D3E] text-white hover:bg-[#b5533a]'
          }`}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <span className={`text-xs font-mono tabular-nums ${dark ? 'text-gray-400' : 'text-[#5c5955]'}`}>
          {formatTime(playheadTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      {/* Shortcuts hint — desktop only */}
      {!mobile && (
        <div className={`flex items-center gap-3 text-[9px] ${dark ? 'text-gray-600' : 'text-[#b0a99f]'}`}>
          <span>Space: play</span>
          <span>Del: remove</span>
          <span>Ctrl+D: duplicate</span>
          <span>Ctrl+S: split</span>
          <span>Arrows: scrub</span>
        </div>
      )}
    </div>
  );
}

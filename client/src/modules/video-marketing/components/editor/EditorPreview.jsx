import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

export default function EditorPreview({ editor }) {
  const { dark } = useTheme();
  const videoRef = useRef(null);
  const animRef = useRef(null);

  const { clips, textOverlays, playheadTime, setPlayheadTime, playing, setPlaying, getClipAtTime, totalDuration } = editor;

  const current = getClipAtTime(playheadTime);

  // Sync video element with playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;

    if (video.src !== current.clip.sourceUrl) {
      video.src = current.clip.sourceUrl;
    }

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

  // Active overlays at current time
  const activeOverlays = textOverlays.filter(o => playheadTime >= o.startTime && playheadTime <= o.endTime);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 w-full max-w-xl">
      {/* Video viewport */}
      <div className="relative w-full aspect-[9/16] max-h-[55vh] bg-black rounded-xl overflow-hidden shadow-2xl">
        {current ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            muted={false}
            playsInline
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <svg className={`w-12 h-12 ${dark ? 'text-white/10' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Import clips to start editing</p>
          </div>
        )}

        {/* Text overlays rendered on top */}
        {activeOverlays.map(o => (
          <div
            key={o.id}
            className="absolute pointer-events-none transition-all"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              style={{
                fontSize: `${o.fontSize}px`,
                color: o.color,
                fontWeight: o.fontWeight || 'bold',
                backgroundColor: o.bg || 'rgba(0,0,0,0.5)',
                padding: '4px 12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              {o.text}
            </span>
          </div>
        ))}
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
    </div>
  );
}

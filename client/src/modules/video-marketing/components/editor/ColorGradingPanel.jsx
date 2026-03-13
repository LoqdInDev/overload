import { useRef, useEffect, useCallback, useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const CHANNELS = [
  { key: 'all', label: 'RGB', color: '#ffffff' },
  { key: 'red', label: 'R', color: '#ff4444' },
  { key: 'green', label: 'G', color: '#44ff44' },
  { key: 'blue', label: 'B', color: '#4444ff' },
];

const DEFAULT_CURVE = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

const DEFAULT_GRADING = {
  curves: { all: [...DEFAULT_CURVE], red: [...DEFAULT_CURVE], green: [...DEFAULT_CURVE], blue: [...DEFAULT_CURVE] },
  temperature: 0,    // -100 to 100
  tint: 0,           // -100 to 100
  highlights: 0,     // -100 to 100
  shadows: 0,        // -100 to 100
  exposure: 0,       // -100 to 100
};

const GRADE_PRESETS = [
  { name: 'Reset', grading: { ...DEFAULT_GRADING } },
  { name: 'Warm Film', grading: { ...DEFAULT_GRADING, temperature: 25, shadows: -15, highlights: 10, exposure: 5 } },
  { name: 'Cool Tone', grading: { ...DEFAULT_GRADING, temperature: -30, tint: -10, highlights: -5 } },
  { name: 'High Contrast', grading: { ...DEFAULT_GRADING, highlights: 30, shadows: -30, exposure: 5 } },
  { name: 'Faded Film', grading: { ...DEFAULT_GRADING, highlights: -10, shadows: 25, exposure: 5 } },
  { name: 'Teal & Orange', grading: { ...DEFAULT_GRADING, temperature: 20, tint: -15, highlights: 15, shadows: -20 } },
  { name: 'Moody Dark', grading: { ...DEFAULT_GRADING, exposure: -15, shadows: -25, highlights: -10, temperature: -10 } },
];

function CurveEditor({ points, onChange, channelColor, dark }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const size = 160;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // Background grid
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();

    // Curve
    ctx.strokeStyle = channelColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sorted = [...points].sort((a, b) => a.x - b.x);
    for (let px = 0; px <= size; px++) {
      const x = (px / size) * 255;
      const y = interpolateCurve(sorted, x);
      const cy = size - (y / 255) * size;
      if (px === 0) ctx.moveTo(px, cy);
      else ctx.lineTo(px, cy);
    }
    ctx.stroke();

    // Control points
    sorted.forEach((pt, i) => {
      const cx = (pt.x / 255) * size;
      const cy = size - (pt.y / 255) * size;
      ctx.fillStyle = channelColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark ? '#000' : '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [points, channelColor, dark, size]);

  useEffect(() => { draw(); }, [draw]);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, ((e.clientX - rect.left) / size) * 255));
    const y = Math.max(0, Math.min(255, 255 - ((e.clientY - rect.top) / size) * 255));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    // Find if clicking near existing point
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const nearIdx = sorted.findIndex(pt =>
      Math.abs(pt.x - pos.x) < 15 && Math.abs(pt.y - pos.y) < 15
    );

    if (nearIdx >= 0) {
      setDragging(nearIdx);
    } else {
      // Add new point
      const newPoints = [...sorted, pos].sort((a, b) => a.x - b.x);
      onChange(newPoints);
      setDragging(newPoints.findIndex(p => p.x === pos.x && p.y === pos.y));
    }
  };

  useEffect(() => {
    if (dragging === null) return;
    const onMove = (e) => {
      const pos = getCanvasPos(e);
      const sorted = [...points].sort((a, b) => a.x - b.x);
      // Don't move endpoints horizontally
      if (dragging === 0) pos.x = 0;
      if (dragging === sorted.length - 1) pos.x = 255;
      sorted[dragging] = pos;
      onChange(sorted);
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, points, onChange]);

  const handleDblClick = (e) => {
    const pos = getCanvasPos(e);
    const sorted = [...points].sort((a, b) => a.x - b.x);
    // Remove point if near one (but not endpoints)
    const nearIdx = sorted.findIndex((pt, i) =>
      i > 0 && i < sorted.length - 1 && Math.abs(pt.x - pos.x) < 15 && Math.abs(pt.y - pos.y) < 15
    );
    if (nearIdx >= 0) {
      sorted.splice(nearIdx, 1);
      onChange(sorted);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg border cursor-crosshair ${dark ? 'border-white/[0.08] bg-black/30' : 'border-[#e8e0d4] bg-white/50'}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDblClick}
      style={{ width: size, height: size }}
    />
  );
}

function interpolateCurve(points, x) {
  if (points.length === 0) return x;
  if (points.length === 1) return points[0].y;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
      // Smooth interpolation
      const smooth = t * t * (3 - 2 * t);
      return points[i].y + (points[i + 1].y - points[i].y) * smooth;
    }
  }
  return x;
}

export default function ColorGradingPanel({ editor }) {
  const { dark } = useTheme();
  const { selectedClip, updateClip } = editor;
  const [activeChannel, setActiveChannel] = useState('all');

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  if (!selectedClip) {
    return (
      <div className={`text-center py-8 ${label}`}>
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <p className="text-[11px]">Select a clip first</p>
        <p className="text-[10px] opacity-60 mt-1">Click a clip to adjust color grading</p>
      </div>
    );
  }

  const clip = selectedClip;
  const grading = clip.grading || { ...DEFAULT_GRADING };

  const setGrading = (updates) => {
    updateClip(clip.id, { grading: { ...grading, ...updates } });
  };

  const setCurve = (channel, points) => {
    setGrading({
      curves: { ...(grading.curves || DEFAULT_GRADING.curves), [channel]: points },
    });
  };

  const applyPreset = (preset) => {
    updateClip(clip.id, { grading: { ...preset.grading, curves: grading.curves || DEFAULT_GRADING.curves } });
  };

  const resetCurves = () => {
    setGrading({ curves: { ...DEFAULT_GRADING.curves } });
  };

  const sliders = [
    { key: 'temperature', label: 'Temperature', min: -100, max: 100, leftLabel: 'Cool', rightLabel: 'Warm' },
    { key: 'tint', label: 'Tint', min: -100, max: 100, leftLabel: 'Green', rightLabel: 'Magenta' },
    { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
    { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
    { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  ];

  const channelData = CHANNELS.find(c => c.key === activeChannel) || CHANNELS[0];
  const curvePoints = grading.curves?.[activeChannel] || DEFAULT_CURVE;

  return (
    <div className="space-y-3">
      <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
        Color Grading
      </p>

      {/* Presets */}
      <div>
        <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Presets</label>
        <div className="flex flex-wrap gap-1">
          {GRADE_PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`px-2 py-1 rounded text-[9px] font-medium border transition-all ${chipIdle}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Curves */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={`text-[10px] font-medium ${label}`}>Curves</label>
          <button
            onClick={resetCurves}
            className={`text-[9px] px-1 rounded ${dark ? 'text-violet-400 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'}`}
          >
            Reset
          </button>
        </div>

        {/* Channel selector */}
        <div className="flex gap-1 mb-2">
          {CHANNELS.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveChannel(c.key)}
              className={`flex-1 px-1.5 py-1 rounded text-[9px] font-bold border transition-all ${
                activeChannel === c.key ? chipActive : chipIdle
              }`}
              style={{ color: activeChannel === c.key ? c.color : undefined }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <CurveEditor
            points={curvePoints}
            onChange={(pts) => setCurve(activeChannel, pts)}
            channelColor={channelData.color}
            dark={dark}
          />
        </div>
        <p className={`text-[8px] text-center mt-1 ${label} opacity-50`}>
          Click to add points. Double-click to remove. Drag to adjust.
        </p>
      </div>

      {/* Sliders */}
      {sliders.map(s => {
        const val = grading[s.key] ?? 0;
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-0.5">
              <label className={`text-[10px] font-medium ${label}`}>{s.label}</label>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-mono tabular-nums ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                  {val > 0 ? '+' : ''}{val}
                </span>
                {val !== 0 && (
                  <button
                    onClick={() => setGrading({ [s.key]: 0 })}
                    className={`text-[9px] px-1 rounded ${dark ? 'text-violet-400 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'}`}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <input type="range" className="w-full accent-violet-500" min={s.min} max={s.max} value={val}
              onChange={e => setGrading({ [s.key]: parseInt(e.target.value) })} />
            {s.leftLabel && (
              <div className={`flex justify-between text-[8px] ${label} opacity-50`}>
                <span>{s.leftLabel}</span><span>{s.rightLabel}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

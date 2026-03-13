import { useTheme } from '../../../../context/ThemeContext';

const FILTER_CONTROLS = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, default: 100, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, default: 100, unit: '%' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200, default: 100, unit: '%' },
  { key: 'blur', label: 'Blur', min: 0, max: 20, default: 0, unit: 'px', step: 0.5 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 80, default: 0, unit: '%' },
];

const PRESETS = [
  { name: 'Normal', filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, vignette: 0 } },
  { name: 'Vivid', filters: { brightness: 105, contrast: 115, saturation: 140, blur: 0, vignette: 0 } },
  { name: 'Cinematic', filters: { brightness: 95, contrast: 120, saturation: 85, blur: 0, vignette: 40 } },
  { name: 'B&W', filters: { brightness: 105, contrast: 110, saturation: 0, blur: 0, vignette: 0 } },
  { name: 'Warm', filters: { brightness: 105, contrast: 105, saturation: 120, blur: 0, vignette: 15 } },
  { name: 'Cool', filters: { brightness: 100, contrast: 110, saturation: 80, blur: 0, vignette: 10 } },
  { name: 'Faded', filters: { brightness: 110, contrast: 85, saturation: 70, blur: 0, vignette: 0 } },
  { name: 'Dreamy', filters: { brightness: 110, contrast: 90, saturation: 110, blur: 1.5, vignette: 25 } },
];

export default function FiltersPanel({ editor }) {
  const { dark } = useTheme();
  const { selectedClip, updateClip } = editor;

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  if (!selectedClip) {
    return (
      <div className={`text-center py-8 ${label}`}>
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p className="text-[11px]">Select a clip first</p>
        <p className="text-[10px] opacity-60 mt-1">Click a clip on the timeline to adjust its filters</p>
      </div>
    );
  }

  const clip = selectedClip;
  const filters = clip.filters || PRESETS[0].filters;

  const setFilter = (key, value) => {
    updateClip(clip.id, { filters: { ...filters, [key]: value } });
  };

  const applyPreset = (preset) => {
    updateClip(clip.id, { filters: { ...preset.filters } });
  };

  const isPresetActive = (preset) =>
    FILTER_CONTROLS.every(f => (filters[f.key] ?? f.default) === preset.filters[f.key]);

  return (
    <div className="space-y-4">
      <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
        Filters & Adjustments
      </p>

      {/* Presets */}
      <div>
        <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Presets</label>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${
                isPresetActive(p) ? chipActive : chipIdle
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      {FILTER_CONTROLS.map(f => {
        const val = filters[f.key] ?? f.default;
        return (
          <div key={f.key}>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-[10px] font-medium ${label}`}>{f.label}</label>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-mono tabular-nums ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                  {f.step && f.step < 1 ? val.toFixed(1) : Math.round(val)}{f.unit}
                </span>
                {val !== f.default && (
                  <button
                    onClick={() => setFilter(f.key, f.default)}
                    className={`text-[9px] px-1 rounded ${dark ? 'text-violet-400 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'}`}
                    title="Reset"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              className="w-full accent-violet-500"
              min={f.min}
              max={f.max}
              step={f.step || 1}
              value={val}
              onChange={(e) => setFilter(f.key, parseFloat(e.target.value))}
            />
          </div>
        );
      })}

      {/* Reset all */}
      <button
        onClick={() => applyPreset(PRESETS[0])}
        className={`w-full py-1.5 rounded-lg text-[10px] font-medium border transition-all ${chipIdle}`}
      >
        Reset All Filters
      </button>
    </div>
  );
}

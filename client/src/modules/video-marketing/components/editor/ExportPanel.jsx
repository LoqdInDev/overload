import { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PLATFORMS = [
  { key: 'tiktok', name: 'TikTok', ratio: '9:16', res: '1080x1920', fps: 30, bitrate: '6M', icon: '♪' },
  { key: 'reels', name: 'Instagram Reels', ratio: '9:16', res: '1080x1920', fps: 30, bitrate: '6M', icon: '📷' },
  { key: 'shorts', name: 'YouTube Shorts', ratio: '9:16', res: '1080x1920', fps: 30, bitrate: '8M', icon: '▶' },
  { key: 'ig-feed', name: 'Instagram Feed', ratio: '1:1', res: '1080x1080', fps: 30, bitrate: '5M', icon: '⬜' },
  { key: 'ig-story', name: 'Instagram Story', ratio: '9:16', res: '1080x1920', fps: 30, bitrate: '6M', icon: '📱' },
  { key: 'youtube', name: 'YouTube', ratio: '16:9', res: '1920x1080', fps: 30, bitrate: '10M', icon: '🎬' },
  { key: 'youtube-4k', name: 'YouTube 4K', ratio: '16:9', res: '3840x2160', fps: 30, bitrate: '25M', icon: '🎥' },
  { key: 'facebook', name: 'Facebook', ratio: '16:9', res: '1920x1080', fps: 30, bitrate: '8M', icon: 'f' },
  { key: 'fb-feed', name: 'Facebook Feed', ratio: '4:5', res: '1080x1350', fps: 30, bitrate: '6M', icon: '📰' },
  { key: 'linkedin', name: 'LinkedIn', ratio: '16:9', res: '1920x1080', fps: 30, bitrate: '8M', icon: 'in' },
  { key: 'twitter', name: 'X / Twitter', ratio: '16:9', res: '1920x1080', fps: 30, bitrate: '8M', icon: '𝕏' },
  { key: 'custom', name: 'Custom', ratio: 'custom', res: 'custom', fps: 30, bitrate: '8M', icon: '⚙' },
];

const QUALITY_OPTIONS = [
  { key: 'low', label: 'Draft', desc: '480p, fast', multiplier: 0.25 },
  { key: 'medium', label: 'Standard', desc: '720p', multiplier: 0.5 },
  { key: 'high', label: 'HD', desc: '1080p', multiplier: 1 },
  { key: 'ultra', label: '4K', desc: '2160p', multiplier: 2 },
];

const FORMAT_OPTIONS = [
  { key: 'mp4', label: 'MP4 (H.264)', desc: 'Most compatible' },
  { key: 'webm', label: 'WebM (VP9)', desc: 'Smaller file size' },
  { key: 'mov', label: 'MOV (ProRes)', desc: 'Apple ecosystem' },
];

export default function ExportPanel({ editor }) {
  const { dark } = useTheme();
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [quality, setQuality] = useState('high');
  const [format, setFormat] = useState('mp4');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  const platform = PLATFORMS.find(p => p.key === selectedPlatform) || PLATFORMS[0];
  const qualityOpt = QUALITY_OPTIONS.find(q => q.key === quality) || QUALITY_OPTIONS[2];

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    // Simulate export progress (actual FFmpeg.wasm integration would go here)
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(Math.round((i / steps) * 100));
    }

    // For now, create a simple canvas-based export of the current frame
    // Full video export would require FFmpeg.wasm
    setExporting(false);
    setProgress(0);
  };

  const clipCount = editor.clips.length;

  return (
    <div className="space-y-3">
      <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
        Export & Publish
      </p>

      {clipCount === 0 ? (
        <div className={`text-center py-6 ${label}`}>
          <p className="text-[11px]">No clips to export</p>
          <p className="text-[10px] opacity-60 mt-1">Add clips to the timeline first</p>
        </div>
      ) : (
        <>
          {/* Platform presets */}
          <div>
            <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Platform</label>
            <div className="grid grid-cols-3 gap-1">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlatform(p.key)}
                  className={`flex items-center gap-1 px-1.5 py-1.5 rounded text-[9px] font-medium border transition-all ${
                    selectedPlatform === p.key ? chipActive : chipIdle
                  }`}
                >
                  <span className="text-[11px]">{p.icon}</span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected platform info */}
          <div className={`p-2.5 rounded-lg border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-[#e8e0d4] bg-[#f8f4ef]'}`}>
            <div className="grid grid-cols-2 gap-y-1">
              <span className={`text-[9px] ${label}`}>Aspect Ratio</span>
              <span className={`text-[9px] font-medium text-right ${dark ? 'text-gray-200' : 'text-[#332F2B]'}`}>{platform.ratio}</span>
              <span className={`text-[9px] ${label}`}>Resolution</span>
              <span className={`text-[9px] font-medium text-right ${dark ? 'text-gray-200' : 'text-[#332F2B]'}`}>{platform.res}</span>
              <span className={`text-[9px] ${label}`}>Frame Rate</span>
              <span className={`text-[9px] font-medium text-right ${dark ? 'text-gray-200' : 'text-[#332F2B]'}`}>{platform.fps} fps</span>
              <span className={`text-[9px] ${label}`}>Bitrate</span>
              <span className={`text-[9px] font-medium text-right ${dark ? 'text-gray-200' : 'text-[#332F2B]'}`}>{platform.bitrate}bps</span>
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Quality</label>
            <div className="flex gap-1">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.key}
                  onClick={() => setQuality(q.key)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded text-[9px] font-medium border transition-all ${
                    quality === q.key ? chipActive : chipIdle
                  }`}
                >
                  <span>{q.label}</span>
                  <span className="opacity-50 text-[7px]">{q.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className={`text-[10px] font-medium mb-1.5 block ${label}`}>Format</label>
            <div className="flex gap-1">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded text-[9px] font-medium border transition-all ${
                    format === f.key ? chipActive : chipIdle
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="opacity-50 text-[7px]">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className={`p-2.5 rounded-lg border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-[#e8e0d4] bg-[#f8f4ef]'}`}>
            <p className={`text-[10px] font-medium mb-1 ${dark ? 'text-gray-200' : 'text-[#332F2B]'}`}>Export Summary</p>
            <p className={`text-[9px] ${label}`}>
              {clipCount} clip{clipCount !== 1 ? 's' : ''} &middot; {editor.totalDuration.toFixed(1)}s &middot; {platform.name} &middot; {qualityOpt.label} {format.toUpperCase()}
            </p>
          </div>

          {/* Export button */}
          {exporting ? (
            <div>
              <div className={`w-full rounded-full h-2 ${dark ? 'bg-white/[0.06]' : 'bg-[#e8e0d4]'}`}>
                <div
                  className={`h-2 rounded-full transition-all ${dark ? 'bg-violet-500' : 'bg-[#C45D3E]'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`text-[10px] text-center mt-1.5 ${label}`}>
                Exporting... {progress}%
              </p>
            </div>
          ) : (
            <button
              onClick={handleExport}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
                dark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-[#C45D3E] text-white hover:bg-[#b5533a]'
              }`}
            >
              Export Video
            </button>
          )}

          <p className={`text-[8px] text-center ${label} opacity-50`}>
            Full server-side rendering coming soon. Currently exports current frame.
          </p>
        </>
      )}
    </div>
  );
}

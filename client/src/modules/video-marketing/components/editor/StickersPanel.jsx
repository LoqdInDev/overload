import { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const CATEGORIES = [
  {
    name: 'CTA',
    items: [
      { text: 'SUBSCRIBE', style: { color: '#ffffff', bg: '#ff0000', fontSize: 28, fontWeight: 'bold', animation: 'pop-in' } },
      { text: 'LIKE & SHARE', style: { color: '#ffffff', bg: '#1877f2', fontSize: 26, fontWeight: 'bold', animation: 'bounce-in' } },
      { text: 'FOLLOW ME', style: { color: '#ffffff', bg: '#e1306c', fontSize: 26, fontWeight: 'bold', animation: 'slide-up' } },
      { text: 'LINK IN BIO', style: { color: '#000000', bg: '#ffdd00', fontSize: 24, fontWeight: 'bold', animation: 'pop-in' } },
      { text: 'SWIPE UP', style: { color: '#ffffff', bg: '#833AB4', fontSize: 26, fontWeight: 'bold', animation: 'slide-up' } },
      { text: 'TAP HERE', style: { color: '#ffffff', bg: '#25D366', fontSize: 24, fontWeight: 'bold', animation: 'pop-in' } },
      { text: 'SHOP NOW', style: { color: '#ffffff', bg: '#ff6600', fontSize: 26, fontWeight: 'bold', animation: 'bounce-in' } },
      { text: 'FREE SHIPPING', style: { color: '#ffffff', bg: '#00c853', fontSize: 22, fontWeight: 'bold', animation: 'slide-left' } },
    ],
  },
  {
    name: 'Labels',
    items: [
      { text: 'NEW', style: { color: '#ffffff', bg: '#ff0044', fontSize: 32, fontWeight: 'bold', animation: 'pop-in' } },
      { text: 'SALE', style: { color: '#ffffff', bg: '#ff0000', fontSize: 36, fontWeight: 'bold', animation: 'bounce-in' } },
      { text: 'HOT', style: { color: '#ffffff', bg: '#ff6600', fontSize: 32, fontWeight: 'bold', animation: 'pop-in' } },
      { text: 'LIMITED', style: { color: '#ffffff', bg: '#9c27b0', fontSize: 24, fontWeight: 'bold', animation: 'fade-in' } },
      { text: 'BEST SELLER', style: { color: '#000000', bg: '#ffd700', fontSize: 22, fontWeight: 'bold', animation: 'slide-up' } },
      { text: 'TRENDING', style: { color: '#ffffff', bg: '#00bcd4', fontSize: 24, fontWeight: 'bold', animation: 'slide-right' } },
      { text: 'EXCLUSIVE', style: { color: '#ffffff', bg: '#212121', fontSize: 22, fontWeight: 'bold', animation: 'fade-in' } },
      { text: '50% OFF', style: { color: '#ffffff', bg: '#f44336', fontSize: 30, fontWeight: 'bold', animation: 'bounce-in' } },
    ],
  },
  {
    name: 'Reactions',
    items: [
      { text: '🔥', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '❤️', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'bounce-in' } },
      { text: '👆', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'slide-up' } },
      { text: '💯', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '⭐', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '🎉', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'bounce-in' } },
      { text: '👀', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'fade-in' } },
      { text: '💰', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '🚀', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'slide-up' } },
      { text: '✅', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '❌', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '👇', style: { color: '#ffffff', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'slide-down' } },
    ],
  },
  {
    name: 'Shapes',
    items: [
      { text: '→', style: { color: '#ffffff', bg: '#ff0000', fontSize: 36, fontWeight: 'bold', animation: 'slide-right' } },
      { text: '★', style: { color: '#ffd700', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '●', style: { color: '#ff0000', bg: 'transparent', fontSize: 48, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '▶', style: { color: '#ffffff', bg: '#ff0000', fontSize: 32, fontWeight: 'normal', animation: 'pop-in' } },
      { text: '◆', style: { color: '#00bcd4', bg: 'transparent', fontSize: 44, fontWeight: 'normal', animation: 'fade-in' } },
      { text: '▬', style: { color: '#ffffff', bg: '#333333', fontSize: 12, fontWeight: 'normal', animation: 'fade-in' } },
    ],
  },
];

export default function StickersPanel({ editor }) {
  const { dark } = useTheme();
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].name);
  const { addOverlay, playheadTime } = editor;

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  const handleAdd = (item) => {
    addOverlay(item.text, {
      fontSize: item.style.fontSize,
      color: item.style.color,
      bg: item.style.bg,
      fontWeight: item.style.fontWeight,
      animation: item.style.animation,
      startTime: playheadTime,
      endTime: playheadTime + 3,
    });
  };

  const cat = CATEGORIES.find(c => c.name === activeCat) || CATEGORIES[0];

  return (
    <div className="space-y-3">
      <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
        Stickers & Elements
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map(c => (
          <button
            key={c.name}
            onClick={() => setActiveCat(c.name)}
            className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
              activeCat === c.name ? chipActive : chipIdle
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {cat.items.map((item, i) => (
          <button
            key={i}
            onClick={() => handleAdd(item)}
            className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
              dark ? 'border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5' : 'border-[#e8e0d4] hover:border-[#C45D3E]/30 hover:bg-[#C45D3E]/5'
            }`}
            style={{ minHeight: 48 }}
            title={`Add "${item.text}"`}
          >
            <span
              style={{
                fontSize: Math.min(item.style.fontSize * 0.6, 24),
                color: item.style.bg !== 'transparent' ? '#fff' : item.style.color,
                backgroundColor: item.style.bg !== 'transparent' ? item.style.bg : undefined,
                fontWeight: item.style.fontWeight,
                padding: item.style.bg !== 'transparent' ? '2px 6px' : 0,
                borderRadius: '4px',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {item.text}
            </span>
          </button>
        ))}
      </div>

      <p className={`text-[9px] text-center ${label} opacity-60`}>
        Click to add at playhead position
      </p>
    </div>
  );
}

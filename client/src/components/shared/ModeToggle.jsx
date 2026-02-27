import { useState } from 'react';
import { useAutomation } from '../../context/AutomationContext';
import { useTheme } from '../../context/ThemeContext';

const MODES = [
  {
    id: 'manual',
    label: 'Manual',
    icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    color: '#94908A',
    desc: 'You control everything manually',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
    color: '#D4A017',
    desc: 'AI suggests, you approve',
  },
  {
    id: 'autopilot',
    label: 'Autopilot',
    icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
    color: '#22c55e',
    desc: 'AI runs autonomously',
  },
];

export default function ModeToggle({ moduleId }) {
  const { getMode, setMode } = useAutomation();
  const { dark } = useTheme();
  const currentMode = getMode(moduleId);
  const [hoveredMode, setHoveredMode] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [changing, setChanging] = useState(false);

  const currentIdx = MODES.findIndex(m => m.id === currentMode);

  async function handleClick(mode) {
    if (mode.id === currentMode || changing) return;

    // Manual doesn't need confirmation
    if (mode.id === 'manual') {
      setChanging(true);
      try {
        await setMode(moduleId, mode.id);
        setConfirming(null);
      } finally {
        setChanging(false);
      }
      return;
    }

    // Show confirmation for copilot/autopilot
    if (confirming === mode.id) {
      setChanging(true);
      try {
        await setMode(moduleId, mode.id);
        setConfirming(null);
      } finally {
        setChanging(false);
      }
    } else {
      setConfirming(mode.id);
      setTimeout(() => setConfirming(null), 4000);
    }
  }

  const bg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center rounded-lg p-0.5"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Sliding pill indicator */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md transition-all duration-300 ease-out"
          style={{
            width: `calc(${100 / 3}% - 2px)`,
            left: `calc(${(currentIdx * 100) / 3}% + 1px)`,
            background: MODES[currentIdx].color,
            opacity: 0.15,
            boxShadow: `0 0 12px ${MODES[currentIdx].color}33`,
          }}
        />

        {MODES.map((mode) => {
          const isActive = mode.id === currentMode;
          const isHovered = hoveredMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => handleClick(mode)}
              disabled={changing}
              onMouseEnter={() => setHoveredMode(mode.id)}
              onMouseLeave={() => setHoveredMode(null)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                color: isActive ? mode.color : (dark ? '#94908A' : '#6b7280'),
                fontWeight: isActive ? 600 : 500,
                zIndex: 1,
              }}
              title={mode.desc}
            >
              <svg
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  filter: isActive ? `drop-shadow(0 0 4px ${mode.color}44)` : 'none',
                }}
                fill={mode.id === 'manual' ? 'none' : 'currentColor'}
                stroke={mode.id === 'manual' ? 'currentColor' : 'none'}
                strokeWidth={mode.id === 'manual' ? 1.5 : 0}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} />
              </svg>
              <span className="sr-only sm:not-sr-only">{mode.label}</span>
              {isActive && mode.id !== 'manual' && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: mode.color,
                    boxShadow: `0 0 6px ${mode.color}`,
                    animation: mode.id === 'autopilot' ? 'auto-breathe 3s ease-in-out infinite' : 'auto-pulse 2s ease-in-out infinite',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Confirmation tooltip */}
      {confirming && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium animate-fade-in"
          style={{
            background: dark ? 'rgba(212, 160, 23, 0.1)' : 'rgba(212, 160, 23, 0.08)',
            border: '1px solid rgba(212, 160, 23, 0.2)',
            color: '#D4A017',
          }}
        >
          <span>Click again to confirm</span>
          <span style={{ opacity: 0.5 }}>
            {MODES.find(m => m.id === confirming)?.desc}
          </span>
        </div>
      )}
    </div>
  );
}

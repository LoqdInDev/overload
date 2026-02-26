import { MODULE_REGISTRY } from '../../config/modules';
import { useAutomation } from '../../context/AutomationContext';
import { useTheme } from '../../context/ThemeContext';
import ModeToggle from './ModeToggle';

export default function ModuleWrapper({ moduleId, children }) {
  const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
  const { getMode, pendingByModule, actionStats } = useAutomation();
  const { dark } = useTheme();

  // Don't show automation controls for non-automatable modules
  if (!mod?.automatable) return children;

  const mode = getMode(moduleId);
  const pending = pendingByModule[moduleId] || 0;

  const bannerConfig = {
    copilot: {
      bg: dark ? 'rgba(212, 160, 23, 0.06)' : 'rgba(212, 160, 23, 0.05)',
      border: dark ? 'rgba(212, 160, 23, 0.15)' : 'rgba(212, 160, 23, 0.12)',
      color: '#D4A017',
      dotAnimation: 'auto-pulse 2s ease-in-out infinite',
      text: pending > 0
        ? `Copilot active \u2014 ${pending} item${pending !== 1 ? 's' : ''} awaiting review`
        : 'Copilot active \u2014 AI will suggest actions for your review',
    },
    autopilot: {
      bg: dark ? 'rgba(34, 197, 94, 0.06)' : 'rgba(34, 197, 94, 0.05)',
      border: dark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
      color: '#22c55e',
      dotAnimation: 'auto-breathe 3s ease-in-out infinite',
      text: `Autopilot running \u2014 ${actionStats.today || 0} AI action${actionStats.today !== 1 ? 's' : ''} today`,
    },
  };

  const banner = bannerConfig[mode];

  return (
    <div>
      {/* Mode Toggle Bar */}
      <div
        className="flex items-center justify-between gap-4 mb-4 px-1"
        style={{ minHeight: 36 }}
      >
        <ModeToggle moduleId={moduleId} />

        {mode !== 'manual' && (
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: banner.color }}>
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: banner.color,
                boxShadow: `0 0 6px ${banner.color}66`,
                animation: banner.dotAnimation,
              }}
            />
            <span style={{ opacity: 0.9 }}>{mode === 'copilot' ? 'AI Copilot' : 'Autopilot'} Active</span>
          </div>
        )}
      </div>

      {/* Status Banner (copilot/autopilot only) */}
      {banner && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg mb-5 text-xs"
          style={{
            background: banner.bg,
            border: `1px solid ${banner.border}`,
            color: banner.color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: banner.color,
              animation: banner.dotAnimation,
            }}
          />
          <span style={{ opacity: 0.85, fontWeight: 500 }}>{banner.text}</span>
        </div>
      )}

      {/* Module content */}
      {children}
    </div>
  );
}

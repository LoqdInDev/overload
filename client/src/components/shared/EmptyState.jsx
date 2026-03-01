/**
 * Reusable empty state component.
 * Displays an icon, title, description, and optional action button.
 * Styled with Tailwind to match the warm editorial theme.
 */
import { useTheme } from '../../App';

export default function EmptyState({ icon, title, description, action, actionLabel, onAction }) {
  const { dark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      {/* Icon container */}
      {icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)'}`,
          }}
        >
          {typeof icon === 'string' ? (
            <svg
              className="w-8 h-8"
              fill="none"
              stroke={dark ? '#6B6660' : '#94908A'}
              viewBox="0 0 24 24"
              strokeWidth={1.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          ) : (
            icon
          )}
        </div>
      )}

      {/* Title */}
      <h3
        className="text-lg font-semibold mb-1.5"
        style={{
          color: dark ? '#E8E4DE' : '#332F2B',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className="text-sm max-w-md leading-relaxed"
          style={{ color: dark ? '#6B6660' : '#94908A' }}
        >
          {description}
        </p>
      )}

      {/* Action button */}
      {(action || (actionLabel && onAction)) && (
        <div className="mt-5">
          {action || (
            <button
              onClick={onAction}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: '#C45D3E',
                color: '#FFFFFF',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const VARIANTS = {
  default: { bg: 'rgba(148,144,138,0.12)', text: '#94908A', border: 'rgba(148,144,138,0.15)' },
  terra:   { bg: 'rgba(196,93,62,0.12)', text: '#C45D3E', border: 'rgba(196,93,62,0.18)' },
  sage:    { bg: 'rgba(94,142,110,0.12)', text: '#5E8E6E', border: 'rgba(94,142,110,0.18)' },
  success: { bg: 'rgba(34,197,94,0.12)', text: '#22C55E', border: 'rgba(34,197,94,0.18)' },
  warning: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.18)' },
  danger:  { bg: 'rgba(220,38,38,0.12)', text: '#DC2626', border: 'rgba(220,38,38,0.18)' },
  info:    { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', border: 'rgba(59,130,246,0.18)' },
};

const SIZES = {
  sm: 'px-1.5 py-0.5 text-[9px]',
  md: 'px-2 py-0.5 text-[10px]',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  children,
  className,
  style: styleProp,
}) {
  const v = VARIANTS[variant] || VARIANTS.default;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tracking-wide uppercase rounded-md whitespace-nowrap',
        SIZES[size],
        className
      )}
      style={{
        background: v.bg,
        color: v.text,
        border: `1px solid ${v.border}`,
        ...styleProp,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: v.text }}
        />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${children}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

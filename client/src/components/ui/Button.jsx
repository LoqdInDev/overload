import { forwardRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';
import Spinner from './Spinner';

const VARIANTS = {
  primary: (dark) => ({
    background: 'linear-gradient(135deg, #C45D3E 0%, #A84D33 100%)',
    color: '#FFFFFF',
    border: 'none',
    hoverBg: 'linear-gradient(135deg, #D4694A 0%, #B85A3E 100%)',
  }),
  secondary: (dark) => ({
    background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)',
    color: dark ? '#E8E4DE' : '#332F2B',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.1)'}`,
  }),
  ghost: (dark) => ({
    background: 'transparent',
    color: dark ? '#94908A' : '#6B6560',
    border: 'none',
  }),
  danger: (dark) => ({
    background: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
  }),
};

const SIZES = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-[12px] gap-2 rounded-xl',
  lg: 'px-6 py-2.5 text-[13px] gap-2 rounded-xl',
};

const Button = forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className,
  style: styleProp,
  ...props
}, ref) {
  const { dark } = useTheme();
  const v = VARIANTS[variant]?.(dark) || VARIANTS.primary(dark);

  const baseStyle = {
    background: v.background,
    color: v.color,
    border: v.border || 'none',
    ...styleProp,
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C45D3E] focus-visible:ring-offset-2',
        SIZES[size] || SIZES.md,
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        !disabled && !loading && 'hover:opacity-90 active:scale-[0.98]',
        className
      )}
      style={baseStyle}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {icon && !loading && iconPosition === 'left' && (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      )}
      {children}
      {icon && !loading && iconPosition === 'right' && (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      )}
    </button>
  );
});

export default Button;

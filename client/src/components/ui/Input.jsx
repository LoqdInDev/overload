import { forwardRef, useId } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'px-3 py-1.5 text-[12px] rounded-lg',
  md: 'px-3.5 py-2.5 text-[13px] rounded-xl',
  lg: 'px-4 py-3 text-[14px] rounded-xl',
};

const Input = forwardRef(function Input({
  label,
  error,
  hint,
  required = false,
  size = 'md',
  leftIcon,
  rightIcon,
  className,
  wrapperClassName,
  ...props
}, ref) {
  const { dark } = useTheme();
  const id = useId();
  const inputId = props.id || id;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;

  const bg = dark ? 'rgba(255,255,255,0.04)' : '#F8F6F3';
  const border = error
    ? '#DC2626'
    : dark ? 'rgba(255,255,255,0.08)' : '#EDE5DA';
  const focusBorder = error ? '#DC2626' : '#C45D3E';
  const text = dark ? '#E8E4DE' : '#332F2B';
  const placeholder = dark ? '#6B6560' : '#94908A';
  const labelColor = '#94908A';

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold tracking-[0.06em] uppercase"
          style={{ color: labelColor }}
        >
          {label}{required && <span style={{ color: '#C45D3E' }}> *</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4" style={{ color: placeholder }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={leftIcon} />
            </svg>
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId || hintId}
          className={cn(
            'w-full outline-none transition-all duration-200',
            SIZES[size] || SIZES.md,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          style={{
            background: bg,
            border: `1px solid ${border}`,
            color: text,
            '--tw-ring-color': `${focusBorder}33`,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = focusBorder;
            e.target.style.boxShadow = `0 0 0 3px ${focusBorder}15`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = border;
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4" style={{ color: placeholder }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={rightIcon} />
            </svg>
          </div>
        )}
      </div>
      {error && <p id={errorId} className="text-[11px] text-red-500" role="alert">{error}</p>}
      {hint && !error && <p id={hintId} className="text-[11px]" style={{ color: '#94908A' }}>{hint}</p>}
    </div>
  );
});

export default Input;

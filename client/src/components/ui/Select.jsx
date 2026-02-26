import { forwardRef, useId } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'px-3 py-1.5 text-[12px] rounded-lg',
  md: 'px-3.5 py-2.5 text-[13px] rounded-xl',
  lg: 'px-4 py-3 text-[14px] rounded-xl',
};

const Select = forwardRef(function Select({
  label,
  error,
  hint,
  required = false,
  size = 'md',
  options = [],
  placeholder,
  className,
  wrapperClassName,
  ...props
}, ref) {
  const { dark } = useTheme();
  const id = useId();
  const selectId = props.id || id;
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint && !error ? `${selectId}-hint` : undefined;

  const bg = dark ? 'rgba(255,255,255,0.04)' : '#F8F6F3';
  const border = error ? '#DC2626' : dark ? 'rgba(255,255,255,0.08)' : '#EDE5DA';
  const focusBorder = error ? '#DC2626' : '#C45D3E';
  const text = dark ? '#E8E4DE' : '#332F2B';
  const labelColor = '#94908A';

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-semibold tracking-[0.06em] uppercase"
          style={{ color: labelColor }}
        >
          {label}{required && <span style={{ color: '#C45D3E' }}> *</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={errorId || hintId}
          className={cn(
            'w-full outline-none transition-all duration-200 appearance-none pr-10 cursor-pointer',
            SIZES[size] || SIZES.md,
            className
          )}
          style={{
            background: bg,
            border: `1px solid ${border}`,
            color: text,
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
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4" style={{ color: '#94908A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
      {error && <p id={errorId} className="text-[11px] text-red-500" role="alert">{error}</p>}
      {hint && !error && <p id={hintId} className="text-[11px]" style={{ color: '#94908A' }}>{hint}</p>}
    </div>
  );
});

export default Select;

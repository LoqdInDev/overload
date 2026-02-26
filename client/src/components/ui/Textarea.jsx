import { forwardRef, useId, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const Textarea = forwardRef(function Textarea({
  label,
  error,
  hint,
  required = false,
  autoResize = false,
  rows = 4,
  className,
  wrapperClassName,
  ...props
}, ref) {
  const { dark } = useTheme();
  const id = useId();
  const textareaId = props.id || id;
  const errorId = error ? `${textareaId}-error` : undefined;
  const hintId = hint && !error ? `${textareaId}-hint` : undefined;

  const bg = dark ? 'rgba(255,255,255,0.04)' : '#F8F6F3';
  const border = error ? '#DC2626' : dark ? 'rgba(255,255,255,0.08)' : '#EDE5DA';
  const focusBorder = error ? '#DC2626' : '#C45D3E';
  const text = dark ? '#E8E4DE' : '#332F2B';
  const labelColor = '#94908A';

  const handleInput = useCallback((e) => {
    if (autoResize) {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
    props.onInput?.(e);
  }, [autoResize, props.onInput]);

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-[11px] font-semibold tracking-[0.06em] uppercase"
          style={{ color: labelColor }}
        >
          {label}{required && <span style={{ color: '#C45D3E' }}> *</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={errorId || hintId}
        className={cn(
          'w-full px-3.5 py-2.5 text-[13px] rounded-xl outline-none transition-all duration-200 resize-y',
          autoResize && 'resize-none overflow-hidden',
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
        onInput={handleInput}
        {...props}
      />
      {error && <p id={errorId} className="text-[11px] text-red-500" role="alert">{error}</p>}
      {hint && !error && <p id={hintId} className="text-[11px]" style={{ color: '#94908A' }}>{hint}</p>}
    </div>
  );
});

export default Textarea;

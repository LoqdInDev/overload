import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlay = true,
  closeOnEsc = true,
  children,
  footer,
}) {
  const { dark } = useTheme();
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeOnEsc, onClose]);

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement;
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable?.length) focusable[0].focus();
      });
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const bg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.1)';
  const titleColor = dark ? '#E8E4DE' : '#332F2B';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative w-full rounded-2xl shadow-2xl animate-fade-up', SIZES[size])}
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-0">
          {title && (
            <h2
              className="text-base font-semibold"
              style={{ color: titleColor, fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {title}
            </h2>
          )}
          {description && (
            <p className="text-[12px] mt-1" style={{ color: '#94908A' }}>{description}</p>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/10"
            aria-label="Close dialog"
          >
            <svg className="w-4 h-4" style={{ color: '#94908A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-5 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

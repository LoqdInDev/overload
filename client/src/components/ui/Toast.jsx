import { useTheme } from '../../context/ThemeContext';

const TOAST_STYLES = {
  success: {
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: '#5E8E6E',
  },
  error: {
    icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
    color: '#C45D3E',
  },
  warning: {
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    color: '#F59E0B',
  },
  info: {
    icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    color: '#3B82F6',
  },
};

function ToastItem({ toast, dark, onDismiss }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const bg = dark ? '#252220' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.1)';
  const titleColor = dark ? '#E8E4DE' : '#332F2B';
  const msgColor = '#94908A';

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 w-full rounded-xl px-4 py-3 shadow-lg ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${style.color}`,
      }}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        style={{ color: style.color }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
      </svg>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-[12px] font-semibold leading-tight" style={{ color: titleColor }}>
            {toast.title}
          </p>
        )}
        {toast.message && (
          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: msgColor }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-3.5 h-3.5" style={{ color: '#94908A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  const { dark } = useTheme();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dark={dark} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

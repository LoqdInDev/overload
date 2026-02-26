import ErrorBoundary from './ErrorBoundary';
import { useTheme } from '../../context/ThemeContext';

function ModuleErrorFallback({ error, reset, moduleName }) {
  const { dark } = useTheme();

  const bg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const titleColor = dark ? '#E8E4DE' : '#332F2B';
  const msgColor = '#94908A';

  return (
    <div className="flex items-center justify-center min-h-[40vh] p-6 animate-fade-in">
      <div
        className="text-center max-w-sm w-full rounded-xl p-6"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(196,93,62,0.1)' }}
        >
          <svg className="w-6 h-6" style={{ color: '#C45D3E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        {moduleName && (
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: msgColor }}>
            {moduleName}
          </p>
        )}

        <h3 className="text-sm font-semibold mb-1.5" style={{ color: titleColor }}>
          Module Error
        </h3>

        <p className="text-[12px] mb-4 leading-relaxed" style={{ color: msgColor }}>
          {error?.message || 'This module encountered an error.'}
        </p>

        <button
          onClick={reset}
          className="px-4 py-2 text-[11px] font-semibold rounded-lg text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #C45D3E, #A84D33)' }}
        >
          Reload Module
        </button>
      </div>
    </div>
  );
}

export default function ModuleErrorBoundary({ children, moduleName }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <ModuleErrorFallback error={error} reset={reset} moduleName={moduleName} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

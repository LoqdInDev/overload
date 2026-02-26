import { useTheme } from '../../context/ThemeContext';

export default function ErrorFallback({ error, reset }) {
  const { dark } = useTheme();

  const bg = dark ? '#1A1816' : '#FBF7F0';
  const cardBg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const titleColor = dark ? '#E8E4DE' : '#332F2B';
  const msgColor = '#94908A';

  return (
    <div
      className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in"
      style={{ background: bg }}
    >
      <div
        className="text-center max-w-md w-full rounded-2xl p-8"
        style={{ background: cardBg, border: `1px solid ${border}` }}
      >
        {/* Warning icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(196,93,62,0.1)', border: '1px solid rgba(196,93,62,0.15)' }}
        >
          <svg className="w-8 h-8" style={{ color: '#C45D3E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: titleColor, fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Something went wrong
        </h2>

        <p className="text-[13px] mb-6 leading-relaxed" style={{ color: msgColor }}>
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 text-[12px] font-semibold rounded-xl text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #C45D3E, #A84D33)' }}
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 text-[12px] font-semibold rounded-xl transition-all duration-200 hover:opacity-80"
            style={{ color: '#5E8E6E' }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

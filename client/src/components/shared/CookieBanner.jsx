import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'overload_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === null) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-500 ease-out"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div
        className="mx-auto max-w-4xl mb-4 mx-4 sm:mx-auto rounded-2xl shadow-lg border px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
        style={{
          background: '#FDFBF8',
          borderColor: 'rgba(44,40,37,0.1)',
          boxShadow: '0 -4px 24px rgba(44,40,37,0.08), 0 8px 32px rgba(44,40,37,0.12)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {/* Cookie icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(196,93,62,0.08)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#C45D3E" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10c0-.34-.017-.676-.05-1.008A3.5 3.5 0 0118 8.5a3.5 3.5 0 01-3.5-3.5A3.5 3.5 0 0112 2z" />
            <circle cx="8" cy="14" r="1" fill="#C45D3E" />
            <circle cx="11" cy="10" r="1" fill="#C45D3E" />
            <circle cx="15" cy="14" r="1" fill="#C45D3E" />
          </svg>
        </div>

        {/* Text */}
        <p className="flex-1 text-[13px] leading-snug" style={{ color: '#4A4540' }}>
          We use cookies to improve your experience and analyze site usage.
          By continuing, you agree to our{' '}
          <a href="/privacy" className="underline" style={{ color: '#C45D3E' }}>Privacy Policy</a>.
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold tracking-wide transition-colors duration-200"
            style={{ color: '#94908A', background: 'rgba(44,40,37,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,40,37,0.08)'; e.currentTarget.style.color = '#332F2B'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(44,40,37,0.04)'; e.currentTarget.style.color = '#94908A'; }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold tracking-wide text-white transition-colors duration-200"
            style={{ background: '#C45D3E' }}
            onMouseEnter={e => e.currentTarget.style.background = '#B04E32'}
            onMouseLeave={e => e.currentTarget.style.background = '#C45D3E'}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

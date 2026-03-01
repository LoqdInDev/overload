import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { usePageTitle } from '../hooks/usePageTitle';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { dark, toggle } = useTheme();
  usePageTitle('Forgot Password');

  const bg = dark ? '#1A1816' : '#FBF7F0';
  const cardBg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const muted = '#94908A';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#F8F6F3';
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : '#EDE5DA';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) { setError('Email is required'); return; }
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSent(true);
    } catch (err) {
      // Always show success to avoid leaking whether email exists
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: bg }}
      data-theme={dark ? 'dark' : 'light'}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ background: '#C45D3E', top: '-10%', right: '-5%' }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-15"
          style={{ background: '#5E8E6E', bottom: '-10%', left: '-5%' }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-lg transition-colors z-10"
        style={{ color: muted }}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          {dark ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          )}
        </svg>
      </button>

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: ink, fontFamily: "'Fraunces', Georgia, serif" }}
          >
            OVERLOAD
          </h1>
          <p className="text-[11px] font-semibold tracking-[0.15em] uppercase mt-1" style={{ color: muted }}>
            Marketing OS
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: cardBg, border: `1px solid ${border}`, boxShadow: dark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: ink }}>
            Reset your password
          </h2>
          <p className="text-[12px] mb-5" style={{ color: muted }}>
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(94,142,110,0.12)' }}>
                <svg className="w-5 h-5" fill="none" stroke="#5E8E6E" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-[13px] font-medium mb-1" style={{ color: ink }}>Check your email</p>
              <p className="text-[12px] mb-4" style={{ color: muted }}>
                If an account exists for <strong style={{ color: ink }}>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <Link
                to="/login"
                className="text-[12px] font-semibold transition-opacity hover:opacity-80"
                style={{ color: '#C45D3E' }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: muted }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-xl outline-none transition-all duration-200"
                  style={{ background: inputBg, border: `1px solid ${error ? 'rgba(196,93,62,0.6)' : inputBorder}`, color: ink }}
                  onFocus={(e) => { e.target.style.borderColor = '#C45D3E'; e.target.style.boxShadow = '0 0 0 3px rgba(196,93,62,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? 'rgba(196,93,62,0.6)' : inputBorder; e.target.style.boxShadow = 'none'; }}
                  autoFocus
                />
                {error && <p className="text-[11px] mt-1" style={{ color: '#C45D3E' }}>{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-[13px] font-semibold rounded-xl text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #C45D3E 0%, #A84D33 100%)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center pt-1">
                <Link
                  to="/login"
                  className="text-[12px] font-medium transition-opacity hover:opacity-80"
                  style={{ color: muted }}
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: muted }}>
          Powered by AI. Built for marketers.
        </p>
      </div>
    </div>
  );
}

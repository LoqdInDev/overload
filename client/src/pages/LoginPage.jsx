import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

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
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
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
          {/* Tab toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)' }}>
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all duration-200"
                style={{
                  background: mode === m ? (dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF') : 'transparent',
                  color: mode === m ? ink : muted,
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: muted }}>
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-xl outline-none transition-all duration-200"
                  style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: ink }}
                  onFocus={(e) => { e.target.style.borderColor = '#C45D3E'; e.target.style.boxShadow = '0 0 0 3px rgba(196,93,62,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: muted }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3.5 py-2.5 text-[13px] rounded-xl outline-none transition-all duration-200"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: ink }}
                onFocus={(e) => { e.target.style.borderColor = '#C45D3E'; e.target.style.boxShadow = '0 0 0 3px rgba(196,93,62,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: muted }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Enter password'}
                required
                className="w-full px-3.5 py-2.5 text-[13px] rounded-xl outline-none transition-all duration-200"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: ink }}
                onFocus={(e) => { e.target.style.borderColor = '#C45D3E'; e.target.style.boxShadow = '0 0 0 3px rgba(196,93,62,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && (
              <div
                className="px-3 py-2 rounded-lg text-[12px] animate-fade-in"
                style={{ background: 'rgba(196,93,62,0.1)', color: '#C45D3E', border: '1px solid rgba(196,93,62,0.15)' }}
              >
                {error}
              </div>
            )}

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
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: muted }}>
          Powered by AI. Built for marketers.
        </p>
      </div>
    </div>
  );
}

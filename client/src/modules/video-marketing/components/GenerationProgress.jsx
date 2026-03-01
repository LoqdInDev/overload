import { useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';

export default function GenerationProgress({ visible, streamText }) {
  const containerRef = useRef(null);
  const { dark } = useTheme();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamText]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center animate-fade-in"
      style={{
        zIndex: 9999,
        background: dark ? 'rgba(0,0,0,0.80)' : 'rgba(51,47,43,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 16px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: dark
            ? 'linear-gradient(160deg, rgba(20,18,24,0.97), rgba(12,10,16,0.98))'
            : 'linear-gradient(160deg, #FBF7F0, #FFFFFF)',
          border: dark ? '1px solid rgba(196,93,62,0.25)' : '1px solid rgba(196,93,62,0.2)',
          boxShadow: dark
            ? '0 0 0 1px rgba(196,93,62,0.08), 0 25px 60px -12px rgba(0,0,0,0.7), 0 0 40px -8px rgba(196,93,62,0.15)'
            : '0 25px 60px -12px rgba(51,47,43,0.25), 0 0 40px -8px rgba(196,93,62,0.1)',
          animation: 'genProgressSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderBottom: dark ? '1px solid rgba(196,93,62,0.12)' : '1px solid rgba(196,93,62,0.1)',
            background: dark ? 'rgba(196,93,62,0.04)' : 'rgba(196,93,62,0.03)',
          }}
        >
          {/* Spinner icon */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #C45D3E, #5E8E6E)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                style={{ width: '22px', height: '22px', color: '#FBF7F0', animation: 'spin 1.2s linear infinite' }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div
              style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(196,93,62,0.35), rgba(94,142,110,0.25))',
                filter: 'blur(12px)',
                animation: 'pulse 2.5s ease-in-out infinite',
              }}
            />
          </div>

          {/* Title */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: dark ? '#FBF7F0' : '#332F2B',
                fontFamily: "'Fraunces', serif",
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Generating Content
            </p>
            <p
              style={{
                fontSize: '12px',
                color: dark ? '#94908A' : '#94908A',
                margin: '2px 0 0 0',
              }}
            >
              Crafting your ad content...
            </p>
          </div>

          {/* Animated dots */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === 0 ? '#C45D3E' : i === 1 ? '#5E8E6E' : '#C45D3E',
                  opacity: i === 1 ? 0.7 : 0.9,
                  animation: `bounce 1.4s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Stream text area */}
        <div
          ref={containerRef}
          style={{
            padding: '20px 24px',
            height: '300px',
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            color: dark ? '#94908A' : '#6B6560',
            background: dark ? 'rgba(0,0,0,0.15)' : 'rgba(237,229,218,0.25)',
          }}
        >
          {streamText || (
            <span style={{ color: dark ? '#555' : '#AAA5A0', fontStyle: 'italic' }}>
              Waiting for response...
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{
          height: '3px',
          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          <div
            style={{
              height: '100%',
              width: '100%',
              background: 'linear-gradient(90deg, #C45D3E, #5E8E6E, #C45D3E)',
              backgroundSize: '200% 100%',
              animation: 'genProgressShimmer 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes genProgressSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes genProgressShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

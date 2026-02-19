import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODULE_REGISTRY, CATEGORIES, getModulesByCategory } from '../../config/modules';
import { useTheme } from '../../context/ThemeContext';

/* ---- Animated counter ---- */
function Counter({ end, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setVal(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ---- Typing headline ---- */
function TypingText({ text, speed = 60 }) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      <span className="typing-cursor" />
    </span>
  );
}

const STATS = [
  { num: 43, suffix: '+', label: 'Active Modules', color: '#00d4ff', darkAlt: '#4338ca' },
  { num: 100, suffix: '%', label: 'AI Powered', color: '#9b59b6', darkAlt: '#7c3aed' },
  { num: 0, suffix: '', label: 'Extra Tools Needed', color: '#00ff88', darkAlt: '#059669', prefix: '$' },
  { num: 10, suffix: 'x', label: 'Faster Output', color: '#f97316', darkAlt: '#ea580c' },
];

const ACTIVITY_FEED = [
  { id: 1, module: 'Content', action: 'Generated blog post', detail: '"10 Growth Hacks for 2026"', time: '2 min ago', color: '#f97316', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { id: 2, module: 'Ads', action: 'Campaign optimized', detail: 'Google Shopping ROAS +18%', time: '15 min ago', color: '#10b981', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
  { id: 3, module: 'Email', action: 'Drip sequence launched', detail: '3,400 subscribers targeted', time: '1 hr ago', color: '#f59e0b', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { id: 4, module: 'Social', action: 'Scheduled 12 posts', detail: 'Instagram, TikTok, LinkedIn', time: '2 hr ago', color: '#3b82f6', icon: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z' },
  { id: 5, module: 'SEO', action: 'Audit completed', detail: '94/100 health score', time: '3 hr ago', color: '#14b8a6', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
];

const AI_SUGGESTIONS = [
  { id: 1, title: 'Activate Autopilot Mode', desc: 'Your content and ads modules are running manually. Enable Autopilot to let AI handle scheduling, optimization, and A/B testing automatically.', priority: 'high', path: '/autopilot', color: '#f59e0b' },
  { id: 2, title: 'Set Up Brand Profile', desc: 'Complete your brand DNA so every module generates on-brand content automatically. 0% configured.', priority: 'high', path: '/brand-profile', color: '#8b5cf6' },
  { id: 3, title: 'Connect Your Platforms', desc: 'Link Shopify, Google Ads, and Meta Ads to unlock cross-platform analytics and automated campaigns.', priority: 'medium', path: '/integrations', color: '#6366f1' },
  { id: 4, title: 'Budget Reallocation Opportunity', desc: 'TikTok Ads ROAS is 3.2x vs Google at 1.8x. Consider shifting 20% budget to TikTok.', priority: 'medium', path: '/budget-optimizer', color: '#059669' },
];

const QUICK_ACTIONS = [
  { label: 'Activate Autopilot', path: '/autopilot', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', color: '#f59e0b', special: true },
  { label: 'Create Video Ad', path: '/video-marketing', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: '#8b5cf6' },
  { label: 'Generate Content', path: '/content', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: '#f97316' },
  { label: 'Launch Campaign', path: '/ads', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', color: '#10b981' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { dark } = useTheme();

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">

      {/* ====== HERO ====== */}
      <div className="relative overflow-hidden rounded-xl p-8"
        style={{
          background: dark
            ? 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(155,89,182,0.04) 50%, rgba(0,255,136,0.03) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 50%, rgba(16,185,129,0.04) 100%)',
          border: dark ? '1px solid rgba(0,212,255,0.08)' : '1px solid rgba(99,102,241,0.15)',
        }}
      >
        {/* Corner brackets */}
        {dark && (
          <>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/30" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/30" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/30" />
          </>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{
            background: dark ? '#00ff88' : '#22c55e',
            boxShadow: dark ? '0 0 8px #00ff88' : 'none',
            animation: dark ? 'dot-pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: dark ? '#00ff88' : '#16a34a' }}>
            System Active
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight" style={{ color: dark ? '#e2e8f0' : '#0f172a' }}>
          <TypingText text="Command Center" speed={50} />
        </h1>

        <p className="text-sm max-w-xl leading-relaxed" style={{ color: dark ? '#94a3b8' : '#64748b' }}>
          Your AI-powered marketing command center. 30+ modules working in sync — content creation,
          paid ads, automation, analytics, and full autopilot mode.
        </p>

        <div className="flex gap-3 mt-6">
          <button onClick={() => navigate('/autopilot')}
            className="btn-cyber px-5 py-2.5 text-xs font-bold tracking-wider rounded-lg transition-all"
            style={{
              background: dark ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: dark ? '#fbbf24' : '#ffffff',
              border: dark ? '1px solid rgba(245,158,11,0.25)' : 'none',
              boxShadow: dark ? '0 0 25px rgba(245,158,11,0.15)' : '0 2px 8px rgba(245,158,11,0.3)',
            }}
          >
            Activate Autopilot
          </button>
          <button onClick={() => navigate('/brand-profile')}
            className="px-5 py-2.5 text-xs font-bold tracking-wider rounded-lg transition-all"
            style={{
              background: dark ? 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(155,89,182,0.06))' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: dark ? '#00d4ff' : '#ffffff',
              border: dark ? '1px solid rgba(0,212,255,0.15)' : 'none',
              boxShadow: dark ? '0 0 15px rgba(0,212,255,0.08)' : '0 2px 8px rgba(99,102,241,0.3)',
            }}
          >
            Set Up Brand Profile
          </button>
          <button onClick={() => navigate('/content')}
            className="px-5 py-2.5 text-xs font-bold tracking-wider rounded-lg transition-all"
            style={{
              background: 'transparent',
              color: dark ? '#94a3b8' : '#64748b',
              border: dark ? '1px solid rgba(148,163,184,0.15)' : '1px solid #d1d5db',
            }}
          >
            Explore Modules
          </button>
        </div>
      </div>

      {/* ====== STATS ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <div key={i} className="relative rounded-xl p-5 text-center transition-all duration-300 hover:-translate-y-1"
            style={{
              background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
              border: dark ? `1px solid ${s.color}15` : '1px solid #e5e7eb',
              boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {dark && (
              <>
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: `${s.color}30` }} />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: `${s.color}30` }} />
              </>
            )}
            <div className="text-2xl font-bold mb-1" style={{
              color: dark ? s.color : s.darkAlt,
              textShadow: dark ? `0 0 20px ${s.color}40` : 'none',
            }}>
              {s.prefix || ''}<Counter end={s.num} suffix={s.suffix} />
            </div>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: dark ? '#64748b' : '#475569' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ====== QUICK ACTIONS ====== */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full" style={{ background: dark ? '#00d4ff' : '#6366f1' }} />
          <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: dark ? '#e2e8f0' : '#0f172a' }}>
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <button key={i} onClick={() => navigate(action.path)}
              className="group relative rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-1"
              style={{
                background: action.special
                  ? (dark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)')
                  : (dark ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                border: action.special
                  ? (dark ? '1px solid rgba(245,158,11,0.15)' : '1px solid rgba(245,158,11,0.25)')
                  : (dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #e5e7eb'),
                boxShadow: action.special && dark ? '0 0 20px rgba(245,158,11,0.06)' : (dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'),
              }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-all"
                style={{
                  background: dark ? `${action.color}15` : `${action.color}10`,
                  border: dark ? `1px solid ${action.color}20` : 'none',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke={action.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
              </div>
              <div className="text-xs font-bold" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>{action.label}</div>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke={dark ? '#64748b' : '#64748b'} viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ====== ACTIVITY FEED + AI SUGGESTIONS (2-column) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity Feed */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: dark ? '#00ff88' : '#22c55e' }} />
            <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: dark ? '#e2e8f0' : '#0f172a' }}>
              Live Activity
            </h2>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: dark ? '#00ff88' : '#22c55e', boxShadow: dark ? '0 0 8px #00ff88' : 'none' }} />
          </div>
          <div className="rounded-xl overflow-hidden" style={{
            background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
            border: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #e5e7eb',
            boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            {ACTIVITY_FEED.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${dark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} ${i < ACTIVITY_FEED.length - 1 ? (dark ? 'border-b border-white/[0.03]' : 'border-b border-gray-100') : ''}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15`, border: dark ? `1px solid ${item.color}20` : 'none' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke={item.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${item.color}12`, color: item.color }}>{item.module}</span>
                    <span className="text-xs font-medium" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>{item.action}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: dark ? '#64748b' : '#94a3b8' }}>{item.detail}</p>
                </div>
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: dark ? '#4a5568' : '#94a3b8' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Suggestions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: dark ? '#f59e0b' : '#d97706' }} />
            <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: dark ? '#e2e8f0' : '#0f172a' }}>
              AI Suggestions
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
              background: dark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
              color: '#f59e0b',
              border: dark ? '1px solid rgba(245,158,11,0.15)' : '1px solid rgba(245,158,11,0.2)',
            }}>
              {AI_SUGGESTIONS.length} new
            </span>
          </div>
          <div className="space-y-2">
            {AI_SUGGESTIONS.map(sug => (
              <button key={sug.id} onClick={() => navigate(sug.path)}
                className="w-full text-left group rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                  border: dark ? `1px solid ${sug.color}10` : '1px solid #e5e7eb',
                  boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{
                    background: sug.priority === 'high' ? '#f59e0b' : '#3b82f6',
                    boxShadow: dark ? `0 0 6px ${sug.priority === 'high' ? '#f59e0b' : '#3b82f6'}` : 'none',
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold mb-1" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>{sug.title}</div>
                    <p className="text-[11px] leading-relaxed" style={{ color: dark ? '#64748b' : '#94a3b8' }}>{sug.desc}</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke={sug.color} viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ====== MODULE GRID ====== */}
      {CATEGORIES.map(cat => {
        const mods = getModulesByCategory(cat.id);
        if (mods.length === 0) return null;
        return (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: dark ? '#9b59b6' : '#7c3aed' }} />
              <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: dark ? '#e2e8f0' : '#0f172a' }}>
                {cat.label}
              </h2>
              <span className="text-[10px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-full" style={{
                color: dark ? '#64748b' : '#64748b',
                background: dark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
              }}>
                {mods.length} modules
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {mods.map(mod => (
                <button key={mod.id} onClick={() => navigate(mod.path)}
                  className="group relative rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  style={{
                    background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                    border: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #e5e7eb',
                    boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${mod.color}08, transparent 70%)` }} />

                  {dark && (
                    <>
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l transition-colors duration-300" style={{ borderColor: `${mod.color}20` }} />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r transition-colors duration-300" style={{ borderColor: `${mod.color}20` }} />
                    </>
                  )}

                  <div className="relative flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                      style={{
                        background: dark ? `${mod.color}12` : `${mod.color}10`,
                        border: dark ? `1px solid ${mod.color}20` : 'none',
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke={mod.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold mb-1 flex items-center gap-2" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
                        {mod.name}
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                          background: mod.color,
                          boxShadow: dark ? `0 0 6px ${mod.color}` : 'none',
                        }} />
                      </div>
                      <div className="text-[11px] leading-relaxed line-clamp-2" style={{ color: dark ? '#64748b' : '#64748b' }}>
                        {mod.description}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                    <svg className="w-4 h-4" fill="none" stroke={mod.color} viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* ====== TERMINAL / SYSTEM STATUS ====== */}
      <div className="relative rounded-xl overflow-hidden"
        style={{
          background: dark ? 'rgba(0,0,0,0.4)' : '#1e293b',
          border: dark ? '1px solid rgba(0,212,255,0.1)' : 'none',
        }}
      >
        {dark && (
          <>
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/20" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/20" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/20" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/20" />
          </>
        )}

        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: dark ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.1)' }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: dark ? '#4a5568' : '#94a3b8' }}>
            OVERLOAD // SYSTEM STATUS
          </span>
        </div>

        {/* Terminal body */}
        <div className="p-4 font-mono text-xs space-y-1.5">
          <div><span style={{ color: '#00d4ff' }}>$</span> <span style={{ color: '#e2e8f0' }}>overload status --all</span></div>
          <div style={{ color: '#00ff88' }}>&#10003; {MODULE_REGISTRY.length} modules loaded and operational</div>
          <div style={{ color: '#00ff88' }}>&#10003; AI engine: Claude — connected</div>
          <div style={{ color: '#00ff88' }}>&#10003; Video generation: WaveSpeed + Kling — ready</div>
          <div style={{ color: '#00ff88' }}>&#10003; Autopilot engine — standby</div>
          <div style={{ color: '#00ff88' }}>&#10003; Database: SQLite — synchronized</div>
          <div style={{ color: '#f5a623' }}>&#8987; Autopilot awaiting activation...</div>
          <div className="pt-1">
            <span style={{ color: '#00d4ff' }}>$</span>{' '}
            <span className="typing-cursor" />
          </div>
        </div>
      </div>

    </div>
  );
}

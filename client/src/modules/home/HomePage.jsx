import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { MODULE_REGISTRY, CATEGORIES } from '../../config/modules';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useAutomation } from '../../context/AutomationContext';
import { fetchJSON, postJSON } from '../../lib/api';
import OnboardingWizard from '../../components/shared/OnboardingWizard';

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function Counter({ end, suffix = '', prefix = '', duration = 1600 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1);
          setVal(Math.round((1 - Math.pow(1 - p, 3)) * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

function Sparkline({ data, color, idx }) {
  if (!data || data.length < 2) return <div className="w-[72px] h-[28px]" />;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 72, h = 28;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / range) * (h - 4),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const uid = `sp${idx}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r={2.5} fill={color} />
    </svg>
  );
}

function SkeletonPulse({ className, style }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: 'currentColor', opacity: 0.07, ...style }} />;
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Quick Actions (static navigation) ─── */
const QUICK = [
  { label: 'Create Video', sub: 'AI clips & reels', path: '/video-marketing', color: '#C45D3E', grad: '#D4735A',
    filled: true,
    icon: 'M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z' },
  { label: 'Write Content', sub: 'Blog, copy & more', path: '/content', color: '#D4915C', grad: '#E0A573',
    filled: true,
    icon: 'M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z' },
  { label: 'Launch Ads', sub: 'Google & Meta', path: '/ads', color: '#5E8E6E', grad: '#76A685',
    filled: true,
    icon: 'M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z' },
  { label: 'Send Email', sub: 'Campaigns & drips', path: '/email-sms', color: '#8B7355', grad: '#A48B6B',
    filled: true,
    icon: 'M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z' },
  { label: 'Post Social', sub: '7 platforms', path: '/social', color: '#9B6B6B', grad: '#B38383',
    filled: true,
    icon: 'M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 0010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z' },
  { label: 'Autopilot', sub: 'Automated flows', path: '/autopilot', color: '#C45D3E', grad: '#D4735A',
    filled: true,
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ═══════════════════════════════════════════
   COMMAND CENTER — Automation Mission Control
   ═══════════════════════════════════════════ */

export default function HomePage() {
  usePageTitle('Dashboard');
  const nav = useNavigate();
  const { dark } = useTheme();
  const { user } = useAuth();
  const { modes, pendingCount, actionStats, getMode, refreshPending } = useAutomation();
  const greeting = useMemo(getGreeting, []);

  // ─── Onboarding state ───
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    fetchJSON('/api/onboarding/state').then(data => {
      if (!data.completed && !data.dismissed) setShowOnboarding(true);
    }).catch(() => {});
  }, []);

  // ─── Mode distribution ───
  const modeDist = useMemo(() => {
    let autopilot = 0, copilot = 0, manual = 0;
    MODULE_REGISTRY.forEach(m => {
      const mode = getMode(m.id);
      if (mode === 'autopilot') autopilot++;
      else if (mode === 'copilot') copilot++;
      else manual++;
    });
    return { autopilot, copilot, manual };
  }, [modes, getMode]);

  const hasAutomation = modeDist.autopilot > 0 || modeDist.copilot > 0;

  // ─── Data state ───
  const [summary, setSummary] = useState(null);
  const [feedItems, setFeedItems] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [feedActing, setFeedActing] = useState(false);

  const EMPTY_SUMMARY = { kpi: [
    { label: 'Revenue', value: 0, prefix: '$', color: '#5E8E6E', trend: '$0', up: false, spark: [0,0,0,0,0,0,0], sub: 'this week' },
    { label: 'Campaigns', value: 0, color: '#C45D3E', trend: '0', up: false, spark: [0,0,0,0,0,0,0], sub: 'active' },
    { label: 'Content', value: 0, color: '#D4915C', trend: '0', up: false, spark: [0,0,0,0,0,0,0], sub: '0 this week' },
    { label: 'Subscribers', value: 0, color: '#8B7355', trend: '0', up: false, spark: [0,0,0,0,0,0,0], sub: 'total' },
  ] };

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      fetchJSON('/api/dashboard/summary'),
      fetchJSON('/api/automation/actions?limit=15').catch(() => fetchJSON('/api/dashboard/feed?limit=10')),
      fetchJSON('/api/automation/approvals?limit=5'),
    ]);
    setSummary(results[0].status === 'fulfilled' ? results[0].value : EMPTY_SUMMARY);
    const feedVal = results[1].status === 'fulfilled' ? results[1].value : null;
    setFeedItems(Array.isArray(feedVal) ? feedVal : Array.isArray(feedVal?.actions) ? feedVal.actions : []);
    const apprVal = results[2].status === 'fulfilled' ? results[2].value : null;
    setApprovals(Array.isArray(apprVal) ? apprVal : Array.isArray(apprVal?.approvals) ? apprVal.approvals : []);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const kpi = summary?.kpi || [];
  const feed = feedItems || [];
  const approvalItems = approvals || [];
  const isLoading = summary === null;

  // ─── Approve / Reject handlers ───
  const handleApprove = useCallback(async (id) => {
    setFeedActing(true);
    try {
      await postJSON(`/api/automation/approvals/${id}/approve`, {});
      refreshPending();
      loadData();
    } catch { /* silent */ }
    setFeedActing(false);
  }, [refreshPending, loadData]);

  const handleReject = useCallback(async (id) => {
    setFeedActing(true);
    try {
      await postJSON(`/api/automation/approvals/${id}/reject`, {});
      refreshPending();
      loadData();
    } catch { /* silent */ }
    setFeedActing(false);
  }, [refreshPending, loadData]);

  // ─── Quick actions with conditional Review Queue ───
  const quickActions = useMemo(() => {
    const base = [...QUICK];
    if (pendingCount > 0) {
      base.push({
        label: 'Review Queue',
        sub: `${pendingCount} pending`,
        path: '/approvals',
        color: '#D4915C',
        grad: '#E0A573',
        filled: true,
        icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      });
    }
    return base;
  }, [pendingCount]);

  /* ── Theme Tokens ── */
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const t2 = dark ? '#94908A' : '#7A756F';
  const t3 = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)';
  const surface = dark ? 'rgba(255,255,255,0.02)' : '#fff';
  const panelBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const dmSans = "'DM Sans', system-ui, sans-serif";
  const fraunces = "'Fraunces', Georgia, serif";

  const panel = (delay = 0) => ({
    background: surface,
    border: `1px solid ${panelBorder}`,
    borderRadius: 16,
    animationDelay: `${delay}ms`,
  });

  const displayName = user?.displayName || user?.email?.split('@')[0] || '';

  const modeColor = (mode) => {
    if (mode === 'autopilot') return sage;
    if (mode === 'copilot') return '#D4915C';
    return t3;
  };

  const modeBg = (mode) => {
    if (mode === 'autopilot') return dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)';
    if (mode === 'copilot') return dark ? 'rgba(212,145,92,0.15)' : 'rgba(212,145,92,0.1)';
    return dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  };

  return (
    <div className="p-4 sm:p-5 md:p-7 lg:p-9 max-w-[1440px] mx-auto space-y-4" style={{ fontFamily: dmSans }}>

      {/* ═══ ONBOARDING WIZARD ═══ */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      {/* ═══ 1. AUTOMATION STATUS RIBBON ═══ */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl" style={{
        background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(94,142,110,0.04)',
        border: `1px solid ${panelBorder}`,
      }}>
        {/* Left: Systems Online */}
        <div className="flex items-center gap-1.5">
          <div className="w-[7px] h-[7px] rounded-full" style={{
            background: sage,
            boxShadow: `0 0 6px ${sage}80`,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: sage }}>
            Systems Online
          </span>
        </div>

        {/* Center: Mode distribution */}
        <div className="hidden sm:flex items-center gap-1 mx-auto">
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: sage }}>
            {modeDist.autopilot} Autopilot
          </span>
          <span className="text-[10px]" style={{ color: t3 }}>&middot;</span>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#D4915C' }}>
            {modeDist.copilot} Copilot
          </span>
          <span className="text-[10px]" style={{ color: t3 }}>&middot;</span>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: t3 }}>
            {modeDist.manual} Manual
          </span>
        </div>

        {/* Right: Pending + Actions today */}
        <div className="flex items-center gap-2 ml-auto">
          {pendingCount > 0 && (
            <button
              onClick={() => nav('/approvals')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors"
              style={{
                background: dark ? 'rgba(212,145,92,0.15)' : 'rgba(212,145,92,0.1)',
                color: '#D4915C',
              }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(212,145,92,0.25)' : 'rgba(212,145,92,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(212,145,92,0.15)' : 'rgba(212,145,92,0.1)'}
            >
              {pendingCount} awaiting review
            </button>
          )}
          <span className="text-[10px] font-medium tabular-nums" style={{ color: t3 }}>
            {actionStats.today} AI actions today
          </span>
        </div>
      </div>

      {/* ═══ 2. GREETING + AI SUMMARY ═══ */}
      <div className="px-1 pt-3 pb-3" style={{ animationDelay: '30ms' }}>
        <h1 className="text-[22px] sm:text-[26px] md:text-[32px] leading-tight" style={{
          fontFamily: fraunces,
          fontStyle: 'italic',
          color: ink,
          letterSpacing: '-0.01em',
        }}>
          {greeting}{displayName ? `, ${displayName}` : ''}.
        </h1>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: t2 }}>
          {isLoading ? (
            <SkeletonPulse className="h-4 w-72 inline-block" />
          ) : hasAutomation ? (
            <>
              <span style={{ color: sage }}>Autopilot handled </span>
              <span className="font-bold" style={{ color: sage }}>{actionStats.today} actions</span>
              <span style={{ color: t2 }}> today. </span>
              {pendingCount > 0 ? (
                <>
                  <span className="font-semibold" style={{ color: '#D4915C' }}>{pendingCount} items</span>
                  <span> await your review.</span>
                </>
              ) : (
                <span>All caught up on reviews.</span>
              )}
            </>
          ) : (
            <>All modules in manual mode. Enable Copilot to get AI suggestions.</>
          )}
        </p>
      </div>

      {/* ═══ 3. QUICK ACTIONS ═══ */}
      <div className="overflow-hidden rounded-2xl" style={panel(60)}>
        <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3" style={{ borderBottom: `1px solid ${panelBorder}` }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke={terra} viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
            Quick Actions
          </span>
        </div>
        <div className="p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
          {quickActions.map((q, i) => (
            <button key={i} onClick={() => nav(q.path)}
              className="group/q flex flex-col items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-4 sm:py-5 rounded-2xl transition-all duration-300 cursor-pointer"
              style={{
                background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(44,40,37,0.02)',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.05)'}`,
                animationDelay: `${80 + i * 30}ms`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = dark ? `${q.color}10` : `${q.color}08`;
                e.currentTarget.style.borderColor = dark ? `${q.color}25` : `${q.color}18`;
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = `0 12px 24px -6px ${q.color}25`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.02)' : 'rgba(44,40,37,0.02)';
                e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.05)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="relative">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover/q:scale-110 group-hover/q:rotate-3" style={{
                  background: `linear-gradient(135deg, ${q.color}, ${q.grad})`,
                  boxShadow: `0 6px 16px -2px ${q.color}40`,
                }}>
                  {q.filled ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d={q.icon} />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={q.icon} />
                    </svg>
                  )}
                </div>
                <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover/q:opacity-100 transition-opacity duration-300 -z-10" style={{
                  background: `linear-gradient(135deg, ${q.color}20, ${q.grad}20)`,
                  filter: 'blur(8px)',
                }} />
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-bold" style={{ color: dark ? '#B5B0AA' : '#4A4541' }}>
                  {q.label}
                </span>
                <span className="block text-[9px] font-medium mt-0.5" style={{ color: dark ? '#6B6660' : '#94908A' }}>
                  {q.sub}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 4. THREE-PANEL MAIN AREA ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ─── LEFT: Operations Feed (3/5) ─── */}
        <div className="lg:col-span-3 overflow-hidden rounded-2xl" style={panel(140)}>
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3" style={{ borderBottom: `1px solid ${panelBorder}` }}>
            <div className="w-[6px] h-[6px] rounded-full" style={{ background: sage }} />
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
              Operations Feed
            </span>
            <div className="flex-1" />
            <span className="text-[10px] font-medium" style={{ color: sage }}>Live</span>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <SkeletonPulse className="w-3 h-3 !rounded-full flex-shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <SkeletonPulse className="h-3 w-48" />
                      <SkeletonPulse className="h-2.5 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <svg className="w-8 h-8" style={{ color: t3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-medium" style={{ color: t3 }}>
                  No activity yet. Start using modules to see your feed.
                </span>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[20px] sm:left-[28px] top-0 bottom-0 w-px" style={{ background: brd }} />
                {feed.map((item, i) => {
                  const itemMode = item.mode || (item.moduleId ? getMode(item.moduleId) : 'manual');
                  const isPending = item.status === 'pending_approval' || item.pending;
                  const itemColor = item.color || (MODULE_REGISTRY.find(m => m.id === item.moduleId)?.color) || t3;
                  return (
                    <div key={item.id || i}
                      className="flex items-start gap-2.5 sm:gap-3 px-3 sm:px-5 py-3 relative transition-colors"
                      style={{
                        borderLeft: isPending ? `3px solid #D4915C` : '3px solid transparent',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.015)' : 'rgba(44,40,37,0.015)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="relative z-10 w-[10px] h-[10px] rounded-full border-2 mt-1 flex-shrink-0" style={{
                        borderColor: itemColor,
                        background: dark ? '#1A1816' : '#ffffff',
                      }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{
                            background: dark ? `${itemColor}12` : `${itemColor}0c`,
                            color: itemColor,
                          }}>{item.module || item.moduleName || 'System'}</span>

                          {(itemMode === 'autopilot' || itemMode === 'copilot') && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{
                              background: modeBg(itemMode),
                              color: modeColor(itemMode),
                            }}>
                              {itemMode === 'autopilot' ? 'AUTO' : 'COPILOT'}
                            </span>
                          )}

                          {isPending && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{
                              background: dark ? 'rgba(212,145,92,0.15)' : 'rgba(212,145,92,0.1)',
                              color: '#D4915C',
                            }}>
                              Needs Review
                            </span>
                          )}

                          <span className="text-[12px] font-semibold" style={{ color: ink }}>
                            {item.action || item.title || item.description}
                          </span>
                          <span className="text-[10px] ml-auto tabular-nums flex-shrink-0 font-medium" style={{ color: t3 }}>
                            {item.time ? `${item.time} ago` : (item.createdAt ? relativeTime(item.createdAt) : '')}
                          </span>
                        </div>

                        {item.detail && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: t3 }}>{item.detail}</p>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={feedActing}
                              className="text-[10px] font-bold px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                background: dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)',
                                color: sage,
                              }}
                              onMouseEnter={e => { if (!feedActing) e.currentTarget.style.background = dark ? 'rgba(94,142,110,0.25)' : 'rgba(94,142,110,0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)'; }}
                            >
                              {feedActing ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              disabled={feedActing}
                              className="text-[10px] font-bold px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                background: dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.07)',
                                color: terra,
                              }}
                              onMouseEnter={e => { if (!feedActing) e.currentTarget.style.background = dark ? 'rgba(196,93,62,0.2)' : 'rgba(196,93,62,0.12)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.07)'; }}
                            >
                              {feedActing ? '...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Stacked panels (2/5) ─── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Approval Queue Preview ── */}
          <div className="overflow-hidden rounded-2xl" style={panel(200)}>
            <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3" style={{ borderBottom: `1px solid ${panelBorder}` }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="#D4915C" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
                Approval Queue
              </span>
              {pendingCount > 0 && (
                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full ml-auto tabular-nums" style={{
                  background: dark ? 'rgba(212,145,92,0.15)' : 'rgba(212,145,92,0.1)',
                  color: '#D4915C',
                }}>
                  {pendingCount}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 px-2 py-2">
                    <SkeletonPulse className="w-1 self-stretch flex-shrink-0 !rounded-full" />
                    <div className="flex-1 space-y-2">
                      <SkeletonPulse className="h-3 w-36" />
                      <SkeletonPulse className="h-2.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : approvalItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <svg className="w-8 h-8" style={{ color: sage }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-bold" style={{ color: sage }}>All caught up</span>
              </div>
            ) : (
              <div className="p-2">
                {approvalItems.slice(0, 5).map((item, i) => {
                  const mod = MODULE_REGISTRY.find(m => m.id === item.moduleId);
                  const priorityColor = item.priority === 'high' ? terra : item.priority === 'medium' ? '#D4915C' : t3;
                  return (
                    <div key={item.id || i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: priorityColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: ink }}>
                          {item.title || item.action}
                        </div>
                        <div className="text-[9px] font-medium" style={{ color: t3 }}>
                          {mod?.name || item.module || 'Unknown'} &middot; {item.createdAt ? relativeTime(item.createdAt) : item.time || ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleApprove(item.id)}
                          disabled={feedActing}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)' }}
                          onMouseEnter={e => { if (!feedActing) e.currentTarget.style.background = dark ? 'rgba(94,142,110,0.25)' : 'rgba(94,142,110,0.15)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)'; }}
                          title="Approve"
                        >
                          <svg className="w-3 h-3" fill="none" stroke={sage} viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </button>
                        <button onClick={() => handleReject(item.id)}
                          disabled={feedActing}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: dark ? 'rgba(196,93,62,0.1)' : 'rgba(196,93,62,0.06)' }}
                          onMouseEnter={e => { if (!feedActing) e.currentTarget.style.background = dark ? 'rgba(196,93,62,0.2)' : 'rgba(196,93,62,0.12)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(196,93,62,0.1)' : 'rgba(196,93,62,0.06)'; }}
                          title="Reject"
                        >
                          <svg className="w-3 h-3" fill="none" stroke={terra} viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pendingCount > 5 && (
                  <button onClick={() => nav('/approvals')}
                    className="w-full text-center text-[11px] font-bold py-2 mt-1 rounded-lg transition-colors"
                    style={{ color: '#D4915C' }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(212,145,92,0.08)' : 'rgba(212,145,92,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    View All &rarr;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Module Status Grid ── */}
          <div className="overflow-hidden rounded-2xl" style={panel(260)}>
            <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3" style={{ borderBottom: `1px solid ${panelBorder}` }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke={ink} viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
                Module Status
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: sage }} />
                  <span className="text-[9px] font-semibold" style={{ color: t3 }}>Auto</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#D4915C' }} />
                  <span className="text-[9px] font-semibold" style={{ color: t3 }}>Copilot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: t3 }} />
                  <span className="text-[9px] font-semibold" style={{ color: t3 }}>Manual</span>
                </div>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {CATEGORIES.map(cat => {
                const catModules = MODULE_REGISTRY.filter(m => m.category === cat.id);
                if (catModules.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}12` }}>
                        <svg className="w-3 h-3" fill="none" stroke={cat.color} viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                      <div className="flex-1 h-px" style={{ background: panelBorder }} />
                    </div>
                    <div className="px-2 pb-1 grid grid-cols-2 gap-px">
                      {catModules.map(mod => {
                        const mode = getMode(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => nav(mod.path)}
                            className="flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-left transition-all duration-150 group/mod"
                            onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover/mod:scale-110"
                              style={{ background: `${mod.color}14` }}>
                              <svg className="w-3 h-3" fill="none" stroke={mod.color} viewBox="0 0 24 24" strokeWidth={1.6}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                              </svg>
                            </div>
                            <span className="text-[11px] font-medium truncate flex-1" style={{ color: dark ? '#B5B0AA' : '#4A4541' }}>
                              {mod.name}
                            </span>
                            {mode !== 'manual' && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: modeBg(mode), color: modeColor(mode) }}>
                                {mode === 'autopilot' ? 'AUTO' : 'CO'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 5. KPI ROW (condensed) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ ...panel(320 + i * 30) }}>
              <SkeletonPulse className="h-3 w-16 mb-3" />
              <SkeletonPulse className="h-6 w-20 mb-2" />
              <SkeletonPulse className="h-3 w-16" />
            </div>
          ))
        ) : (
          kpi.map((k, i) => (
            <div key={i} className="rounded-2xl p-4 relative overflow-hidden group/kpi transition-all duration-300 hover:-translate-y-0.5"
              style={{
                ...panel(320 + i * 30),
                borderLeft: `3px solid ${k.color}${dark ? '60' : '40'}`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 24px -6px ${k.color}18`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: t3 }}>
                    {k.label}
                  </div>
                  <div className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-none tracking-tight" style={{
                    color: ink,
                    fontFamily: dmSans,
                  }}>
                    <Counter end={k.value} prefix={k.prefix} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-lg" style={{
                      background: k.up
                        ? (dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)')
                        : 'rgba(196,93,62,0.08)',
                      color: k.up ? sage : terra,
                    }}>
                      <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={k.up ? 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25' : 'M4.5 4.5l15 15m0 0H8.25m11.25 0V8.25'} />
                      </svg>
                      {k.trend}
                    </span>
                    <span className="text-[8px]" style={{ color: t3 }}>{k.sub}</span>
                  </div>
                </div>
                <div className="opacity-50 group-hover/kpi:opacity-100 transition-opacity">
                  <Sparkline data={k.spark} color={k.color} idx={i} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Breathing pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(94,142,110,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 12px rgba(94,142,110,0.8); }
        }
      `}</style>
    </div>
  );
}

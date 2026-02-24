import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODULE_REGISTRY, CATEGORIES } from '../../config/modules';
import { useTheme } from '../../context/ThemeContext';

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

/* ═══════════════════════════════════════════
   DATA — In production, this comes from your API
   ═══════════════════════════════════════════ */

const KPI = [
  { label: 'Revenue', value: 4820, prefix: '$', color: '#5E8E6E', trend: '+12.4%', up: true, spark: [320, 410, 380, 520, 490, 610, 680], sub: 'today' },
  { label: 'Campaigns', value: 8, color: '#C45D3E', trend: '+2', up: true, spark: [5, 5, 6, 6, 7, 7, 8], sub: 'active' },
  { label: 'Content', value: 23, color: '#D4915C', trend: '+7', up: true, spark: [12, 14, 16, 18, 19, 21, 23], sub: 'this week' },
  { label: 'Subscribers', value: 12400, color: '#8B7355', trend: '+340', up: true, spark: [11200, 11400, 11700, 11900, 12000, 12200, 12400], sub: 'total' },
];

const WEEKLY = [
  { day: 'Mon', rev: 3200 },
  { day: 'Tue', rev: 4100 },
  { day: 'Wed', rev: 3800 },
  { day: 'Thu', rev: 5200 },
  { day: 'Fri', rev: 4900 },
  { day: 'Sat', rev: 6100 },
  { day: 'Sun', rev: 4820 },
];

const CHANNELS = [
  { name: 'Google Ads', pct: 38, color: '#C45D3E' },
  { name: 'Meta Ads', pct: 27, color: '#5E8E6E' },
  { name: 'Email', pct: 18, color: '#D4915C' },
  { name: 'Organic', pct: 12, color: '#8B7355' },
  { name: 'TikTok', pct: 5, color: '#9B6B6B' },
];

const ACTIONS = [
  { id: 1, title: 'Complete Brand Profile', desc: 'Improves all AI-generated outputs.', path: '/brand-profile', color: '#C45D3E', priority: 'high' },
  { id: 2, title: 'Connect Ad Platforms', desc: 'Enable cross-platform analytics.', path: '/integrations', color: '#5E8E6E', priority: 'high' },
  { id: 3, title: 'Activate Autopilot', desc: 'AI scheduling & optimization.', path: '/autopilot', color: '#D4915C', priority: 'medium' },
  { id: 4, title: 'Reallocate Budget', desc: 'TikTok ROAS 3.2x vs Google 1.8x.', path: '/budget-optimizer', color: '#8B7355', priority: 'low' },
];

const FEED = [
  { module: 'AI Content', action: 'Generated blog post', detail: '"10 Growth Hacks for 2026"', time: '2m', color: '#D4915C' },
  { module: 'Paid Ads', action: 'Campaign optimized', detail: 'Shopping ROAS +18%', time: '15m', color: '#5E8E6E' },
  { module: 'Email & SMS', action: 'Drip sequence launched', detail: '3,400 targeted', time: '1h', color: '#C45D3E' },
  { module: 'Social', action: 'Scheduled 12 posts', detail: 'IG, TikTok, LinkedIn', time: '2h', color: '#8B7355' },
  { module: 'SEO Suite', action: 'Audit completed', detail: '94/100 health score', time: '3h', color: '#5E8E6E' },
];

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
   COMMAND CENTER — Warm Editorial Design
   ═══════════════════════════════════════════ */

export default function HomePage() {
  const nav = useNavigate();
  const { dark } = useTheme();
  const greeting = useMemo(getGreeting, []);

  /* ── Chart calculations ── */
  const weekTotal = WEEKLY.reduce((s, d) => s + d.rev, 0);
  const weekMax = Math.max(...WEEKLY.map(d => d.rev));
  const weekMin = Math.min(...WEEKLY.map(d => d.rev));
  const weekRange = weekMax - weekMin || 1;
  const todayBar = [6, 0, 1, 2, 3, 4, 5][new Date().getDay()];

  /* Donut gradient */
  let accum = 0;
  const donutGrad = CHANNELS.map(ch => {
    const s = (accum / 100) * 360;
    accum += ch.pct;
    return `${ch.color} ${s}deg ${(accum / 100) * 360}deg`;
  }).join(', ');

  /* SVG area chart */
  const cW = 420, cH = 180, pL = 42, pR = 12, pT = 30, pB = 28;
  const plotW = cW - pL - pR, plotH = cH - pT - pB;
  const chartPts = WEEKLY.map((d, i) => [
    pL + (i / (WEEKLY.length - 1)) * plotW,
    pT + plotH - ((d.rev - weekMin) / weekRange) * plotH,
  ]);
  const chartLine = chartPts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const chartArea = `${chartLine} L${chartPts.at(-1)[0].toFixed(1)},${cH - pB} L${chartPts[0][0].toFixed(1)},${cH - pB} Z`;

  /* ── LP-Matching Theme Tokens ── */
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const t2 = dark ? '#94908A' : '#7A756F';
  const t3 = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)';
  const surface = dark ? 'rgba(255,255,255,0.025)' : '#FFFFFF';
  const dmSans = "'DM Sans', system-ui, sans-serif";
  const fraunces = "'Fraunces', Georgia, serif";

  const card = (delay = 0) => ({
    background: surface,
    border: `1px solid ${brd}`,
    borderRadius: 22,
    boxShadow: dark ? 'none' : '0 2px 12px rgba(44,40,37,0.03)',
    animationDelay: `${delay}ms`,
  });

  return (
    <div className="p-4 sm:p-5 md:p-7 lg:p-9 max-w-[1440px] mx-auto space-y-4" style={{ fontFamily: dmSans }}>

      {/* ═══ STATUS RIBBON ═══ */}
      <div className="cc-panel flex items-center flex-wrap gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-2xl" style={{
        background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(196,93,62,0.03)',
        border: `1px solid ${brd}`,
      }}>
        <div className="flex items-center gap-1.5">
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: sage }} />
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: sage }}>
            Operational
          </span>
        </div>
        <div className="w-px h-3 flex-shrink-0" style={{ background: brd }} />
        <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: t3 }}>
          {MODULE_REGISTRY.length} modules
        </span>
        <div className="w-px h-3 flex-shrink-0" style={{ background: brd }} />
        <div className="flex items-center gap-1.5">
          {CATEGORIES.slice(0, 6).map((cat, i) => (
            <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ background: cat.color, opacity: 0.4 }} />
          ))}
        </div>
        <div className="flex-1" />
        <span className="hidden sm:inline text-[10px] font-medium tabular-nums" style={{ color: t3 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* ═══ GREETING ═══ */}
      <div className="cc-panel px-1 pt-3 pb-4" style={{ animationDelay: '30ms' }}>
        <h1 className="text-[22px] sm:text-[26px] md:text-[32px] leading-tight" style={{
          fontFamily: fraunces,
          fontStyle: 'italic',
          color: ink,
          letterSpacing: '-0.01em',
        }}>
          {greeting}.
        </h1>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: t2 }}>
          Revenue is up{' '}
          <span className="font-bold" style={{ color: sage }}>12%</span>{' '}
          this week &mdash;{' '}
          <span className="font-semibold" style={{ color: terra }}>
            {ACTIONS.filter(a => a.priority === 'high').length} items
          </span>{' '}
          need your attention.
        </p>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPI.map((k, i) => (
          <div key={i} className="cc-panel rounded-[22px] p-4 sm:p-5 relative overflow-hidden group/kpi transition-all duration-300 hover:-translate-y-0.5"
            style={{
              ...card(60 + i * 35),
              borderLeft: `3px solid ${k.color}${dark ? '60' : '40'}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = `0 12px 32px -8px ${k.color}18`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = dark ? 'none' : '0 2px 12px rgba(44,40,37,0.03)';
            }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: t3 }}>
                  {k.label}
                </div>
                <div className="text-[20px] sm:text-[24px] md:text-[28px] font-bold tabular-nums leading-none tracking-tight" style={{
                  color: ink,
                  fontFamily: dmSans,
                }}>
                  <Counter end={k.value} prefix={k.prefix} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{
                    background: k.up
                      ? (dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)')
                      : 'rgba(196,93,62,0.08)',
                    color: k.up ? sage : terra,
                  }}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={k.up ? 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25' : 'M4.5 4.5l15 15m0 0H8.25m11.25 0V8.25'} />
                    </svg>
                    {k.trend}
                  </span>
                  <span className="text-[9px]" style={{ color: t3 }}>{k.sub}</span>
                </div>
              </div>
              <div className="opacity-60 group-hover/kpi:opacity-100 transition-opacity">
                <Sparkline data={k.spark} color={k.color} idx={i} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ REVENUE CHART + CHANNEL MIX ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Revenue Chart — 3 cols */}
        <div className="lg:col-span-3 cc-panel overflow-hidden" style={card(200)}>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5" style={{ borderBottom: `1px solid ${brd}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-4 rounded-full" style={{ background: terra }} />
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
                Revenue This Week
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tabular-nums" style={{ color: t2 }}>
                $<Counter end={weekTotal} />
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase" style={{
                background: dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)',
                color: sage,
              }}>total</span>
            </div>
          </div>

          <div className="px-2 sm:px-3 py-4 w-full overflow-x-auto">
            <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full min-w-[320px]" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="ccRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={terra} stopOpacity={dark ? 0.15 : 0.1} />
                  <stop offset="100%" stopColor={terra} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((pct, i) => (
                <line key={i}
                  x1={pL} y1={pT + plotH * (1 - pct)}
                  x2={cW - pR} y2={pT + plotH * (1 - pct)}
                  stroke={dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.05)'}
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area fill */}
              <path d={chartArea} fill="url(#ccRevGrad)" />

              {/* Line */}
              <path d={chartLine} fill="none" stroke={terra} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

              {/* Data points & labels */}
              {chartPts.map(([x, y], i) => {
                const isToday = i === todayBar;
                const labelY = y - 14;
                return (
                  <g key={i}>
                    {isToday && <circle cx={x} cy={y} r={9} fill={terra} opacity={0.1} />}
                    <circle cx={x} cy={y} r={isToday ? 4.5 : 2.5}
                      fill={isToday ? terra : (dark ? '#1A1816' : '#ffffff')}
                      stroke={terra}
                      strokeWidth={isToday ? 0 : 1.5}
                    />
                    <text x={x} y={labelY} textAnchor="middle" dominantBaseline="auto"
                      style={{
                        fontSize: isToday ? 10 : 8,
                        fontWeight: isToday ? 700 : 500,
                        fill: isToday ? terra : t3,
                        fontFamily: dmSans,
                      }}>
                      ${(WEEKLY[i].rev / 1000).toFixed(1)}k
                    </text>
                    <text x={x} y={cH - 7} textAnchor="middle" dominantBaseline="auto"
                      style={{
                        fontSize: 10,
                        fontWeight: isToday ? 700 : 500,
                        fill: isToday ? terra : t3,
                        fontFamily: dmSans,
                      }}>
                      {WEEKLY[i].day}
                    </text>
                  </g>
                );
              })}

              {/* Y-axis labels */}
              {[0, 0.5, 1].map((pct, i) => (
                <text key={i} x={pL - 5} y={pT + plotH * (1 - pct) + 3} textAnchor="end"
                  style={{ fontSize: 8, fill: t3, fontFamily: dmSans }}>
                  ${((weekMin + weekRange * pct) / 1000).toFixed(1)}k
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Channel Mix — 2 cols */}
        <div className="lg:col-span-2 cc-panel overflow-hidden" style={card(240)}>
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5" style={{ borderBottom: `1px solid ${brd}` }}>
            <div className="w-[3px] h-4 rounded-full" style={{ background: sage }} />
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
              Channel Performance
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {/* Donut chart */}
            <div className="flex items-center justify-center mb-5">
              <div className="relative">
                <div style={{
                  width: 115,
                  height: 115,
                  borderRadius: '50%',
                  background: `conic-gradient(${donutGrad})`,
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div className="absolute inset-[20px] rounded-full flex items-center justify-center" style={{
                  background: dark ? '#1A1816' : '#ffffff',
                  boxShadow: dark ? 'inset 0 0 12px rgba(0,0,0,0.4)' : 'inset 0 0 8px rgba(44,40,37,0.03)',
                }}>
                  <div className="text-center">
                    <div className="text-[15px] font-bold tabular-nums" style={{ color: ink }}>
                      5
                    </div>
                    <div className="text-[7px] font-bold uppercase tracking-widest" style={{ color: t3 }}>
                      sources
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Channel list */}
            <div className="space-y-3">
              {CHANNELS.map((ch, i) => (
                <div key={i} className="flex items-center gap-3 group/ch">
                  <div className="w-[6px] h-[6px] rounded-full flex-shrink-0 transition-transform group-hover/ch:scale-150" style={{ background: ch.color }} />
                  <span className="text-[11px] font-medium flex-1 min-w-0" style={{ color: t2 }}>{ch.name}</span>
                  <div className="flex-1 max-w-[90px] h-[5px] rounded-full overflow-hidden" style={{
                    background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                  }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                      width: `${ch.pct}%`,
                      background: ch.color,
                    }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: ink }}>
                    {ch.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ACTIVITY + ACTIONS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Operations Feed — 3 cols */}
        <div className="lg:col-span-3 cc-panel overflow-hidden" style={card(280)}>
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5" style={{ borderBottom: `1px solid ${brd}` }}>
            <div className="w-[6px] h-[6px] rounded-full" style={{ background: sage }} />
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
              Operations Feed
            </span>
            <div className="flex-1" />
            <span className="text-[10px] font-medium" style={{ color: sage }}>Live</span>
          </div>

          <div className="relative">
            <div className="absolute left-[20px] sm:left-[28px] top-0 bottom-0 w-px" style={{ background: brd }} />

            {FEED.map((item, i) => (
              <div key={i}
                className="flex items-start gap-2.5 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 relative transition-colors cursor-default"
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.015)' : 'rgba(44,40,37,0.015)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="relative z-10 w-[10px] h-[10px] rounded-full border-2 mt-1 flex-shrink-0" style={{
                  borderColor: item.color,
                  background: dark ? '#1A1816' : '#ffffff',
                }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{
                      background: dark ? `${item.color}12` : `${item.color}0c`,
                      color: item.color,
                    }}>{item.module}</span>
                    <span className="text-[12px] font-semibold" style={{ color: ink }}>{item.action}</span>
                    <span className="text-[10px] ml-auto tabular-nums flex-shrink-0 font-medium" style={{
                      color: t3,
                    }}>{item.time} ago</span>
                  </div>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: t3 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Actions — 2 cols */}
        <div className="lg:col-span-2 cc-panel overflow-hidden" style={card(320)}>
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5" style={{ borderBottom: `1px solid ${brd}` }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke={terra} viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
              Needs Attention
            </span>
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full ml-auto tabular-nums" style={{
              background: dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.08)',
              color: terra,
            }}>
              {ACTIONS.filter(a => a.priority === 'high').length} urgent
            </span>
          </div>

          <div className="p-1.5">
            {ACTIONS.map(item => (
              <button key={item.id} onClick={() => nav(item.path)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all group/act"
                onMouseEnter={e => e.currentTarget.style.background = dark ? `${item.color}08` : `${item.color}05`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="w-[3px] self-stretch rounded-full flex-shrink-0 transition-opacity" style={{
                  background: item.color,
                  opacity: item.priority === 'high' ? 1 : item.priority === 'medium' ? 0.5 : 0.2,
                }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold" style={{ color: ink }}>{item.title}</span>
                    {item.priority === 'high' && (
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider" style={{
                        background: dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.07)',
                        color: terra,
                      }}>urgent</span>
                    )}
                    {item.priority === 'medium' && (
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider" style={{
                        background: dark ? 'rgba(212,145,92,0.12)' : 'rgba(212,145,92,0.07)',
                        color: '#D4915C',
                      }}>medium</span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: t3 }}>{item.desc}</p>
                </div>

                <svg className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/act:opacity-50 transition-opacity" fill="none" stroke={t3} viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="cc-panel overflow-hidden" style={card(360)}>
        <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5" style={{ borderBottom: `1px solid ${brd}` }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke={terra} viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>
            Quick Actions
          </span>
        </div>
        <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {QUICK.map((q, i) => (
            <button key={i} onClick={() => nav(q.path)}
              className="group/q flex flex-col items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-4 sm:py-5 rounded-2xl transition-all duration-300 cursor-pointer"
              style={{
                background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(44,40,37,0.02)',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.05)'}`,
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

    </div>
  );
}

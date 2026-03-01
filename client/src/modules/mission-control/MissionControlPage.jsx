import { useState, useEffect, useCallback, useRef } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../context/ThemeContext';
import { fetchJSON } from '../../lib/api';

/* ═══════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════ */
const TERRA = '#C45D3E';
const SAGE = '#5E8E6E';
const INK_LIGHT = '#332F2B';
const INK_DARK = '#F5EDE6';
const MUTED = '#94908A';
const SAND = '#EDE5DA';

/* ═══════════════════════════════════════════
   MINI SPARKLINE COMPONENT (SVG)
   ═══════════════════════════════════════════ */
function Sparkline({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.length > 0 && (() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return <circle cx={lastX} cy={lastY} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
function AnimatedNumber({ value, prefix = '', duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const start = ref.current || 0;
    const diff = value - start;
    if (diff === 0) { setDisplay(value); return; }
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    }
    requestAnimationFrame(tick);
    return () => { ref.current = value; };
  }, [value, duration]);

  return <>{prefix}{display.toLocaleString()}</>;
}

/* ═══════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════ */
function KpiCard({ label, value, prefix = '', trend, weekDelta, spark, color, dark }) {
  const bg = dark ? 'rgba(255,255,255,0.03)' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const trendUp = trend > 0;
  const trendColor = trendUp ? SAGE : trend < 0 ? TERRA : MUTED;

  return (
    <div className="rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
      style={{ background: bg, border: `1px solid ${border}`, boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color, opacity: 0.6 }} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[28px] font-bold leading-none mb-1" style={{ color: dark ? INK_DARK : INK_LIGHT, fontFamily: "'Fraunces', serif" }}>
            <AnimatedNumber value={value} prefix={prefix} />
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] font-semibold" style={{ color: trendColor }}>
                {trendUp ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
              </span>
              {weekDelta !== undefined && (
                <span className="text-[10px]" style={{ color: MUTED }}>
                  ({prefix}{weekDelta.toLocaleString()} this week)
                </span>
              )}
            </div>
          )}
        </div>
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MODULE USAGE BAR
   ═══════════════════════════════════════════ */
function ModuleBar({ name, count, pct, color, dark, maxPct }) {
  const barWidth = maxPct > 0 ? (pct / maxPct) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-[100px] text-[11px] font-medium truncate" style={{ color: dark ? INK_DARK : INK_LIGHT }}>{name}</div>
      <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barWidth}%`, background: color }} />
      </div>
      <div className="text-[10px] font-medium w-[40px] text-right" style={{ color: MUTED }}>{count}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN MISSION CONTROL PAGE
   ═══════════════════════════════════════════ */
export default function MissionControlPage() {
  usePageTitle('Mission Control');
  const { dark } = useTheme();

  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [activity, setActivity] = useState([]);
  const [modules, setModules] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const ink = dark ? INK_DARK : INK_LIGHT;
  const cardBg = dark ? 'rgba(255,255,255,0.03)' : '#fff';
  const cardBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const loadData = useCallback(async () => {
    try {
      const [ov, us, rv, ac, md, hl] = await Promise.all([
        fetchJSON('/api/mission-control/overview').catch(() => null),
        fetchJSON('/api/mission-control/users').catch(() => []),
        fetchJSON('/api/mission-control/revenue').catch(() => null),
        fetchJSON('/api/mission-control/activity').catch(() => []),
        fetchJSON('/api/mission-control/modules').catch(() => []),
        fetchJSON('/api/mission-control/health').catch(() => null),
      ]);
      if (ov) setOverview(ov);
      setUsers(us || []);
      if (rv) setRevenue(rv);
      setActivity(ac || []);
      setModules(md || []);
      if (hl) setHealth(hl);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Mission Control load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: TERRA, animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: SAGE, animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: TERRA, animationDelay: '300ms' }} />
      </div>
    );
  }

  const maxModulePct = modules.length > 0 ? Math.max(...modules.map(m => m.pct)) : 1;

  return (
    <div className="h-full overflow-y-auto" style={{ background: dark ? '#1a1816' : '#FAF8F5' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>
              Mission Control
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
              Platform-wide monitoring & metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[10px]" style={{ color: MUTED }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: SAGE }} />
              <span className="text-[10px] font-semibold" style={{ color: SAGE }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ─── KPI ROW ─── */}
        {overview?.kpi && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {overview.kpi.map(k => (
              <KpiCard key={k.label} {...k} dark={dark} />
            ))}
          </div>
        )}

        {/* ─── MIDDLE ROW: Revenue + Activity Feed ─── */}
        <div className="grid grid-cols-5 gap-4 mb-6">

          {/* Revenue & Orders — 3 cols */}
          <div className="col-span-3 rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>Revenue & Orders</h2>
              {revenue && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px]" style={{ color: MUTED }}>Total Revenue</div>
                    <div className="text-[16px] font-bold" style={{ color: SAGE, fontFamily: "'Fraunces', serif" }}>${revenue.totalRevenue?.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px]" style={{ color: MUTED }}>Avg Order</div>
                    <div className="text-[16px] font-bold" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>${revenue.avgOrderValue?.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Revenue Chart (simple bar chart) */}
            {revenue?.daily?.length > 0 ? (
              <div className="flex items-end gap-1 h-[120px] mt-2">
                {(() => {
                  const maxRev = Math.max(...revenue.daily.map(d => d.revenue), 1);
                  return revenue.daily.map((d, i) => {
                    const h = Math.max((d.revenue / maxRev) * 100, 2);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
                          style={{ height: `${h}%`, background: `linear-gradient(to top, ${SAGE}, ${SAGE}dd)`, minHeight: 2 }} />
                        <span className="text-[8px]" style={{ color: MUTED }}>{d.day?.slice(5)}</span>
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                          style={{ background: dark ? '#2a2623' : INK_LIGHT, color: '#fff' }}>
                          ${d.revenue?.toLocaleString()} · {d.orders} orders
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-[12px]" style={{ color: MUTED }}>
                No revenue data yet
              </div>
            )}

            {/* Deal Pipeline */}
            {revenue && revenue.dealPipeline > 0 && (
              <div className="mt-4 pt-3 flex items-center gap-6" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <div>
                  <div className="text-[10px]" style={{ color: MUTED }}>Deal Pipeline</div>
                  <div className="text-[14px] font-bold" style={{ color: TERRA }}>${revenue.dealPipeline?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px]" style={{ color: MUTED }}>Active Deals</div>
                  <div className="text-[14px] font-bold" style={{ color: ink }}>{revenue.dealCount}</div>
                </div>
              </div>
            )}
          </div>

          {/* Live Activity Feed — 2 cols */}
          <div className="col-span-2 rounded-2xl p-5 flex flex-col" style={{ background: cardBg, border: `1px solid ${cardBorder}`, maxHeight: 340 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>Live Activity</h2>
              <span className="text-[10px]" style={{ color: MUTED }}>{activity.length} events</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 mc-scroll">
              {activity.length > 0 ? activity.slice(0, 30).map(a => (
                <div key={a.id} className="flex items-start gap-2.5 py-1.5 rounded-lg px-2 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <div className="w-[6px] h-[6px] rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: a.color + '18', color: a.color }}>{a.module}</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>{a.time}</span>
                    </div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: ink }}>{a.action}</div>
                  </div>
                </div>
              )) : (
                <div className="text-[12px] text-center py-8" style={{ color: MUTED }}>No activity yet</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── BOTTOM ROW: Module Usage + Users + System Health ─── */}
        <div className="grid grid-cols-5 gap-4 mb-6">

          {/* Module Usage — 2 cols */}
          <div className="col-span-2 rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <h2 className="text-[14px] font-bold mb-4" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>Module Usage</h2>
            {modules.length > 0 ? (
              <div className="space-y-0.5">
                {modules.slice(0, 12).map(m => (
                  <ModuleBar key={m.id} {...m} dark={dark} maxPct={maxModulePct} />
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-center py-8" style={{ color: MUTED }}>No module usage data</div>
            )}
          </div>

          {/* System Health — 3 cols */}
          <div className="col-span-3 rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <h2 className="text-[14px] font-bold mb-4" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>System Health</h2>
            {health ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Workspaces', value: health.workspaces, color: SAGE },
                  { label: 'Orders', value: health.orders, color: TERRA },
                  { label: 'CRM Contacts', value: health.contacts, color: '#8B7355' },
                  { label: 'Content Pieces', value: health.content, color: '#D4915C' },
                  { label: 'Ad Campaigns', value: health.campaigns, color: SAGE },
                  { label: 'Email Campaigns', value: health.emailCampaigns, color: TERRA },
                  { label: 'Subscribers', value: health.subscribers, color: '#8B7355' },
                  { label: 'Social Posts', value: health.socialPosts, color: '#D4915C' },
                  { label: 'Products', value: health.products, color: SAGE },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-3" style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                    <div className="text-[10px] mb-1" style={{ color: MUTED }}>{item.label}</div>
                    <div className="text-[18px] font-bold" style={{ color: item.color, fontFamily: "'Fraunces', serif" }}>
                      <AnimatedNumber value={item.value || 0} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-center py-8" style={{ color: MUTED }}>Loading health data...</div>
            )}
          </div>
        </div>

        {/* ─── USERS TABLE ─── */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>Registered Users</h2>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.08)', color: SAGE }}>
              {users.length} total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}` }}>
                  {['User', 'Email', 'Role', 'Workspaces', 'Last Active', 'Joined'].map(h => (
                    <th key={h} className="text-[10px] font-semibold uppercase tracking-wider pb-2.5 px-2" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map(u => (
                  <tr key={u.id} className="transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]" style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` }}>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: SAGE }}>
                          {(u.display_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: ink }}>{u.display_name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-[11px]" style={{ color: MUTED }}>{u.email}</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: u.role === 'owner' ? 'rgba(196,93,62,0.1)' : 'rgba(94,142,110,0.1)', color: u.role === 'owner' ? TERRA : SAGE }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-[12px] font-medium" style={{ color: ink }}>{u.workspace_count || 0}</td>
                    <td className="py-2.5 px-2 text-[11px]" style={{ color: MUTED }}>
                      {u.last_activity ? new Date(u.last_activity + 'Z').toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-[11px]" style={{ color: MUTED }}>
                      {u.created_at ? new Date(u.created_at + 'Z').toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[12px]" style={{ color: MUTED }}>No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── ACTIVITY TOTALS BAR ─── */}
        {overview?.totals && (
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[10px]" style={{ color: MUTED }}>Total Platform Activities</div>
                <div className="text-[16px] font-bold" style={{ color: ink, fontFamily: "'Fraunces', serif" }}>
                  <AnimatedNumber value={overview.totals.totalActivities} />
                </div>
              </div>
              <div className="w-px h-8" style={{ background: cardBorder }} />
              <div>
                <div className="text-[10px]" style={{ color: MUTED }}>This Week</div>
                <div className="text-[16px] font-bold" style={{ color: SAGE, fontFamily: "'Fraunces', serif" }}>
                  <AnimatedNumber value={overview.totals.weekActivities} />
                </div>
              </div>
              <div className="w-px h-8" style={{ background: cardBorder }} />
              <div>
                <div className="text-[10px]" style={{ color: MUTED }}>Workspaces</div>
                <div className="text-[16px] font-bold" style={{ color: TERRA, fontFamily: "'Fraunces', serif" }}>
                  <AnimatedNumber value={overview.totals.totalWorkspaces} />
                </div>
              </div>
            </div>
            <div className="text-[10px]" style={{ color: MUTED }}>
              Auto-refreshing every 15s
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

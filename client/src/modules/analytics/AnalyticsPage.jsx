import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { MODULE_REGISTRY, CATEGORIES } from '../../config/modules';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const API_BASE = import.meta.env.VITE_API_URL || '';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

export default function AnalyticsPage() {
  usePageTitle('Analytics');
  const { dark } = useTheme();
  const [activity, setActivity] = useState([]);
  const [overview, setOverview] = useState({ total: 0, modules: [] });
  const [timeRange, setTimeRange] = useState('7d');
  const [expandedCat, setExpandedCat] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics/overview`).then(r => r.json()).then(setOverview).catch(() => {});
    fetch(`${API_BASE}/api/analytics/activity?limit=50`).then(r => r.json()).then(setActivity).catch(() => {});
  }, []);

  const moduleStats = MODULE_REGISTRY.filter(m => m.id !== 'analytics').map(mod => {
    const stat = overview.modules?.find(s => s.module_id === mod.id);
    return { ...mod, count: stat?.count || 0 };
  });

  const totalActions = overview.total || 0;
  const topModules = [...moduleStats].sort((a, b) => b.count - a.count).slice(0, 5);
  const activeModules = moduleStats.filter(m => m.count > 0).length;

  // Group by category
  const categoryStats = CATEGORIES.filter(c => c.id !== 'settings').map(cat => {
    const mods = moduleStats.filter(m => m.category === cat.id);
    const total = mods.reduce((sum, m) => sum + m.count, 0);
    return { ...cat, modules: mods, total };
  });

  const card = dark ? 'bg-white/[0.02] border border-white/[0.06]' : 'bg-white border border-[#e8e0d4]';
  const cardShadow = dark ? 'none' : '0 2px 20px -4px rgba(0,0,0,0.04)';
  const muted = dark ? 'text-gray-500' : 'text-[#94908A]';
  const ink = dark ? 'text-white' : 'text-[#332F2B]';
  const subtle = dark ? 'text-gray-600' : 'text-[#b5b0a8]';
  const panelBg = dark ? 'bg-white/[0.01]' : 'bg-[#FAF7F2]';

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 ${dark ? 'text-[#C45D3E]/70' : 'text-[#C45D3E]'}`}>Analytics</p>
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${ink}`} style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                System Overview
              </h1>
              <p className={`text-sm mt-1 ${muted}`}>Activity and usage across all modules</p>
            </div>
            <div className={`flex rounded-lg p-0.5 ${dark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
              {['24h', '7d', '30d', 'All'].map(r => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                    timeRange === r
                      ? dark ? 'bg-[#C45D3E]/15 text-[#C45D3E]' : 'bg-white text-[#C45D3E] shadow-sm'
                      : dark ? 'text-gray-500 hover:text-gray-300' : 'text-[#94908A] hover:text-[#332F2B]'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            {
              label: 'Total Actions',
              value: <AnimatedNumber value={totalActions} />,
              sub: timeRange === 'All' ? 'all time' : `last ${timeRange}`,
              accent: '#C45D3E',
              icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
            },
            {
              label: 'Modules',
              value: MODULE_REGISTRY.length - 1,
              sub: `${activeModules} with activity`,
              accent: '#5E8E6E',
              icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
            },
            {
              label: 'Most Active',
              value: topModules[0]?.name || '—',
              sub: topModules[0]?.count ? `${topModules[0].count} actions` : 'no activity yet',
              accent: topModules[0]?.color || '#94908A',
              icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0',
              isText: true,
            },
            {
              label: 'Events Logged',
              value: <AnimatedNumber value={activity.length} />,
              sub: 'in activity feed',
              accent: '#8b5cf6',
              icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
            },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl p-4 sm:p-5 ${card} relative overflow-hidden`} style={{ boxShadow: cardShadow }}>
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5 opacity-[0.12]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: kpi.accent }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
                </svg>
              </div>
              <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 ${muted}`}>{kpi.label}</p>
              <p className={`${kpi.isText ? 'text-lg' : 'text-2xl sm:text-3xl'} font-bold tabular-nums truncate ${ink}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {kpi.value}
              </p>
              <p className={`text-[11px] mt-1 ${subtle}`}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Two Column: Category Breakdown + Top Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">

          {/* Category Breakdown */}
          <div className={`lg:col-span-3 rounded-2xl p-5 sm:p-6 ${card}`} style={{ boxShadow: cardShadow }}>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-5 ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Usage by Category</p>

            <div className="space-y-3">
              {categoryStats.map(cat => {
                const pct = totalActions > 0 ? (cat.total / totalActions) * 100 : 0;
                const isExpanded = expandedCat === cat.id;
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      className={`w-full rounded-xl p-3.5 transition-all text-left ${
                        dark ? 'hover:bg-white/[0.02]' : 'hover:bg-[#FAF7F2]'
                      } ${isExpanded ? (dark ? 'bg-white/[0.02]' : 'bg-[#FAF7F2]') : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}15` }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: cat.color }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                            </svg>
                          </div>
                          <span className={`text-sm font-semibold ${ink}`}>{cat.label}</span>
                          <span className={`text-[10px] ${subtle}`}>{cat.modules.length} modules</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold tabular-nums ${ink}`}>{cat.total}</span>
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/[0.04]' : 'bg-[#EDE5DA]'}`}>
                        <div className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(pct, totalActions === 0 ? 100 / categoryStats.length : 1)}%`, background: cat.color, opacity: totalActions === 0 ? 0.2 : 1 }} />
                      </div>
                    </button>

                    {/* Expanded module list */}
                    {isExpanded && (
                      <div className={`mt-1 ml-4 mr-2 rounded-xl overflow-hidden ${dark ? 'border border-white/[0.04]' : 'border border-[#e8e0d4]/60'}`}>
                        {cat.modules.map((mod, mi) => {
                          const modPct = totalActions > 0 ? (mod.count / totalActions) * 100 : 0;
                          return (
                            <div key={mod.id} className={`flex items-center gap-3 px-4 py-2.5 ${mi > 0 ? (dark ? 'border-t border-white/[0.03]' : 'border-t border-[#e8e0d4]/40') : ''}`}>
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: mod.color }} />
                              <span className={`text-xs flex-1 ${dark ? 'text-gray-400' : 'text-[#332F2B]/70'}`}>{mod.name}</span>
                              <span className={`text-[10px] tabular-nums ${subtle}`}>{Math.round(modPct)}%</span>
                              <span className={`text-xs font-semibold tabular-nums min-w-[2rem] text-right ${ink}`}>{mod.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Modules Leaderboard */}
          <div className={`lg:col-span-2 rounded-2xl p-5 sm:p-6 ${card}`} style={{ boxShadow: cardShadow }}>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-5 ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Top Modules</p>

            {totalActions > 0 ? (
              <div className="space-y-4">
                {topModules.map((mod, i) => {
                  const pct = totalActions > 0 ? (mod.count / topModules[0].count) * 100 : 0;
                  return (
                    <div key={mod.id} className="flex items-center gap-3">
                      <span className={`text-lg font-bold tabular-nums w-6 text-center ${i === 0 ? 'text-[#C45D3E]' : subtle}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium truncate ${ink}`}>{mod.name}</span>
                          <span className={`text-xs font-bold tabular-nums ml-2 ${ink}`}>{mod.count}</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-white/[0.04]' : 'bg-[#EDE5DA]'}`}>
                          <div className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%`, background: mod.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dark ? 'bg-white/[0.03]' : 'bg-[#F5F0E8]'}`}>
                  <svg className={`w-6 h-6 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
                  </svg>
                </div>
                <p className={`text-xs font-medium ${muted}`}>No activity yet</p>
                <p className={`text-[11px] mt-0.5 ${subtle}`}>Use modules to see rankings</p>
              </div>
            )}

            {/* Module count by category - mini summary */}
            <div className={`mt-6 pt-5 ${dark ? 'border-t border-white/[0.06]' : 'border-t border-[#e8e0d4]'}`}>
              <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold mb-3 ${muted}`}>Module Spread</p>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.filter(c => c.id !== 'settings').map(cat => {
                  const count = MODULE_REGISTRY.filter(m => m.category === cat.id && m.id !== 'analytics').length;
                  return (
                    <div key={cat.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                      dark ? 'bg-white/[0.03] text-gray-400' : 'bg-[#F5F0E8] text-[#332F2B]/60'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                      {count}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className={`rounded-2xl ${card}`} style={{ boxShadow: cardShadow }}>
          <div className={`flex items-center justify-between px-5 sm:px-6 py-4 ${dark ? 'border-b border-white/[0.06]' : 'border-b border-[#e8e0d4]'}`}>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-semibold ${dark ? 'text-[#C45D3E]/60' : 'text-[#C45D3E]'}`}>Recent Activity</p>
            <span className={`text-[10px] font-medium ${subtle}`}>{activity.length} events</span>
          </div>

          {activity.length === 0 ? (
            <div className="py-16 text-center">
              <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dark ? 'bg-white/[0.03]' : 'bg-[#F5F0E8]'}`}>
                <svg className={`w-7 h-7 ${dark ? 'text-gray-700' : 'text-[#d5cdc2]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`text-sm font-medium ${muted}`}>No activity recorded yet</p>
              <p className={`text-[11px] mt-1 ${subtle}`}>Start using modules to see your activity here</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(232,224,212,0.5)' }}>
              {activity.slice(0, 15).map((item, i) => {
                const mod = MODULE_REGISTRY.find(m => m.id === item.module_id);
                return (
                  <div key={item.id || i} className={`flex items-center gap-3 px-5 sm:px-6 py-3.5 transition-colors ${dark ? 'hover:bg-white/[0.01]' : 'hover:bg-[#FAF7F2]/60'}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${mod?.color || '#94908A'}12` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: mod?.color || '#94908A' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${ink}`}>{item.title}</p>
                      <p className={`text-[10px] ${subtle}`}>{mod?.name || item.module_id}</p>
                    </div>
                    <span className={`text-[10px] tabular-nums flex-shrink-0 ${subtle}`}>
                      {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              {activity.length > 15 && (
                <div className="py-3 text-center">
                  <span className={`text-[11px] font-medium ${muted}`}>+{activity.length - 15} more events</span>
                </div>
              )}
            </div>
          )}
        </div>

        <AIInsightsPanel moduleId="analytics" />
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { MODULE_REGISTRY } from '../../config/modules';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1200;
    const start = Date.now();
    const startVal = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display}</span>;
}

function MiniBarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[3px] h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-500" title={`${d.label}: ${d.value}`}
          style={{ height: `${(d.value / max) * 100}%`, background: `${color}60`, minHeight: '2px' }} />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [activity, setActivity] = useState([]);
  const [overview, setOverview] = useState({ total: 0, modules: [] });
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetch('/api/analytics/overview').then(r => r.json()).then(setOverview).catch(() => {});
    fetch('/api/analytics/activity?limit=50').then(r => r.json()).then(setActivity).catch(() => {});
  }, []);

  const moduleStats = MODULE_REGISTRY.filter(m => m.id !== 'analytics').map(mod => {
    const stat = overview.modules?.find(s => s.module_id === mod.id);
    return { ...mod, count: stat?.count || 0 };
  });

  const totalActions = overview.total || 0;
  const topModule = moduleStats.reduce((a, b) => a.count > b.count ? a : b, moduleStats[0] || { name: 'None', count: 0 });

  // Mock sparkline data for each module
  const mockSparkline = (count) => {
    return Array.from({ length: 7 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.max(0, Math.round(count / 7 + (Math.random() - 0.5) * count / 4)),
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <div className="flex items-end justify-between">
          <div>
            <p className="hud-label text-[11px] mb-2" style={{ color: '#f43f5e' }}>ANALYTICS DASHBOARD</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">System Overview</h1>
            <p className="text-base text-gray-500">Unified reporting across all modules</p>
          </div>
          <div className="flex gap-1">
            {['24h', '7d', '30d', 'All'].map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`chip text-[10px] ${timeRange === r ? 'active' : ''}`}
                style={timeRange === r ? { background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', color: '#fb7185' } : {}}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        <div className="panel rounded-2xl p-4 sm:p-6 relative">
          <p className="hud-label text-[11px] mb-2">TOTAL ACTIONS</p>
          <p className="text-3xl font-bold text-white font-mono tabular-nums">
            <AnimatedNumber value={totalActions} />
          </p>
          <div className="absolute top-6 right-6">
            <svg className="w-6 h-6 text-rose-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
        </div>

        <div className="panel rounded-2xl p-4 sm:p-6 relative">
          <p className="hud-label text-[11px] mb-2">ACTIVE MODULES</p>
          <p className="text-3xl font-bold text-white font-mono tabular-nums">
            <AnimatedNumber value={MODULE_REGISTRY.length} />
          </p>
          <div className="flex gap-1 mt-2">
            {MODULE_REGISTRY.map(m => (
              <div key={m.id} className="w-2 h-2 rounded-full" style={{ background: m.color }} />
            ))}
          </div>
        </div>

        <div className="panel rounded-2xl p-4 sm:p-6 relative">
          <p className="hud-label text-[11px] mb-2">TOP MODULE</p>
          <p className="text-lg font-bold text-white truncate">{topModule?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{topModule?.count} actions</p>
          <div className="absolute top-6 right-6 w-2 h-2 rounded-full" style={{ background: topModule?.color, boxShadow: `0 0 8px ${topModule?.color}` }} />
        </div>

        <div className="panel rounded-2xl p-4 sm:p-6 relative">
          <p className="hud-label text-[11px] mb-2">ACTIVITY FEED</p>
          <p className="text-3xl font-bold text-white font-mono tabular-nums">
            <AnimatedNumber value={activity.length} />
          </p>
          <p className="text-xs text-gray-500 mt-0.5">events logged</p>
        </div>
      </div>

      {/* Module Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Usage Bars */}
        <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <p className="hud-label text-[11px]">MODULE USAGE</p>
            <p className="hud-label text-[11px]">{totalActions} TOTAL</p>
          </div>
          <div className="space-y-4">
            {moduleStats.map(mod => {
              const pct = totalActions > 0 ? (mod.count / totalActions) * 100 : 0;
              return (
                <div key={mod.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color }} />
                      <span className="text-xs text-gray-400">{mod.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono">{Math.round(pct)}%</span>
                      <span className="text-xs text-white font-mono font-bold">{mod.count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.max(pct, 1)}%`, background: mod.color, boxShadow: `0 0 8px ${mod.color}40` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module Cards with Sparklines */}
        <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
          <p className="hud-label text-[11px] mb-4">7-DAY TREND</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {moduleStats.map(mod => (
              <div key={mod.id} className="bg-black/30 rounded-lg p-3 sm:p-5 border border-indigo-500/6">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color }} />
                  <span className="text-[10px] font-semibold text-gray-400">{mod.name}</span>
                </div>
                <MiniBarChart data={mockSparkline(mod.count)} color={mod.color} />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-gray-600">7d ago</span>
                  <span className="text-[10px] text-gray-600">Today</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="panel rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-up">
        <p className="hud-label text-[11px] mb-4">SYSTEM STATUS</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-5">
          {MODULE_REGISTRY.map(mod => (
            <div key={mod.id} className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-black/30 border border-indigo-500/6">
              <div className="relative">
                <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: '#4ade80', opacity: 0.3 }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-300">{mod.name}</p>
                <p className="text-[10px] text-emerald-400">OPERATIONAL</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <p className="hud-label text-[11px]">ACTIVITY LOG</p>
          <p className="hud-label text-[11px]">{activity.length} EVENTS</p>
        </div>
        {activity.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-600">No activity recorded yet</p>
            <p className="text-xs text-gray-700 mt-1">Start using modules to see data here</p>
          </div>
        ) : (
          <div className="divide-y divide-indigo-500/[0.04]">
            {activity.slice(0, 20).map((item, i) => {
              const mod = MODULE_REGISTRY.find(m => m.id === item.module_id);
              return (
                <div key={item.id || i} className="flex items-center gap-3 sm:gap-5 px-3 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: mod?.color || '#6b7280' }} />
                  <span className="text-xs text-gray-400 flex-1 truncate">{item.title}</span>
                  <span className="hud-label flex-shrink-0" style={{ color: mod?.color }}>{mod?.name || item.module_id}</span>
                  <span className="text-[9px] text-gray-700 font-mono flex-shrink-0">
                    {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            {activity.length > 20 && (
              <div className="py-3 text-center">
                <span className="text-xs text-gray-600">+{activity.length - 20} more events</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

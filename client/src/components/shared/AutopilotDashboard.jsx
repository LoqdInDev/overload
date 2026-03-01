import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchJSON } from '../../lib/api';

export default function AutopilotDashboard({ moduleId }) {
  const { dark } = useTheme();
  const [stats, setStats] = useState({ today: 0, completed: 0, failed: 0, successRate: 100 });
  const [actions, setActions] = useState([]);
  const [rules, setRules] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsData, actionsData, rulesData] = await Promise.allSettled([
        fetchJSON(`/api/automation/actions/stats/${moduleId}`),
        fetchJSON(`/api/automation/actions?module=${moduleId}&limit=5`),
        fetchJSON(`/api/automation/rules?module=${moduleId}`),
      ]);
      if (statsData.status === 'fulfilled' && statsData.value.today != null) setStats(statsData.value);
      if (actionsData.status === 'fulfilled') setActions((actionsData.value || []).slice(0, 5));
      if (rulesData.status === 'fulfilled') setRules((rulesData.value || []).filter(r => r.status === 'active'));
    } catch { /* use defaults */ }
    setLoading(false);
  }, [moduleId]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const green = '#22c55e';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';

  if (loading) {
    return (
      <div className="h-10 rounded-xl mb-4 animate-pulse"
        style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${cardBorder}` }} />
    );
  }

  return (
    <div className="rounded-xl mb-5 overflow-hidden transition-all"
      style={{
        background: dark ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)',
        border: `1px solid ${dark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)'}`,
      }}>
      {/* Compact summary bar */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
          background: green,
          boxShadow: `0 0 6px ${green}80`,
          animation: 'auto-breathe 3s ease-in-out infinite',
        }} />
        <span className="text-[11px] font-semibold flex-1" style={{ color: green }}>
          {stats.today} action{stats.today !== 1 ? 's' : ''} today
          <span style={{ color: textSecondary }}> · </span>
          {stats.successRate}% success
          {rules.length > 0 && (
            <>
              <span style={{ color: textSecondary }}> · </span>
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </>
          )}
        </span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke={textSecondary} strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expandable detail panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${dark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)'}` }}>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-3">
            {[
              { label: 'Today', value: stats.today, sub: 'actions' },
              { label: 'Success', value: `${stats.successRate}%`, sub: `${stats.completed} ok, ${stats.failed} fail` },
              { label: 'Rules', value: rules.length, sub: 'active' },
            ].map(s => (
              <div key={s.label} className="rounded-lg px-3 py-2" style={{ background: dark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)' }}>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: green }}>{s.label}</div>
                <div className="text-lg font-bold" style={{ color: textPrimary }}>{s.value}</div>
                <div className="text-[9px]" style={{ color: textSecondary }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Recent actions */}
          {actions.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: textSecondary }}>Recent</div>
              <div className="space-y-1">
                {actions.map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{
                      background: a.status === 'completed' ? '#22c55e' : a.status === 'failed' ? '#ef4444' : '#D4A017',
                    }} />
                    <span className="text-[11px] flex-1 truncate" style={{ color: textPrimary }}>{a.description}</span>
                    <span className="text-[9px] flex-shrink-0" style={{ color: textSecondary }}>{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active rules */}
          {rules.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: textSecondary }}>Rules</div>
              <div className="flex flex-wrap gap-1.5">
                {rules.map(r => (
                  <span key={r.id} className="text-[10px] font-medium px-2 py-1 rounded-md" style={{
                    background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    color: textPrimary,
                  }}>
                    {r.name}
                    <span className="ml-1" style={{ color: textSecondary }}>({r.run_count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

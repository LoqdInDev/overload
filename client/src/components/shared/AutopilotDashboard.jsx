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

  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';

  if (loading) {
    return (
      <div className="h-11 rounded-xl mb-4 animate-pulse"
        style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${cardBorder}` }} />
    );
  }

  return (
    <div className="rounded-xl mb-5 overflow-hidden transition-all"
      style={{
        background: dark
          ? 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(16,185,129,0.04) 50%, rgba(34,197,94,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(16,185,129,0.03) 50%, rgba(34,197,94,0.05) 100%)',
        border: `1px solid ${dark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)'}`,
        boxShadow: dark
          ? '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(34,197,94,0.06)'
          : '0 1px 3px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}>
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:brightness-105"
      >
        {/* Breathing indicator */}
        <span className="relative flex-shrink-0" style={{ width: 18, height: 18 }}>
          <span className="absolute inset-0 rounded-full" style={{
            background: 'rgba(34,197,94,0.15)',
            animation: 'auto-breathe 3s ease-in-out infinite',
          }} />
          <span className="absolute rounded-full" style={{
            top: 5, left: 5, width: 8, height: 8,
            background: '#22c55e',
            boxShadow: '0 0 8px rgba(34,197,94,0.6)',
          }} />
        </span>

        {/* Stat chips */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Actions today */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{
            background: dark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)',
            color: '#22c55e',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
            </svg>
            {stats.today} action{stats.today !== 1 ? 's' : ''} today
          </span>

          {/* Success rate */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{
            background: dark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)',
            color: stats.successRate >= 80 ? '#22c55e' : stats.successRate >= 50 ? '#D4A017' : '#ef4444',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {stats.successRate}% success
          </span>

          {/* Active rules */}
          {rules.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: textSecondary,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke={textSecondary} strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expandable detail panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${dark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)'}` }}>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-3">
            {[
              { label: 'Today', value: stats.today, sub: 'actions', icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              )},
              { label: 'Success', value: `${stats.successRate}%`, sub: `${stats.completed} ok, ${stats.failed} fail`, icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )},
              { label: 'Rules', value: rules.length, sub: 'active', icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              )},
            ].map(s => (
              <div key={s.label} className="rounded-lg px-3 py-2.5" style={{
                background: dark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)',
                border: `1px solid ${dark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)'}`,
              }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {s.icon}
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#22c55e' }}>{s.label}</span>
                </div>
                <div className="text-xl font-bold" style={{ color: textPrimary }}>{s.value}</div>
                <div className="text-[10px]" style={{ color: textSecondary }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Recent actions */}
          {actions.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: textSecondary }}>Recent Actions</div>
              <div className="space-y-1">
                {actions.map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{
                    background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                  }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                      background: a.status === 'completed' ? '#22c55e' : a.status === 'failed' ? '#ef4444' : '#D4A017',
                      boxShadow: `0 0 4px ${a.status === 'completed' ? 'rgba(34,197,94,0.4)' : a.status === 'failed' ? 'rgba(239,68,68,0.4)' : 'rgba(212,160,23,0.4)'}`,
                    }} />
                    <span className="text-[11px] flex-1 truncate font-medium" style={{ color: textPrimary }}>{a.description}</span>
                    <span className="text-[9px] flex-shrink-0 tabular-nums" style={{ color: textSecondary }}>{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active rules */}
          {rules.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: textSecondary }}>Active Rules</div>
              <div className="flex flex-wrap gap-1.5">
                {rules.map(r => (
                  <span key={r.id} className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full" style={{
                    background: dark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)',
                    border: `1px solid ${dark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)'}`,
                    color: textPrimary,
                  }}>
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                    {r.name}
                    <span style={{ color: textSecondary }}>({r.run_count})</span>
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

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAutomation } from '../../context/AutomationContext';
import { fetchJSON } from '../../lib/api';
import { MODULE_REGISTRY } from '../../config/modules';

export default function AutopilotDashboard({ moduleId, children }) {
  const { dark } = useTheme();
  const { setMode } = useAutomation();
  const [stats, setStats] = useState({ today: 0, completed: 0, failed: 0, successRate: 100 });
  const [actions, setActions] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);

  const mod = MODULE_REGISTRY.find(m => m.id === moduleId);

  const loadData = useCallback(async () => {
    try {
      const [statsData, actionsData, rulesData] = await Promise.allSettled([
        fetchJSON(`/api/automation/actions/stats/${moduleId}`),
        fetchJSON(`/api/automation/actions?module=${moduleId}&limit=10`),
        fetchJSON(`/api/automation/rules?module=${moduleId}`),
      ]);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (actionsData.status === 'fulfilled') setActions(actionsData.value || []);
      if (rulesData.status === 'fulfilled') setRules((rulesData.value || []).filter(r => r.status === 'active'));
    } catch { /* silent */ }
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
  const greenBg = dark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)';
  const greenBorder = dark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)';
  const cardBg = dark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} />)}
        </div>
        <div className="h-48 rounded-xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Switch to Manual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{
            background: green,
            boxShadow: `0 0 8px ${green}`,
            animation: 'auto-breathe 3s ease-in-out infinite',
          }} />
          <span className="text-xs font-semibold" style={{ color: green }}>Autopilot Active</span>
        </div>
        <button
          onClick={() => setMode(moduleId, 'manual')}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
          style={{
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            color: textSecondary,
            border: `1px solid ${cardBorder}`,
          }}
        >Switch to Manual</button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: greenBg, border: `1px solid ${greenBorder}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: green }}>Today</div>
          <div className="text-2xl font-bold" style={{ color: textPrimary }}>{stats.today}</div>
          <div className="text-[10px]" style={{ color: textSecondary }}>actions executed</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: greenBg, border: `1px solid ${greenBorder}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: green }}>Success Rate</div>
          <div className="text-2xl font-bold" style={{ color: textPrimary }}>{stats.successRate}%</div>
          <div className="text-[10px]" style={{ color: textSecondary }}>{stats.completed} completed, {stats.failed} failed</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: greenBg, border: `1px solid ${greenBorder}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: green }}>Active Rules</div>
          <div className="text-2xl font-bold" style={{ color: textPrimary }}>{rules.length}</div>
          <div className="text-[10px]" style={{ color: textSecondary }}>automation rules</div>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: green }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: green }}>Recent Actions</span>
        </div>
        <div className="divide-y" style={{ borderColor: cardBorder }}>
          {actions.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs" style={{ color: textSecondary }}>
              No actions yet — autopilot will begin executing based on your rules
            </div>
          ) : actions.map(action => (
            <div key={action.id} className="px-5 py-3 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                background: action.status === 'completed' ? '#22c55e' :
                            action.status === 'failed' ? '#ef4444' : '#D4A017',
              }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: textPrimary }}>{action.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px]" style={{ color: textSecondary }}>{timeAgo(action.created_at)}</span>
                  {action.duration_ms && (
                    <span className="text-[10px]" style={{ color: textSecondary }}>{(action.duration_ms / 1000).toFixed(1)}s</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{
                background: action.status === 'completed' ? 'rgba(34,197,94,0.1)' :
                            action.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(212,160,23,0.1)',
                color: action.status === 'completed' ? '#22c55e' :
                       action.status === 'failed' ? '#ef4444' : '#D4A017',
              }}>{action.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Rules */}
      {rules.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{
            borderBottom: `1px solid ${cardBorder}`,
          }}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: green }}>
              <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: green }}>Active Rules</span>
          </div>
          <div className="divide-y" style={{ borderColor: cardBorder }}>
            {rules.map(rule => (
              <div key={rule.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                  background: rule.trigger_type === 'schedule' ? 'rgba(59,130,246,0.1)' :
                              rule.trigger_type === 'event' ? 'rgba(139,92,246,0.1)' : 'rgba(245,158,11,0.1)',
                  color: rule.trigger_type === 'schedule' ? '#3b82f6' :
                         rule.trigger_type === 'event' ? '#8b5cf6' : '#f59e0b',
                }}>{rule.trigger_type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: textPrimary }}>{rule.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: textSecondary }}>
                    {rule.run_count} runs{rule.last_triggered ? ` · Last: ${timeAgo(rule.last_triggered)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Override */}
      <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full px-5 py-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: textSecondary }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Manual Override</span>
          </div>
          <svg className={`w-4 h-4 transition-transform ${showManual ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: textSecondary }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showManual && (
          <div className="px-5 pb-5" style={{ borderTop: `1px solid ${cardBorder}` }}>
            <div className="pt-4">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}

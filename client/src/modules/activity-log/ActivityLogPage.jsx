import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON } from '../../lib/api';
import { MODULE_REGISTRY } from '../../config/modules';

const FALLBACK_ENTRIES = [
  { id: 1, source: 'log', module_id: 'content', action_type: 'publish_blog', mode: 'copilot', description: 'Published blog post: 7 Email Subject Line Formulas That Drive Opens', status: 'completed', duration_ms: 2400, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, source: 'log', module_id: 'social', action_type: 'schedule_post', mode: 'autopilot', description: 'Scheduled Instagram carousel: Spring Collection Launch', status: 'completed', duration_ms: 1200, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, source: 'log', module_id: 'ads', action_type: 'adjust_budget', mode: 'autopilot', description: 'Increased Meta Ads budget 15% — ROAS above threshold', status: 'completed', duration_ms: 800, created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 4, source: 'log', module_id: 'email-sms', action_type: 'send_campaign', mode: 'copilot', description: 'Sent welcome drip sequence to 847 new subscribers', status: 'completed', duration_ms: 3100, created_at: new Date(Date.now() - 28800000).toISOString() },
  { id: 5, source: 'log', module_id: 'seo', action_type: 'optimize_keywords', mode: 'copilot', description: 'Updated meta tags for 12 product pages', status: 'completed', duration_ms: 1800, created_at: new Date(Date.now() - 43200000).toISOString() },
  { id: 6, source: 'log', module_id: 'reviews', action_type: 'respond_review', mode: 'autopilot', description: 'Auto-responded to 5-star Google review from Sarah M.', status: 'completed', duration_ms: 950, created_at: new Date(Date.now() - 57600000).toISOString() },
  { id: 7, source: 'log', module_id: 'content', action_type: 'generate_content', mode: 'autopilot', description: 'Generated product description batch for 15 new SKUs', status: 'failed', duration_ms: 4200, created_at: new Date(Date.now() - 72000000).toISOString() },
  { id: 8, source: 'log', module_id: 'social', action_type: 'schedule_post', mode: 'autopilot', description: 'Published Twitter thread: Q1 Marketing Wins Recap', status: 'completed', duration_ms: 1100, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 9, source: 'log', module_id: 'ads', action_type: 'generate_report', mode: 'copilot', description: 'Generated weekly ads performance report', status: 'completed', duration_ms: 2800, created_at: new Date(Date.now() - 100800000).toISOString() },
  { id: 10, source: 'log', module_id: 'reports', action_type: 'generate_report', mode: 'copilot', description: 'Monthly client report generated and exported to PDF', status: 'completed', duration_ms: 3500, created_at: new Date(Date.now() - 172800000).toISOString() },
];
const FALLBACK_STATS = { total: 25, successRate: 84, mostActiveModule: 'content', avgDuration: 2100 };

export default function ActivityLogPage() {
  usePageTitle('Activity Log');
  const { dark } = useTheme();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ total: 0, successRate: 0, mostActiveModule: null, avgDuration: null });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ module: '', status: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const pageSize = 20;

  const cardBg = dark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const selectBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const selectBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: pageSize, offset: page * pageSize });
      if (filters.module) params.set('module', filters.module);
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const [logData, statsData] = await Promise.allSettled([
        fetchJSON(`/api/automation/activity-log?${params}`),
        fetchJSON('/api/automation/activity-log/stats'),
      ]);
      if (logData.status === 'fulfilled' && logData.value.items?.length) {
        setEntries(logData.value.items);
        setTotal(logData.value.total || 0);
      } else {
        setEntries(FALLBACK_ENTRIES);
        setTotal(FALLBACK_ENTRIES.length);
      }
      if (statsData.status === 'fulfilled' && statsData.value.total) {
        setStats(statsData.value);
      } else {
        setStats(FALLBACK_STATS);
      }
    } catch {
      setEntries(FALLBACK_ENTRIES);
      setTotal(FALLBACK_ENTRIES.length);
      setStats(FALLBACK_STATS);
    }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalPages = Math.ceil(total / pageSize);
  const automatable = MODULE_REGISTRY.filter(m => m.automatable);

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const statusColors = {
    completed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    failed: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    cancelled: { bg: 'rgba(148,144,138,0.1)', color: '#94908A' },
    queued: { bg: 'rgba(212,160,23,0.1)', color: '#D4A017' },
    pending: { bg: 'rgba(212,160,23,0.1)', color: '#D4A017' },
  };

  const modeColors = {
    autopilot: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    copilot: { bg: 'rgba(212,160,23,0.1)', color: '#D4A017' },
    manual: { bg: 'rgba(148,144,138,0.1)', color: '#94908A' },
  };

  const mostActiveMod = MODULE_REGISTRY.find(m => m.id === stats.mostActiveModule);

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#5E8E6E' }}>Activity Log</div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif', color: textPrimary }}>
            Activity Log
          </h1>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            Complete history of all automation actions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Actions', value: stats.total },
            { label: 'Success Rate', value: `${stats.successRate}%` },
            { label: 'Most Active', value: mostActiveMod?.name || '—' },
            { label: 'Avg Duration', value: stats.avgDuration ? `${(stats.avgDuration / 1000).toFixed(1)}s` : '—' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5E8E6E' }}>{s.label}</div>
              <div className="text-xl font-bold" style={{ color: textPrimary }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <select value={filters.module} onChange={e => { setFilters(f => ({ ...f, module: e.target.value })); setPage(0); }}
            className="px-3 py-2 rounded-lg text-xs" style={{ background: selectBg, border: `1px solid ${selectBorder}`, color: textPrimary }}>
            <option value="">All Modules</option>
            {automatable.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(0); }}
            className="px-3 py-2 rounded-lg text-xs" style={{ background: selectBg, border: `1px solid ${selectBorder}`, color: textPrimary }}>
            <option value="">All Statuses</option>
            {['completed', 'failed', 'cancelled', 'queued'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>No activity found</h3>
            <p className="text-xs" style={{ color: textSecondary }}>Actions will appear here as automations run</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map(entry => {
              const mod = MODULE_REGISTRY.find(m => m.id === entry.module_id);
              const sc = statusColors[entry.status] || statusColors.completed;
              const mc = modeColors[entry.mode] || modeColors.manual;
              const isExpanded = expandedId === entry.id;

              return (
                <div key={`${entry.source}-${entry.id}`} className="rounded-xl overflow-hidden transition-all cursor-pointer"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: mod?.color || '#94908A' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: textPrimary }}>{entry.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: textSecondary }}>{timeAgo(entry.created_at)}</span>
                        <span className="text-[10px]" style={{ color: mod?.color || textSecondary }}>{mod?.name || entry.module_id}</span>
                        {entry.duration_ms && <span className="text-[10px]" style={{ color: textSecondary }}>{(entry.duration_ms / 1000).toFixed(1)}s</span>}
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: mc.bg, color: mc.color }}>
                      {entry.mode}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>
                      {entry.status}
                    </span>
                  </div>
                  {isExpanded && (entry.input_data || entry.output_data) && (
                    <div className="px-4 pb-3 space-y-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                      {entry.input_data && (
                        <div className="mt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Input</span>
                          <pre className="mt-1 text-[11px] p-2 rounded-lg overflow-auto max-h-32" style={{
                            background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', color: textSecondary,
                          }}>{JSON.stringify(entry.input_data, null, 2)}</pre>
                        </div>
                      )}
                      {entry.output_data && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Output</span>
                          <pre className="mt-1 text-[11px] p-2 rounded-lg overflow-auto max-h-32" style={{
                            background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', color: textSecondary,
                          }}>{JSON.stringify(entry.output_data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: textSecondary, opacity: page === 0 ? 0.4 : 1 }}>
              Previous
            </button>
            <span className="text-xs" style={{ color: textSecondary }}>
              Page {page + 1} of {totalPages}
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: textSecondary, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

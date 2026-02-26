import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../context/ThemeContext';
import { useAutomation } from '../../context/AutomationContext';
import { fetchJSON, postJSON } from '../../lib/api';
import { MODULE_REGISTRY } from '../../config/modules';

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getModuleInfo(moduleId) {
  const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
  return mod || { id: moduleId, name: moduleId, color: '#6b7280', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z' };
}

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    bg: '#6b7280', bgAlpha: 0.12, text: '#9ca3af', darkText: '#9ca3af', lightText: '#6b7280' },
  medium: { label: 'Medium', bg: '#3b82f6', bgAlpha: 0.12, text: '#60a5fa', darkText: '#60a5fa', lightText: '#2563eb' },
  high:   { label: 'High',   bg: '#f59e0b', bgAlpha: 0.12, text: '#fbbf24', darkText: '#fbbf24', lightText: '#d97706' },
  urgent: { label: 'Urgent', bg: '#ef4444', bgAlpha: 0.12, text: '#f87171', darkText: '#f87171', lightText: '#dc2626' },
};

const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];

/* ═══════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════ */

function SkeletonCard({ dark }) {
  const shimmer = dark ? 'bg-white/[0.04]' : 'bg-gray-200/60';
  return (
    <div
      className="rounded-2xl p-5 animate-pulse"
      style={{
        background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-lg ${shimmer}`} />
        <div className="flex-1 space-y-3">
          <div className={`h-4 rounded-md w-2/3 ${shimmer}`} />
          <div className={`h-3 rounded-md w-full ${shimmer}`} />
          <div className={`h-2 rounded-full w-1/3 ${shimmer}`} />
          <div className="flex gap-2 pt-2">
            <div className={`h-8 rounded-lg w-20 ${shimmer}`} />
            <div className={`h-8 rounded-lg w-28 ${shimmer}`} />
            <div className={`h-8 rounded-lg w-20 ${shimmer}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   APPROVAL CARD
   ═══════════════════════════════════════════ */

function ApprovalCard({ item, dark, selected, onToggleSelect, onApprove, onEditApprove, onReject, acting }) {
  const [expanded, setExpanded] = useState(false);
  const mod = getModuleInfo(item.moduleId);
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;

  return (
    <div
      className="rounded-2xl transition-all duration-200"
      style={{
        background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
        border: `1px solid ${selected
          ? (dark ? 'rgba(94,142,110,0.4)' : 'rgba(94,142,110,0.5)')
          : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)')}`,
        boxShadow: selected
          ? `0 0 0 1px ${dark ? 'rgba(94,142,110,0.2)' : 'rgba(94,142,110,0.15)'}`
          : 'none',
      }}
    >
      <div className="p-5">
        {/* Top row: checkbox + module badge + priority + time */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggleSelect(item.id)}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: selected
                ? '#5E8E6E'
                : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'),
              background: selected ? '#5E8E6E' : 'transparent',
            }}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>

          {/* Module badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: `${mod.color}18`, border: `1px solid ${mod.color}25` }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke={mod.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
              </svg>
            </div>
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: mod.color }}
            >
              {mod.name}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Priority pill */}
          <span
            className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{
              background: `${priority.bg}${Math.round(priority.bgAlpha * 255).toString(16).padStart(2, '0')}`,
              color: dark ? priority.darkText : priority.lightText,
              border: `1px solid ${priority.bg}30`,
            }}
          >
            {priority.label}
          </span>

          {/* Time */}
          <span className={`text-[11px] flex-shrink-0 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            {relativeTime(item.createdAt)}
          </span>
        </div>

        {/* Title + Description */}
        <div className="mt-3 ml-8">
          <h3 className={`text-sm font-bold leading-snug ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
            {item.title}
          </h3>
          <p className={`text-[13px] mt-1 leading-relaxed ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
            {item.description}
          </p>
        </div>

        {/* AI Confidence bar */}
        {typeof item.confidence === 'number' && (
          <div className="mt-3 ml-8">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                AI Confidence
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.confidence}%`,
                    background: item.confidence >= 80
                      ? '#5E8E6E'
                      : item.confidence >= 50
                        ? '#D4A017'
                        : '#C45D3E',
                  }}
                />
              </div>
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{
                  color: item.confidence >= 80
                    ? '#5E8E6E'
                    : item.confidence >= 50
                      ? '#D4A017'
                      : '#C45D3E',
                }}
              >
                {item.confidence}%
              </span>
            </div>
          </div>
        )}

        {/* Preview toggle + Action buttons */}
        <div className="mt-4 ml-8 flex flex-wrap items-center gap-2">
          {/* Preview button */}
          {item.payload && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                color: dark ? '#9ca3af' : '#6b7280',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <span className="flex items-center gap-1.5">
                <svg
                  className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                Preview
              </span>
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <button
            onClick={() => onApprove(item.id)}
            disabled={acting}
            className="text-[11px] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)',
              color: '#5E8E6E',
              border: '1px solid rgba(94,142,110,0.25)',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onEditApprove(item.id)}
            disabled={acting}
            className="text-[11px] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: dark ? 'rgba(212,160,23,0.12)' : 'rgba(212,160,23,0.08)',
              color: '#D4A017',
              border: '1px solid rgba(212,160,23,0.25)',
            }}
          >
            Edit & Approve
          </button>
          <button
            onClick={() => onReject(item.id)}
            disabled={acting}
            className="text-[11px] font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.08)',
              color: '#C45D3E',
              border: '1px solid rgba(196,93,62,0.25)',
            }}
          >
            Reject
          </button>
        </div>

        {/* Expandable payload preview */}
        {expanded && item.payload && (
          <div
            className="mt-3 ml-8 rounded-xl p-4 text-[12px] leading-relaxed overflow-auto max-h-64"
            style={{
              background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
              color: dark ? '#a1a1aa' : '#52525b',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {typeof item.payload === 'string'
              ? item.payload
              : JSON.stringify(item.payload, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════ */

function EmptyState({ dark }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      {/* Large checkmark circle */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: dark ? 'rgba(94,142,110,0.1)' : 'rgba(94,142,110,0.08)',
          border: `2px solid ${dark ? 'rgba(94,142,110,0.2)' : 'rgba(94,142,110,0.15)'}`,
        }}
      >
        <svg className="w-10 h-10" fill="none" stroke="#5E8E6E" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2
        className="text-xl font-bold mb-2"
        style={{
          fontFamily: '"Fraunces", serif',
          color: dark ? '#e5e5e5' : '#1f2937',
        }}
      >
        All caught up
      </h2>
      <p className={`text-sm max-w-xs ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
        Nothing needs your review right now.
      </p>
      <p className={`text-xs mt-2 max-w-sm ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
        Your AI copilot will queue items here when it has suggestions.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */

export default function ApprovalsPage() {
  usePageTitle('Approval Queue');
  const { dark } = useTheme();
  const { refreshPending } = useAutomation();

  /* ── State ── */
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [moduleFilter, setModuleFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  /* ── Fetch approvals ── */
  const fetchApprovals = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJSON('/api/automation/approvals');
      setApprovals(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
      setError(err.message || 'Failed to load approvals');
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = approvals;
    if (moduleFilter !== 'all') {
      list = list.filter(a => a.moduleId === moduleFilter);
    }
    if (priorityFilter !== 'all') {
      list = list.filter(a => a.priority === priorityFilter);
    }
    return list;
  }, [approvals, moduleFilter, priorityFilter]);

  /* ── Unique modules present ── */
  const presentModules = useMemo(() => {
    const ids = [...new Set(approvals.map(a => a.moduleId))];
    return ids.map(id => getModuleInfo(id));
  }, [approvals]);

  /* ── Selection helpers ── */
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  }, [filtered, selectedIds.size]);

  /* ── Actions ── */
  const handleAction = useCallback(async (ids, action) => {
    if (!ids.length) return;
    setActing(true);
    try {
      await Promise.all(
        ids.map(id => postJSON(`/api/automation/approvals/${id}/${action}`, {}))
      );
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      await fetchApprovals();
      refreshPending();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActing(false);
    }
  }, [fetchApprovals, refreshPending]);

  const handleApprove = useCallback((id) => handleAction([id], 'approve'), [handleAction]);
  const handleReject = useCallback((id) => handleAction([id], 'reject'), [handleAction]);
  const handleEditApprove = useCallback((id) => handleAction([id], 'approve'), [handleAction]);
  const handleBatchApprove = useCallback(() => handleAction([...selectedIds], 'approve'), [handleAction, selectedIds]);
  const handleBatchReject = useCallback(() => handleAction([...selectedIds], 'reject'), [handleAction, selectedIds]);

  /* ── Subtitle ── */
  const subtitle = loading
    ? 'Loading...'
    : approvals.length === 0
      ? 'All caught up'
      : `${approvals.length} item${approvals.length !== 1 ? 's' : ''} awaiting your review`;

  /* ── Shared styles ── */
  const panelCls = dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm';
  const selectBg = dark
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(0,0,0,0.03)';
  const selectBorder = dark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.1)';
  const selectColor = dark ? '#d4d4d8' : '#374151';

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      {/* ── Header ── */}
      <div className="mb-6 sm:mb-8">
        <p
          className="hud-label text-[11px] mb-2 font-bold tracking-widest uppercase"
          style={{ color: '#5E8E6E' }}
        >
          APPROVALS
        </p>
        <h1
          className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}
          style={{ fontFamily: '"Fraunces", serif' }}
        >
          Approval Queue
        </h1>
        <p className={`text-base ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{
            background: dark ? 'rgba(196,93,62,0.1)' : 'rgba(196,93,62,0.06)',
            border: `1px solid ${dark ? 'rgba(196,93,62,0.2)' : 'rgba(196,93,62,0.15)'}`,
          }}
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#C45D3E" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${dark ? 'text-red-300' : 'text-red-700'}`}>
              Failed to load approvals
            </p>
            <p className={`text-xs mt-0.5 ${dark ? 'text-red-400/80' : 'text-red-600'}`}>{error}</p>
          </div>
          <button
            onClick={fetchApprovals}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: dark ? 'rgba(196,93,62,0.15)' : 'rgba(196,93,62,0.1)',
              color: '#C45D3E',
              border: '1px solid rgba(196,93,62,0.25)',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      {!loading && approvals.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Module filter */}
          <div className="relative">
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setSelectedIds(new Set()); }}
              className="appearance-none text-[12px] font-semibold pl-3 pr-8 py-2 rounded-lg cursor-pointer outline-none transition-all"
              style={{
                background: selectBg,
                border: `1px solid ${selectBorder}`,
                color: selectColor,
              }}
            >
              <option value="all">All Modules</option>
              {presentModules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <svg
              className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke={dark ? '#6b7280' : '#9ca3af'}
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1">
            {PRIORITY_OPTIONS.map(p => {
              const active = priorityFilter === p;
              const cfg = PRIORITY_CONFIG[p];
              return (
                <button
                  key={p}
                  onClick={() => { setPriorityFilter(p); setSelectedIds(new Set()); }}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider transition-all"
                  style={{
                    background: active
                      ? (p === 'all'
                          ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                          : `${cfg.bg}${Math.round(0.18 * 255).toString(16).padStart(2, '0')}`)
                      : 'transparent',
                    color: active
                      ? (p === 'all'
                          ? (dark ? '#e5e5e5' : '#374151')
                          : (dark ? cfg.darkText : cfg.lightText))
                      : (dark ? '#6b7280' : '#9ca3af'),
                    border: `1px solid ${active
                      ? (p === 'all'
                          ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                          : `${cfg.bg}30`)
                      : 'transparent'}`,
                  }}
                >
                  {p === 'all' ? 'All' : cfg.label}
                </button>
              );
            })}
          </div>

          {/* Count indicator */}
          <span className={`text-[11px] ml-auto ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            {filtered.length} of {approvals.length} shown
          </span>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} dark={dark} />)}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && approvals.length === 0 && !error && (
        <div className={`${panelCls} rounded-2xl`}>
          <EmptyState dark={dark} />
        </div>
      )}

      {/* ── List with batch controls ── */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Batch controls */}
          <div
            className="rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3"
            style={{
              background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {/* Select-all checkbox */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 group"
            >
              <span
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: selectedIds.size === filtered.length && filtered.length > 0
                    ? '#5E8E6E'
                    : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'),
                  background: selectedIds.size === filtered.length && filtered.length > 0
                    ? '#5E8E6E'
                    : selectedIds.size > 0
                      ? (dark ? 'rgba(94,142,110,0.2)' : 'rgba(94,142,110,0.1)')
                      : 'transparent',
                }}
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : selectedIds.size > 0 ? (
                  <span className="w-2 h-0.5 rounded-full bg-[#5E8E6E]" />
                ) : null}
              </span>
              <span className={`text-[11px] font-semibold ${dark ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-700'} transition-colors`}>
                {selectedIds.size === 0
                  ? 'Select all'
                  : `${selectedIds.size} selected`}
              </span>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Batch action buttons */}
            <button
              onClick={handleBatchApprove}
              disabled={selectedIds.size === 0 || acting}
              className="text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: selectedIds.size > 0
                  ? (dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)')
                  : 'transparent',
                color: '#5E8E6E',
                border: `1px solid ${selectedIds.size > 0 ? 'rgba(94,142,110,0.25)' : 'transparent'}`,
              }}
            >
              Approve Selected
            </button>
            <button
              onClick={handleBatchReject}
              disabled={selectedIds.size === 0 || acting}
              className="text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: selectedIds.size > 0
                  ? (dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.08)')
                  : 'transparent',
                color: '#C45D3E',
                border: `1px solid ${selectedIds.size > 0 ? 'rgba(196,93,62,0.25)' : 'transparent'}`,
              }}
            >
              Reject Selected
            </button>
          </div>

          {/* Approval cards */}
          <div className="space-y-3">
            {filtered.map(item => (
              <ApprovalCard
                key={item.id}
                item={item}
                dark={dark}
                selected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelect}
                onApprove={handleApprove}
                onEditApprove={handleEditApprove}
                onReject={handleReject}
                acting={acting}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Filtered-empty state (items exist but none match filter) ── */}
      {!loading && approvals.length > 0 && filtered.length === 0 && (
        <div
          className="rounded-2xl py-16 text-center"
          style={{
            background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <svg
            className="w-10 h-10 mx-auto mb-3"
            fill="none"
            stroke={dark ? '#4b5563' : '#9ca3af'}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          <p className={`text-sm font-semibold ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            No items match your filters
          </p>
          <p className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            Try adjusting the module or priority filter
          </p>
        </div>
      )}
    </div>
  );
}

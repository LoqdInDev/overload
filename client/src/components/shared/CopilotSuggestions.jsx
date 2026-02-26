import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAutomation } from '../../context/AutomationContext';
import { fetchJSON, postJSON } from '../../lib/api';
import { MODULE_REGISTRY } from '../../config/modules';

export default function CopilotSuggestions({ moduleId }) {
  const { dark } = useTheme();
  const { refreshPending } = useAutomation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const mod = MODULE_REGISTRY.find(m => m.id === moduleId);

  const loadItems = useCallback(async () => {
    try {
      const data = await fetchJSON(`/api/automation/approvals?module=${moduleId}&status=pending&limit=10`);
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleAction(id, action) {
    setActioningId(id);
    try {
      await postJSON(`/api/automation/approvals/${id}/${action}`, {});
      setItems(prev => prev.filter(i => i.id !== id));
      refreshPending();
    } catch { /* silent */ }
    setActioningId(null);
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl p-6 animate-pulse" style={{
        background: dark ? 'rgba(212,160,23,0.04)' : 'rgba(212,160,23,0.03)',
        border: `1px solid ${dark ? 'rgba(212,160,23,0.1)' : 'rgba(212,160,23,0.08)'}`,
      }}>
        <div className="h-4 w-48 rounded" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
        <div className="mt-4 space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl p-5" style={{
        background: dark ? 'rgba(212,160,23,0.04)' : 'rgba(212,160,23,0.03)',
        border: `1px solid ${dark ? 'rgba(212,160,23,0.08)' : 'rgba(212,160,23,0.06)'}`,
      }}>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A017' }}>
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#D4A017' }}>AI Suggestions</span>
        </div>
        <p className="text-xs" style={{ color: dark ? '#6B6660' : '#94908A' }}>
          No suggestions yet — AI will generate items when patterns are detected
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl overflow-hidden" style={{
      background: dark ? 'rgba(212,160,23,0.04)' : 'rgba(212,160,23,0.03)',
      border: `1px solid ${dark ? 'rgba(212,160,23,0.1)' : 'rgba(212,160,23,0.08)'}`,
    }}>
      <div className="flex items-center justify-between px-5 py-3" style={{
        borderBottom: `1px solid ${dark ? 'rgba(212,160,23,0.08)' : 'rgba(212,160,23,0.06)'}`,
      }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A017' }}>
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#D4A017' }}>
            AI Suggestions
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{
            background: 'rgba(212,160,23,0.15)',
            color: '#D4A017',
          }}>{items.length}</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items.map(item => (
          <div key={item.id} className="rounded-xl p-4 transition-all" style={{
            background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{
                    background: item.priority === 'urgent' ? 'rgba(239,68,68,0.12)' :
                               item.priority === 'high' ? 'rgba(212,160,23,0.12)' : 'rgba(148,144,138,0.12)',
                    color: item.priority === 'urgent' ? '#ef4444' :
                           item.priority === 'high' ? '#D4A017' : dark ? '#94908A' : '#6B6660',
                  }}>{item.priority}</span>
                  <span className="text-[10px]" style={{ color: dark ? '#6B6660' : '#94908A' }}>
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold truncate" style={{ color: dark ? '#E8E4DE' : '#332F2B' }}>
                  {item.title}
                </h4>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: dark ? '#6B6660' : '#94908A' }}>
                  {item.description}
                </p>
                {item.ai_confidence != null && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{
                      background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.round(item.ai_confidence * 100)}%`,
                        background: item.ai_confidence > 0.85 ? '#22c55e' : item.ai_confidence > 0.7 ? '#D4A017' : '#94908A',
                      }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: dark ? '#6B6660' : '#94908A' }}>
                      {Math.round(item.ai_confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleAction(item.id, 'approve')}
                  disabled={actioningId === item.id}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >Approve</button>
                <button
                  onClick={() => handleAction(item.id, 'reject')}
                  disabled={actioningId === item.id}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                  style={{
                    background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    color: dark ? '#94908A' : '#6B6660',
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >Reject</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

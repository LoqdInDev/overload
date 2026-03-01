import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { MODULE_REGISTRY } from '../../config/modules';

const AUTOMATABLE = MODULE_REGISTRY.filter(m => m.automatable);

const TRIGGER_COLORS = {
  schedule: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  event: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  threshold: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const ACTION_TYPES = [
  'generate_content', 'schedule_post', 'send_campaign', 'adjust_budget',
  'generate_report', 'update_meta', 'respond_review', 'optimize_keywords',
];

const FALLBACK_RULES = [
  { id: 1, module_id: 'content', name: 'Weekly Blog Generator', trigger_type: 'schedule', trigger_config: { frequency: 'weekly', day: 'Monday', time: '09:00' }, action_type: 'generate_content', action_config: { type: 'blog_post', length: 'long' }, status: 'active', requires_approval: true, run_count: 12, last_triggered: new Date(Date.now() - 172800000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 2, module_id: 'social', name: 'Daily Social Post', trigger_type: 'schedule', trigger_config: { frequency: 'daily', time: '10:00' }, action_type: 'schedule_post', action_config: { platforms: ['instagram', 'twitter'] }, status: 'active', requires_approval: false, run_count: 45, last_triggered: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 3, module_id: 'reviews', name: 'Review Auto-Response', trigger_type: 'event', trigger_config: { event: 'new_review', condition: 'rating >= 4' }, action_type: 'respond_review', action_config: { tone: 'thankful' }, status: 'active', requires_approval: true, run_count: 28, last_triggered: new Date(Date.now() - 43200000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 4, module_id: 'ads', name: 'Budget Adjustment on ROAS', trigger_type: 'threshold', trigger_config: { metric: 'roas', operator: '>', value: 4.0 }, action_type: 'adjust_budget', action_config: { change: '+15%' }, status: 'active', requires_approval: false, run_count: 8, last_triggered: new Date(Date.now() - 259200000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 5, module_id: 'email-sms', name: 'Weekly Newsletter', trigger_type: 'schedule', trigger_config: { frequency: 'weekly', day: 'Thursday', time: '14:00' }, action_type: 'send_campaign', action_config: { type: 'newsletter' }, status: 'active', requires_approval: true, run_count: 6, last_triggered: new Date(Date.now() - 604800000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 6, module_id: 'seo', name: 'Bi-weekly SEO Audit', trigger_type: 'schedule', trigger_config: { frequency: 'biweekly', day: 'Wednesday', time: '08:00' }, action_type: 'optimize_keywords', action_config: { depth: 'full' }, status: 'inactive', requires_approval: true, run_count: 3, last_triggered: new Date(Date.now() - 1209600000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
];

export default function AutomationRulesPage() {
  usePageTitle('Automation Rules');
  const { dark } = useTheme();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const cardBg = dark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const selectBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const selectBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  const loadRules = useCallback(async () => {
    try {
      const url = filterModule === 'all' ? '/api/automation/rules' : `/api/automation/rules?module=${filterModule}`;
      const data = await fetchJSON(url);
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules(FALLBACK_RULES.filter(r => filterModule === 'all' || r.module_id === filterModule));
    }
    setLoading(false);
  }, [filterModule]);

  useEffect(() => { loadRules(); }, [loadRules]);

  async function toggleStatus(rule) {
    setTogglingId(rule.id);
    try {
      await putJSON(`/api/automation/rules/${rule.id}`, { status: rule.status === 'active' ? 'inactive' : 'active' });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' } : r));
    } catch { /* silent */ }
    setTogglingId(null);
  }

  async function deleteRule(id) {
    try {
      await deleteJSON(`/api/automation/rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { /* silent */ }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // Group by module
  const grouped = {};
  for (const rule of rules) {
    if (!grouped[rule.module_id]) grouped[rule.module_id] = [];
    grouped[rule.module_id].push(rule);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#5E8E6E' }}>Automation Rules</div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif', color: textPrimary }}>
            Automation Rules
          </h1>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured across your modules
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs"
            style={{ background: selectBg, border: `1px solid ${selectBorder}`, color: textPrimary }}
          >
            <option value="all">All Modules</option>
            {AUTOMATABLE.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: '#5E8E6E', color: '#ffffff' }}
          >+ Create Rule</button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24" style={{ color: textSecondary, opacity: 0.3 }}>
              <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <h3 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>No automation rules yet</h3>
            <p className="text-xs" style={{ color: textSecondary }}>Create rules to automate repetitive tasks across your modules</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([moduleId, moduleRules]) => {
              const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
              return (
                <div key={moduleId}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: mod?.color || '#94908A' }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: mod?.color || textSecondary }}>
                      {mod?.name || moduleId}
                    </span>
                    <span className="text-[10px]" style={{ color: textSecondary }}>({moduleRules.length})</span>
                  </div>
                  <div className="space-y-2">
                    {moduleRules.map(rule => {
                      const tc = TRIGGER_COLORS[rule.trigger_type] || TRIGGER_COLORS.schedule;
                      const isExpanded = expandedId === rule.id;
                      return (
                        <div key={rule.id} className="rounded-xl overflow-hidden transition-all" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                          <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : rule.id)}>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
                              {rule.trigger_type}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: textPrimary }}>{rule.name}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px]" style={{ color: textSecondary }}>{rule.run_count} runs</span>
                                <span className="text-[10px]" style={{ color: textSecondary }}>Last: {timeAgo(rule.last_triggered)}</span>
                                {rule.requires_approval && (
                                  <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'rgba(212,160,23,0.1)', color: '#D4A017' }}>needs approval</span>
                                )}
                              </div>
                            </div>
                            {/* Status toggle */}
                            <button
                              onClick={e => { e.stopPropagation(); toggleStatus(rule); }}
                              disabled={togglingId === rule.id}
                              className="w-9 h-5 rounded-full transition-all flex-shrink-0 relative"
                              style={{
                                background: rule.status === 'active' ? '#22c55e' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                              }}
                            >
                              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{
                                left: rule.status === 'active' ? '18px' : '2px',
                              }} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={e => { e.stopPropagation(); if (confirm('Delete this rule?')) deleteRule(rule.id); }}
                              className="p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-red-500/10"
                              style={{ color: textSecondary }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 space-y-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                              {rule.trigger_config && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Trigger Config</span>
                                  <pre className="mt-1 text-[11px] p-2 rounded-lg overflow-auto max-h-32" style={{
                                    background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                    color: textSecondary,
                                  }}>{JSON.stringify(rule.trigger_config, null, 2)}</pre>
                                </div>
                              )}
                              {rule.action_config && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Action Config</span>
                                  <pre className="mt-1 text-[11px] p-2 rounded-lg overflow-auto max-h-32" style={{
                                    background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                    color: textSecondary,
                                  }}>{JSON.stringify(rule.action_config, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && <CreateRuleModal dark={dark} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadRules(); }} />}
      </div>
    </div>
  );
}

function CreateRuleModal({ dark, onClose, onCreated }) {
  const [form, setForm] = useState({
    module_id: AUTOMATABLE[0]?.id || '',
    name: '',
    trigger_type: 'schedule',
    frequency: 'daily',
    day: 'monday',
    time: '09:00',
    event_type: 'new_data',
    metric: 'views',
    operator: '>',
    threshold_value: '100',
    action_type: 'generate_content',
    requires_approval: true,
  });
  const [saving, setSaving] = useState(false);

  const cardBg = dark ? '#1E1C1A' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    let trigger_config = {};
    if (form.trigger_type === 'schedule') {
      trigger_config = { frequency: form.frequency, day: form.day, time: form.time };
    } else if (form.trigger_type === 'event') {
      trigger_config = { event: form.event_type };
    } else {
      trigger_config = { metric: form.metric, operator: form.operator, value: Number(form.threshold_value) };
    }

    try {
      await postJSON('/api/automation/rules', {
        module_id: form.module_id,
        name: form.name,
        trigger_type: form.trigger_type,
        trigger_config,
        action_type: form.action_type,
        action_config: {},
        requires_approval: form.requires_approval,
      });
      onCreated();
    } catch { /* silent */ }
    setSaving(false);
  }

  const labelStyle = { color: textSecondary, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary, fontSize: 13 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif', color: textPrimary }}>Create Rule</h2>
          <button onClick={onClose} className="p-1" style={{ color: textSecondary }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1" style={labelStyle}>Module</label>
            <select value={form.module_id} onChange={e => setForm(f => ({ ...f, module_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
              {AUTOMATABLE.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>Rule Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekly Blog Generator" className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>Trigger Type</label>
            <div className="flex gap-2">
              {['schedule', 'event', 'threshold'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, trigger_type: t }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.trigger_type === t ? TRIGGER_COLORS[t].bg : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                    color: form.trigger_type === t ? TRIGGER_COLORS[t].color : textSecondary,
                    border: `1px solid ${form.trigger_type === t ? TRIGGER_COLORS[t].color + '33' : 'transparent'}`,
                  }}>{t}</button>
              ))}
            </div>
          </div>

          {form.trigger_type === 'schedule' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1" style={labelStyle}>Frequency</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle}>
                  {['daily', 'weekly', 'biweekly', 'monthly'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Day</label>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Time</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle} />
              </div>
            </div>
          )}

          {form.trigger_type === 'event' && (
            <div>
              <label className="block mb-1" style={labelStyle}>Event Type</label>
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
                {['new_data', 'new_review', 'new_subscriber', 'content_milestone', 'metric_change'].map(e => (
                  <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {form.trigger_type === 'threshold' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1" style={labelStyle}>Metric</label>
                <input value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle} />
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Operator</label>
                <select value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle}>
                  {['>', '<', '>=', '<=', '='].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Value</label>
                <input type="number" value={form.threshold_value} onChange={e => setForm(f => ({ ...f, threshold_value: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle} />
              </div>
            </div>
          )}

          <div>
            <label className="block mb-1" style={labelStyle}>Action Type</label>
            <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label style={labelStyle}>Requires Approval</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, requires_approval: !f.requires_approval }))}
              className="w-9 h-5 rounded-full transition-all relative"
              style={{ background: form.requires_approval ? '#D4A017' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{
                left: form.requires_approval ? '18px' : '2px',
              }} />
            </button>
          </div>
          <p className="text-[10px]" style={{ color: textSecondary }}>
            {form.requires_approval ? 'Copilot mode — AI will suggest, you approve' : 'Autopilot mode — AI will execute automatically'}
          </p>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving || !form.name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#5E8E6E', color: '#ffffff', opacity: saving || !form.name.trim() ? 0.5 : 1 }}>
              {saving ? 'Creating...' : 'Create Rule'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm"
              style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: textSecondary }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

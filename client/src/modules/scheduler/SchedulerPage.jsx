import { useState, useEffect, useCallback } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#3b82f6';

const MODULES = [
  { id: 'social', name: 'Social Media', color: '#3b82f6' },
  { id: 'email-sms', name: 'Email & SMS', color: '#f59e0b' },
  { id: 'content', name: 'Content', color: '#f97316' },
  { id: 'ads', name: 'Ads', color: '#10b981' },
  { id: 'creative', name: 'Creative', color: '#8b5cf6' },
  { id: 'seo', name: 'SEO', color: '#06b6d4' },
  { id: 'reports', name: 'Reports', color: '#ec4899' },
  { id: 'reviews', name: 'Reviews', color: '#14b8a6' },
];

const SCHEDULE_TYPES = [
  { id: 'once', name: 'One-time' },
  { id: 'daily', name: 'Daily' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'monthly', name: 'Monthly' },
];

const getModuleColor = (moduleId) => MODULES.find(m => m.id === moduleId)?.color || '#6b7280';
const getModuleName = (moduleId) => MODULES.find(m => m.id === moduleId)?.name || moduleId;

export default function SchedulerPage() {
  usePageTitle('Scheduler');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    name: '', module: 'social', action: '', schedule_type: 'once', next_run: '',
  });

  // AI state
  const [aiTopic, setAiTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState('');
  const [cancelSSE, setCancelSSE] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/scheduler/tasks');
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Split tasks
  const active = tasks.filter(t => t.status === 'active');
  const completed = tasks.filter(t => t.status !== 'active');

  const createTask = async () => {
    if (!form.name.trim() || !form.action.trim()) return;
    setSaving(true);
    try {
      await postJSON('/api/scheduler/tasks', form);
      setCreating(false);
      setForm({ name: '', module: 'social', action: '', schedule_type: 'once', next_run: '' });
      await loadTasks();
    } catch (err) {
      console.error('Create failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    try {
      await deleteJSON(`/api/scheduler/tasks/${id}`);
      await loadTasks();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // AI generation
  const generatePlan = () => {
    if (!aiTopic.trim()) return;
    if (generating && cancelSSE) { cancelSSE(); }
    const prompt = `Topic: "${aiTopic.trim()}"\n\nCreate a practical scheduling plan for this. Include recommended timing, frequency, and specific tasks to schedule across marketing channels. Be specific with days and times. Format as an actionable checklist.`;
    setGenerating(true);
    setAiOutput('');
    const cancel = connectSSE('/api/scheduler/generate', { type: 'content', prompt }, {
      onChunk: (text) => setAiOutput(p => p + text),
      onResult: (data) => setAiOutput(data.content || ''),
      onError: (err) => { console.error(err); setGenerating(false); },
      onDone: () => setGenerating(false),
    });
    setCancelSSE(() => cancel);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date set';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
      if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${time}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>SCHEDULER</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Task Scheduler</h1>
          <p className="text-base text-gray-500">Schedule and automate recurring marketing tasks</p>
        </div>
        <button
          onClick={() => { setTab('upcoming'); setCreating(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 flex-shrink-0"
          style={{ background: MODULE_COLOR }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Schedule Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'ACTIVE TASKS', value: active.length.toString(), sub: 'Scheduled' },
          { label: 'ONE-TIME', value: tasks.filter(t => t.schedule_type === 'once').length.toString(), sub: 'Single run' },
          { label: 'RECURRING', value: tasks.filter(t => t.schedule_type !== 'once').length.toString(), sub: 'Daily / Weekly / Monthly' },
          { label: 'TOTAL', value: tasks.length.toString(), sub: 'All tasks' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {[
          { id: 'upcoming', label: 'Tasks' },
          { id: 'ai-planner', label: 'AI Planner' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip text-xs ${tab === t.id ? 'active' : ''}`} style={tab === t.id ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TASKS TAB ─── */}
      {tab === 'upcoming' && (
        <div className="animate-fade-in space-y-4">
          {/* Create task form */}
          {creating && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>NEW SCHEDULED TASK</p>
                <button onClick={() => setCreating(false)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Task name (e.g. Weekly Newsletter, Instagram Post)..."
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40"
                />
                <input
                  type="text"
                  placeholder="Action description (e.g. Send email campaign, Publish carousel post)..."
                  value={form.action}
                  onChange={(e) => setForm(f => ({ ...f, action: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={form.module}
                    onChange={(e) => setForm(f => ({ ...f, module: e.target.value }))}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40"
                  >
                    {MODULES.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    value={form.schedule_type}
                    onChange={(e) => setForm(f => ({ ...f, schedule_type: e.target.value }))}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40"
                  >
                    {SCHEDULE_TYPES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={form.next_run}
                    onChange={(e) => setForm(f => ({ ...f, next_run: e.target.value }))}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={createTask}
                    disabled={saving || !form.name.trim() || !form.action.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                    style={{ background: MODULE_COLOR }}
                  >
                    {saving ? 'Scheduling...' : 'Schedule Task'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Task list */}
          {tasks.length === 0 && !creating ? (
            <div className="panel rounded-2xl p-8 sm:p-12 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="text-sm text-gray-400 mb-1">No tasks scheduled</p>
              <p className="text-xs text-gray-600 mb-4">Schedule your first marketing task to get started</p>
              <button
                onClick={() => setCreating(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white hover:brightness-110 transition-all"
                style={{ background: MODULE_COLOR }}
              >
                Schedule First Task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const modColor = getModuleColor(task.module);
                return (
                  <div key={task.id} className="panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 group">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${modColor}15`, border: `1px solid ${modColor}20` }}>
                      <svg className="w-5 h-5" style={{ color: modColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200">{task.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${modColor}15`, color: modColor, border: `1px solid ${modColor}25` }}>
                          {getModuleName(task.module)}
                        </span>
                        <span className="text-xs text-gray-500">{task.action}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-300">{formatDate(task.next_run)}</p>
                        <p className="text-[10px] text-gray-600">
                          {SCHEDULE_TYPES.find(s => s.id === task.schedule_type)?.name || task.schedule_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'active' ? 'bg-green-500' : 'bg-gray-600'}`} />
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/[0.05] opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete task"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── AI PLANNER TAB ─── */}
      {tab === 'ai-planner' && (
        <div className="animate-fade-in space-y-4">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1" style={{ color: MODULE_COLOR }}>AI SCHEDULE PLANNER</p>
            <p className="text-xs text-gray-500 mb-4">Describe your goal and AI will create a scheduling plan with recommended tasks, timing, and frequency</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="e.g. Product launch next week, Monthly newsletter strategy, Holiday campaign schedule..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aiTopic.trim() && generatePlan()}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40"
              />
              <button
                onClick={generatePlan}
                disabled={generating || !aiTopic.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: MODULE_COLOR }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                {generating ? 'Planning...' : 'Generate Schedule Plan'}
              </button>
            </div>
          </div>

          {(generating || aiOutput) && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                  <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>
                    {generating ? 'PLANNING...' : 'COMPLETE'}
                  </span>
                </div>
                {!generating && aiOutput && (
                  <button onClick={() => setAiOutput('')} className="text-[10px] text-gray-600 hover:text-gray-400">Clear</button>
                )}
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
                {aiOutput}
                {generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}
              </pre>
            </div>
          )}
        </div>
      )}

      <AIInsightsPanel moduleId="scheduler" />
    </div>
  );
}

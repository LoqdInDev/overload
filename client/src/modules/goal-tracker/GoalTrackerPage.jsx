import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#f59e0b';

const GOAL_TEMPLATES = [
  { name: 'Grow email list to 10K', metric: 'email_subscribers', target_value: 10000, notes: 'Track via Email/SMS module subscriber count' },
  { name: 'Publish 20 blogs this month', metric: 'blog_posts_published', target_value: 20, notes: 'Track via Content Creation module' },
  { name: 'Hit $10K MRR', metric: 'monthly_recurring_revenue', target_value: 10000, notes: 'Track via Ecommerce / CRM deal closes' },
  { name: 'Get 50 reviews', metric: 'total_reviews', target_value: 50, notes: 'Track via Reviews module' },
  { name: 'Generate 100 leads', metric: 'crm_leads', target_value: 100, notes: 'Track via CRM module contacts' },
  { name: 'Reach 1K social followers', metric: 'social_followers', target_value: 1000, notes: 'Track via Social Media module' },
];

const AI_TEMPLATES = [
  { name: 'Generate Goal Strategy', prompt: 'Create a comprehensive goal achievement strategy with SMART objectives, key results, action items, and weekly check-in framework' },
  { name: 'Analyze Progress', prompt: 'Analyze current goal progress data and provide insights on what is working, potential blockers, and recommended adjustments to stay on track' },
  { name: 'Suggest Milestones', prompt: 'Break down a large goal into achievable milestones with realistic timelines, dependencies, and success criteria for each milestone' },
  { name: 'Create Action Plan', prompt: 'Generate a detailed daily/weekly action plan with prioritized tasks, time estimates, and accountability checkpoints to accelerate goal completion' },
];

export default function GoalTrackerPage() {
  usePageTitle('Goal Tracker');
  const [tab, setTab] = useState('overview');
  const [goals, setGoals] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target_value: '', current_value: '', metric: '', deadline: '', status: 'active' });
  const [forecasts, setForecasts] = useState({});
  const [forecastingId, setForecastingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchJSON('/api/goal-tracker/')
      .then(data => {
        setGoals(data);
        const allMilestones = [];
        return Promise.all(data.map(g =>
          fetchJSON(`/api/goal-tracker/${g.id}`).then(full => {
            if (full.milestones) allMilestones.push(...full.milestones);
          }).catch(() => {})
        )).then(() => setMilestones(allMilestones));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addGoal = async () => {
    if (!newGoal.name.trim()) return;
    try {
      const created = await postJSON('/api/goal-tracker/', {
        ...newGoal,
        target_value: parseFloat(newGoal.target_value) || 0,
        current_value: parseFloat(newGoal.current_value) || 0,
      });
      setGoals(prev => [created, ...prev]);
      setNewGoal({ name: '', target_value: '', current_value: '', metric: '', deadline: '', status: 'active' });
      setShowAddGoal(false);
    } catch (err) { console.error(err); }
  };

  const removeGoal = async (id) => {
    try {
      await deleteJSON(`/api/goal-tracker/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
      setMilestones(prev => prev.filter(m => m.goal_id !== id));
    } catch (err) { console.error(err); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/goal-tracker/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const statusColor = (s) => s === 'active' || s === 'on-track' ? '#22c55e' : s === 'at-risk' ? '#f59e0b' : s === 'behind' ? '#ef4444' : '#6b7280';

  const getProgress = (goal) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  };

  const completedGoals = goals.filter(g => g.status === 'completed' || getProgress(g) >= 100).length;
  const activeGoals = goals.filter(g => g.status !== 'completed').length;

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>GOAL TRACKER</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Goals & Milestones</h1>
          <p className="text-base text-gray-500">Track progress toward your most important objectives</p>
        </div>
        <button onClick={() => { setShowAddGoal(!showAddGoal); setTab('goals'); }} className="chip text-[10px]" style={{ background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR }}>+ New Goal</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'TOTAL GOALS', value: goals.length.toString() },
          { label: 'ACTIVE', value: activeGoals.toString() },
          { label: 'COMPLETED', value: completedGoals.toString() },
          { label: 'MILESTONES', value: milestones.length.toString() },
        ].map((s, i) => (
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-2">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {['overview', 'goals', 'milestones', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-4 sm:mb-6" style={{ color: MODULE_COLOR }}>GOAL PROGRESS</p>
            {goals.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">{loading ? 'Loading...' : 'No goals yet. Create one to get started.'}</p>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {goals.map(goal => {
                  const pct = getProgress(goal);
                  return (
                    <div key={goal.id}>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-sm font-semibold text-gray-300">{goal.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(goal.status)}15`, color: statusColor(goal.status), border: `1px solid ${statusColor(goal.status)}25` }}>
                            {goal.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-gray-500">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: statusColor(goal.status) }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>{goal.metric || ''} {goal.current_value}</span>
                        <span>Target: {goal.target_value}{goal.deadline ? ` by ${goal.deadline}` : ''}</span>
                      </div>
                      {forecasts[goal.id] && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: forecasts[goal.id].on_track ? '#22c55e' : '#ef4444' }}>
                            {forecasts[goal.id].probability_of_success}% success prob.
                          </span>
                          <span className="chip" style={{ fontSize: 9, borderColor: forecasts[goal.id].on_track ? '#22c55e' : '#ef4444', color: forecasts[goal.id].on_track ? '#22c55e' : '#ef4444' }}>
                            {forecasts[goal.id].on_track ? '✅ On Track' : '⚠ Behind'}
                          </span>
                        </div>
                      )}
                    </div>
                );
              })}
              </div>
            )}
          </div>
          {milestones.length > 0 && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>RECENT MILESTONES</p>
              <div className="space-y-3">
                {milestones.slice(0, 6).map(m => {
                  const goal = goals.find(g => g.id === m.goal_id);
                  return (
                    <div key={m.id} className="flex items-start gap-3 py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: m.reached_at ? '#22c55e' : '#6b7280' }} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-300">{m.label || `Milestone at ${m.value}`}</p>
                        <p className="text-xs text-gray-600">{goal?.name || ''}{m.reached_at ? ` — Reached ${m.reached_at}` : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'goals' && (
        <div className="animate-fade-in space-y-4">
          {showAddGoal && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="mb-4">
                <p className="hud-label text-[10px] mb-2">QUICK TEMPLATES</p>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_TEMPLATES.map(t => (
                    <button
                      key={t.metric}
                      type="button"
                      className="chip text-[10px]"
                      onClick={() => {
                        setNewGoal(prev => ({ ...prev, name: t.name, metric: t.metric, target_value: t.target_value, notes: t.notes }));
                      }}
                    >{t.name}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="Goal name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newGoal.metric} onChange={e => setNewGoal({ ...newGoal, metric: e.target.value })} placeholder="Metric (e.g. $, users, %)" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} placeholder="Deadline (YYYY-MM-DD)" type="date" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newGoal.current_value} onChange={e => setNewGoal({ ...newGoal, current_value: e.target.value })} placeholder="Current value" type="number" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newGoal.target_value} onChange={e => setNewGoal({ ...newGoal, target_value: e.target.value })} placeholder="Target value" type="number" className="input-field rounded px-3 py-2 text-xs" />
                <button onClick={addGoal} className="btn-accent py-2 rounded text-[10px]" style={{ background: MODULE_COLOR }}>Create Goal</button>
              </div>
            </div>
          )}
          {goals.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">{loading ? 'Loading...' : 'No goals yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
              {goals.map(goal => {
                const pct = getProgress(goal);
                return (
                  <div key={goal.id} className="group panel rounded-2xl p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(goal.status)}15`, color: statusColor(goal.status), border: `1px solid ${statusColor(goal.status)}25` }}>
                        {goal.status}
                      </span>
                      <button onClick={() => removeGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                    </div>
                    <p className="text-base font-bold text-gray-200 mt-2">{goal.name}</p>
                    {goal.deadline && <p className="text-xs text-gray-500 mt-0.5">Deadline: {goal.deadline}</p>}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-mono text-gray-300">{goal.current_value} / {goal.target_value} {goal.metric || ''}</span>
                      </div>
                      <div className="h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-1" style={{ width: `${Math.max(pct, 5)}%`, background: `linear-gradient(90deg, ${statusColor(goal.status)}80, ${statusColor(goal.status)})` }}>
                          {pct > 15 && <span className="text-[10px] font-bold text-white/80">{pct.toFixed(0)}%</span>}
                        </div>
                      </div>
                    </div>
                    {goal.notes && <p className="text-xs text-gray-600 mt-2">{goal.notes}</p>}
                    <div style={{ marginTop: 8 }}>
                      <button className="chip text-[10px]" style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40` }}
                        disabled={forecastingId === goal.id}
                        onClick={async () => {
                          setForecastingId(goal.id);
                          try {
                            const result = await postJSON('/api/goal-tracker/forecast', {
                              goal_name: goal.name,
                              target_value: goal.target_value,
                              current_value: goal.current_value,
                              start_date: goal.created_at,
                              target_date: goal.deadline
                            });
                            setForecasts(prev => ({ ...prev, [goal.id]: result }));
                          } catch {}
                          setForecastingId(null);
                        }}>{forecastingId === goal.id ? '...' : 'Forecast'}</button>
                    </div>
                    {forecasts[goal.id] && (
                      <div style={{ marginTop: 8, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: forecasts[goal.id].on_track ? '#22c55e' : '#ef4444' }}>
                              {forecasts[goal.id].probability_of_success}%
                            </div>
                            <div className="hud-label" style={{ fontSize: 9 }}>Success Prob.</div>
                          </div>
                          <div style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>
                            <div>{forecasts[goal.id].recommendation}</div>
                            <div style={{ marginTop: 4 }}>
                              <span className="chip" style={{ fontSize: 10, borderColor: forecasts[goal.id].on_track ? '#22c55e' : '#ef4444', color: forecasts[goal.id].on_track ? '#22c55e' : '#ef4444' }}>
                                {forecasts[goal.id].on_track ? '✅ On Track' : '⚠ Behind Pace'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'milestones' && (
        <div className="animate-fade-in">
          {milestones.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">{loading ? 'Loading...' : 'No milestones yet'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, i) => {
                const goal = goals.find(g => g.id === m.goal_id);
                return (
                  <div key={m.id} className="panel rounded-2xl p-4 sm:p-6 flex items-start gap-3 sm:gap-5">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: m.reached_at ? '#22c55e' : '#6b7280', background: m.reached_at ? '#22c55e' : 'transparent' }} />
                      {i < milestones.length - 1 && <div className="w-0.5 h-8 mt-1" style={{ background: m.reached_at ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)' }} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-300">{m.label || `Milestone at ${m.value}`}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{goal?.name || 'Goal'} — Value: {m.value}{m.reached_at ? ` — Reached: ${m.reached_at}` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-amber-500/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
      <AIInsightsPanel moduleId="goal-tracker" />
    </div>
  );
}

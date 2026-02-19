import { useState } from 'react';

const MODULE_COLOR = '#f59e0b';

const AI_TEMPLATES = [
  { name: 'Generate Goal Strategy', prompt: 'Create a comprehensive goal achievement strategy with SMART objectives, key results, action items, and weekly check-in framework' },
  { name: 'Analyze Progress', prompt: 'Analyze current goal progress data and provide insights on what is working, potential blockers, and recommended adjustments to stay on track' },
  { name: 'Suggest Milestones', prompt: 'Break down a large goal into achievable milestones with realistic timelines, dependencies, and success criteria for each milestone' },
  { name: 'Create Action Plan', prompt: 'Generate a detailed daily/weekly action plan with prioritized tasks, time estimates, and accountability checkpoints to accelerate goal completion' },
];

const MOCK_GOALS = [
  { id: 1, title: 'Reach $100K MRR', current: 72400, target: 100000, unit: '$', status: 'on-track', deadline: '2026-06-30', category: 'Revenue' },
  { id: 2, title: '10,000 Active Users', current: 7840, target: 10000, unit: '', status: 'on-track', deadline: '2026-04-30', category: 'Growth' },
  { id: 3, title: 'Reduce Churn to <3%', current: 4.2, target: 3.0, unit: '%', status: 'at-risk', deadline: '2026-03-31', category: 'Retention', inverse: true },
  { id: 4, title: 'Launch 5 New Features', current: 3, target: 5, unit: '', status: 'on-track', deadline: '2026-05-15', category: 'Product' },
  { id: 5, title: '50 Enterprise Clients', current: 28, target: 50, unit: '', status: 'behind', deadline: '2026-06-30', category: 'Sales' },
  { id: 6, title: 'NPS Score > 70', current: 64, target: 70, unit: '', status: 'on-track', deadline: '2026-04-30', category: 'Customer' },
];

const MOCK_MILESTONES = [
  { id: 1, title: 'Q1 Revenue Target: $75K MRR', goalId: 1, date: '2026-03-31', status: 'completed', note: 'Achieved on March 22' },
  { id: 2, title: 'Hire 2 Enterprise Sales Reps', goalId: 5, date: '2026-02-15', status: 'completed', note: 'Both reps onboarded' },
  { id: 3, title: 'Launch Referral Program v2', goalId: 2, date: '2026-02-28', status: 'in-progress', note: 'In final QA testing' },
  { id: 4, title: 'Implement Churn Prediction Model', goalId: 3, date: '2026-03-15', status: 'in-progress', note: 'Data pipeline ready' },
  { id: 5, title: 'Release Feature #4: Analytics v2', goalId: 4, date: '2026-03-20', status: 'upcoming', note: 'Design approved' },
  { id: 6, title: 'Close 10 Enterprise Deals', goalId: 5, date: '2026-04-15', status: 'upcoming', note: '6 in pipeline' },
  { id: 7, title: 'Q2 Revenue Target: $90K MRR', goalId: 1, date: '2026-06-15', status: 'upcoming', note: 'On track' },
  { id: 8, title: 'Customer Survey for NPS', goalId: 6, date: '2026-03-01', status: 'in-progress', note: 'Survey sent to 2,000 users' },
];

export default function GoalTrackerPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/goal-tracker/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const statusColor = (s) => s === 'on-track' ? '#22c55e' : s === 'at-risk' ? '#f59e0b' : '#ef4444';
  const milestoneStatusColor = (s) => s === 'completed' ? '#22c55e' : s === 'in-progress' ? '#3b82f6' : '#6b7280';

  const getProgress = (goal) => {
    if (goal.inverse) return Math.min(100, Math.max(0, ((goal.target / goal.current) * 100)));
    return Math.min(100, (goal.current / goal.target) * 100);
  };

  const activeGoals = MOCK_GOALS.length;
  const completedGoals = MOCK_GOALS.filter(g => getProgress(g) >= 100).length;
  const onTrack = MOCK_GOALS.filter(g => g.status === 'on-track').length;
  const overdue = MOCK_GOALS.filter(g => g.status === 'behind').length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>GOAL TRACKER</p>
        <h1 className="text-2xl font-bold text-white mb-1">Goals & Milestones</h1>
        <p className="text-sm text-gray-500">Track progress toward your most important objectives</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'ACTIVE GOALS', value: activeGoals.toString(), sub: `${activeGoals - completedGoals} in progress` },
          { label: 'COMPLETED', value: completedGoals.toString(), sub: `${((completedGoals / activeGoals) * 100).toFixed(0)}% completion rate` },
          { label: 'ON TRACK', value: `${((onTrack / activeGoals) * 100).toFixed(0)}%`, sub: `${onTrack} of ${activeGoals} goals` },
          { label: 'OVERDUE', value: overdue.toString(), sub: overdue > 0 ? 'Needs attention' : 'All on schedule' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4">
            <p className="hud-label mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {['overview', 'goals', 'milestones', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4">
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-4" style={{ color: MODULE_COLOR }}>GOAL PROGRESS SNAPSHOT</p>
            <div className="space-y-4">
              {MOCK_GOALS.map(goal => {
                const pct = getProgress(goal);
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300">{goal.title}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(goal.status)}15`, color: statusColor(goal.status), border: `1px solid ${statusColor(goal.status)}25` }}>
                          {goal.status.replace('-', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: statusColor(goal.status) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>UPCOMING MILESTONES</p>
              <div className="space-y-2">
                {MOCK_MILESTONES.filter(m => m.status !== 'completed').slice(0, 4).map(m => (
                  <div key={m.id} className="flex items-start gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: milestoneStatusColor(m.status) }} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-300">{m.title}</p>
                      <p className="text-[10px] text-gray-600">{m.date} &middot; {m.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>GOALS BY CATEGORY</p>
              <div className="grid grid-cols-2 gap-2">
                {['Revenue', 'Growth', 'Retention', 'Product', 'Sales', 'Customer'].map(cat => {
                  const goals = MOCK_GOALS.filter(g => g.category === cat);
                  return (
                    <div key={cat} className="bg-white/[0.02] rounded-lg p-2.5 border border-indigo-500/[0.06]">
                      <p className="text-[10px] font-bold text-gray-400">{cat}</p>
                      <p className="text-sm font-bold font-mono text-white">{goals.length}</p>
                      <p className="text-[9px] text-gray-600">{goals.filter(g => g.status === 'on-track').length} on track</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals */}
      {tab === 'goals' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3">
          {MOCK_GOALS.map(goal => {
            const pct = getProgress(goal);
            const formatValue = (v, unit) => unit === '$' ? `$${v.toLocaleString()}` : unit === '%' ? `${v}%` : v.toLocaleString();
            return (
              <div key={goal.id} className="panel rounded-xl p-4 hover:border-amber-500/20 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${MODULE_COLOR}15`, color: MODULE_COLOR, border: `1px solid ${MODULE_COLOR}25` }}>
                      {goal.category}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(goal.status)}15`, color: statusColor(goal.status), border: `1px solid ${statusColor(goal.status)}25` }}>
                    {goal.status.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-200 mt-2">{goal.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Deadline: {goal.deadline}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="font-mono text-gray-300">{formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)}</span>
                  </div>
                  <div className="h-3 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-1" style={{ width: `${Math.max(pct, 5)}%`, background: `linear-gradient(90deg, ${statusColor(goal.status)}80, ${statusColor(goal.status)})` }}>
                      <span className="text-[8px] font-bold text-white/80">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Milestones */}
      {tab === 'milestones' && (
        <div className="animate-fade-in">
          <div className="space-y-2">
            {MOCK_MILESTONES.map((m, i) => (
              <div key={m.id} className="panel rounded-xl p-4 flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: milestoneStatusColor(m.status), background: m.status === 'completed' ? milestoneStatusColor(m.status) : 'transparent' }} />
                  {i < MOCK_MILESTONES.length - 1 && <div className="w-0.5 h-8 mt-1" style={{ background: `${milestoneStatusColor(m.status)}30` }} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-300">{m.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${milestoneStatusColor(m.status)}15`, color: milestoneStatusColor(m.status), border: `1px solid ${milestoneStatusColor(m.status)}25` }}>
                      {m.status.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{m.date} &middot; {m.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-amber-500/30' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

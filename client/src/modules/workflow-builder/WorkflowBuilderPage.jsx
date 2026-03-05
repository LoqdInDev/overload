import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#8b5cf6';

const AI_TEMPLATES = [
  { name: 'Design Workflow', prompt: 'Design a complete marketing automation workflow including triggers, conditions, actions, and delays for maximum conversion' },
  { name: 'Optimize Flow Logic', prompt: 'Analyze and optimize an existing workflow for better performance, fewer steps, and improved conversion rates' },
  { name: 'Error Recovery Plan', prompt: 'Create a comprehensive error handling and recovery strategy for automated marketing workflows' },
  { name: 'Workflow Documentation', prompt: 'Generate detailed documentation for a marketing automation workflow including purpose, steps, conditions, and maintenance notes' },
];

const triggerLabel = (t) => {
  const map = { new_order: 'New Order', form_submit: 'Form Submit', schedule: 'Schedule', webhook: 'Webhook' };
  return map[t] || t || 'Manual';
};

const triggerColor = (t) => {
  const map = { new_order: '#22c55e', form_submit: '#3b82f6', schedule: '#f59e0b', webhook: '#ec4899' };
  return map[t] || '#6b7280';
};

const statusColor = (s) => {
  const map = { active: '#22c55e', draft: '#6b7280', paused: '#f59e0b', success: '#22c55e', failed: '#ef4444', running: '#3b82f6' };
  return map[s] || '#6b7280';
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WorkflowBuilderPage() {
  usePageTitle('Workflow Builder');
  const [tab, setTab] = useState('workflows');
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', trigger_type: 'schedule' });
  const [runningId, setRunningId] = useState(null);

  // AI Workflow Suggester
  const [workflowGoal, setWorkflowGoal] = useState('');
  const [workflowOutput, setWorkflowOutput] = useState('');
  const [workflowLoading, setWorkflowLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchJSON('/api/workflow-builder/workflows')
      .then(data => setWorkflows(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;
    try {
      const created = await postJSON('/api/workflow-builder/workflows', newWorkflow);
      setWorkflows(prev => [{ ...created, status: 'draft', run_count: 0, trigger_type: newWorkflow.trigger_type, created_at: new Date().toISOString() }, ...prev]);
      setNewWorkflow({ name: '', description: '', trigger_type: 'schedule' });
      setShowCreate(false);
    } catch (err) { console.error(err); }
  };

  const removeWorkflow = async (id) => {
    try {
      await deleteJSON(`/api/workflow-builder/workflows/${id}`);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) { console.error(err); }
  };

  const toggleWorkflowStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      const updated = await putJSON(`/api/workflow-builder/workflows/${id}`, { status: newStatus });
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: updated.status || newStatus } : w));
    } catch (err) { console.error(err); }
  };

  const runWorkflow = async (id) => {
    setRunningId(id);
    try {
      await postJSON(`/api/workflow-builder/workflows/${id}/run`, {});
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, run_count: (w.run_count || 0) + 1, last_run: new Date().toISOString() } : w));
    } catch (err) { console.error(err); }
    setRunningId(null);
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/workflow-builder/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const activeCount = workflows.filter(w => w.status === 'active').length;
  const draftCount = workflows.filter(w => w.status === 'draft').length;
  const totalRuns = workflows.reduce((sum, w) => sum + (w.run_count || 0), 0);
  const withRuns = workflows.filter(w => w.run_count > 0);
  const avgRuns = withRuns.length > 0 ? Math.round(totalRuns / withRuns.length) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>WORKFLOW BUILDER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Automation Workflows</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'TOTAL WORKFLOWS', value: workflows.length.toString(), sub: `${activeCount} active` },
          { label: 'DRAFTS', value: draftCount.toString(), sub: 'Awaiting activation' },
          { label: 'TOTAL RUNS', value: totalRuns.toLocaleString(), sub: 'All time' },
          { label: 'AVG RUNS / WORKFLOW', value: avgRuns.toString(), sub: 'Across active workflows' },
        ].map((s, i) => (
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-2">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-2">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {['workflows', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Workflows Tab */}
      {tab === 'workflows' && (
        <div className="animate-fade-in">
          {/* AI Workflow Suggester */}
          <div className="panel rounded-2xl p-4 sm:p-6 mb-4">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>AI WORKFLOW SUGGESTER</p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Describe your automation goal (e.g. nurture leads who fill out contact form)"
                value={workflowGoal}
                onChange={e => setWorkflowGoal(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm text-gray-200 placeholder-gray-400 focus:outline-none"
                style={{ '--tw-ring-color': MODULE_COLOR }}
              />
              <button
                disabled={workflowLoading || !workflowGoal.trim()}
                onClick={() => {
                  setWorkflowLoading(true);
                  setWorkflowOutput('');
                  connectSSE('/api/workflow-builder/suggest-workflow', { goal: workflowGoal }, {
                    onChunk: (text) => setWorkflowOutput(p => p + text),
                    onResult: (data) => { setWorkflowOutput(data.content); setWorkflowLoading(false); },
                    onError: () => setWorkflowLoading(false),
                    onDone: () => setWorkflowLoading(false),
                  });
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{ background: workflowLoading ? `${MODULE_COLOR}4d` : MODULE_COLOR }}
              >
                {workflowLoading ? 'Thinking...' : 'Suggest Workflow'}
              </button>
            </div>
            {workflowOutput && (
              <div className="mt-3 p-3 rounded-lg bg-transparent border border-gray-100">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{workflowOutput}{workflowLoading && <span className="inline-block w-1 h-3.5 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
              </div>
            )}
          </div>

          {/* Add Workflow Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: MODULE_COLOR, color: '#ffffff', boxShadow: `0 4px 20px -4px ${MODULE_COLOR}66` }}
            >+ Add Workflow</button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <div className="panel rounded-2xl p-4 sm:p-6 mb-4 animate-fade-in">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>NEW WORKFLOW</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={newWorkflow.name}
                  onChange={e => setNewWorkflow(f => ({ ...f, name: e.target.value }))}
                  placeholder="Workflow name"
                  className="input-field rounded-lg px-4 py-2 text-sm"
                />
                <input
                  value={newWorkflow.description}
                  onChange={e => setNewWorkflow(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="input-field rounded-lg px-4 py-2 text-sm"
                />
                <select
                  value={newWorkflow.trigger_type}
                  onChange={e => setNewWorkflow(f => ({ ...f, trigger_type: e.target.value }))}
                  className="input-field rounded-lg px-4 py-2 text-sm"
                >
                  <option value="schedule">Schedule</option>
                  <option value="new_order">New Order</option>
                  <option value="form_submit">Form Submit</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={addWorkflow}
                  disabled={!newWorkflow.name.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: MODULE_COLOR, color: '#ffffff', opacity: newWorkflow.name.trim() ? 1 : 0.5 }}
                >Create</button>
                <button
                  onClick={() => { setShowCreate(false); setNewWorkflow({ name: '', description: '', trigger_type: 'schedule' }); }}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >Cancel</button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="panel rounded-2xl p-6 h-20 animate-pulse" />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            /* Empty State */
            <div className="panel rounded-2xl p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <p className="text-sm font-semibold text-gray-300 mb-1">No workflows yet</p>
              <p className="text-xs text-gray-600">Create your first automation workflow to get started</p>
            </div>
          ) : (
            /* Workflow List */
            <div className="space-y-3">
              {workflows.map(wf => (
                <div key={wf.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 hover:border-indigo-500/15 transition-all group">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 hidden sm:flex" style={{ background: `${MODULE_COLOR}15`, border: `1px solid ${MODULE_COLOR}20` }}>
                    <svg className="w-6 h-6" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-200">{wf.name}</p>
                    {wf.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{wf.description}</p>}
                    <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${triggerColor(wf.trigger_type)}15`, color: triggerColor(wf.trigger_type), border: `1px solid ${triggerColor(wf.trigger_type)}25` }}>
                        {triggerLabel(wf.trigger_type)}
                      </span>
                      <span className="text-xs text-gray-500">{wf.run_count || 0} runs</span>
                      <span className="text-xs text-gray-600">Last run: {timeAgo(wf.last_run)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Run button */}
                    <button
                      onClick={() => runWorkflow(wf.id)}
                      disabled={runningId === wf.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-emerald-500/10"
                      title="Run workflow"
                    >
                      {runningId === wf.id ? (
                        <span className="w-4 h-4 border-2 border-gray-500 border-t-emerald-400 rounded-full animate-spin block" />
                      ) : (
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => removeWorkflow(wf.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                      title="Delete workflow"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                    {/* Status toggle */}
                    <button
                      onClick={() => toggleWorkflowStatus(wf.id, wf.status)}
                      title={`Click to ${wf.status === 'active' ? 'deactivate' : 'activate'}`}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                      style={{ background: `${statusColor(wf.status)}15`, color: statusColor(wf.status), border: `1px solid ${statusColor(wf.status)}25` }}
                    >
                      {wf.status || 'draft'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-purple-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? MODULE_COLOR : undefined }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? '#a78bfa' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
      <AIInsightsPanel moduleId="workflow-builder" />
    </div>
  );
}

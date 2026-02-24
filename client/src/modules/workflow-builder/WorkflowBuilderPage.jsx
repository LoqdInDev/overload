import { useState } from 'react';

const MODULE_COLOR = '#8b5cf6';

const MOCK_WORKFLOWS = [
  { id: 1, name: 'New Order Follow-up', trigger: 'new_order', steps: 5, lastRun: '2 hours ago', status: 'active' },
  { id: 2, name: 'Lead Nurture Sequence', trigger: 'form_submit', steps: 8, lastRun: '30 min ago', status: 'active' },
  { id: 3, name: 'Weekly Report Generator', trigger: 'schedule', steps: 3, lastRun: 'Yesterday', status: 'active' },
  { id: 4, name: 'Abandoned Cart Recovery', trigger: 'webhook', steps: 4, lastRun: '1 hour ago', status: 'active' },
  { id: 5, name: 'Onboarding Drip', trigger: 'form_submit', steps: 6, lastRun: 'Never', status: 'draft' },
  { id: 6, name: 'Re-engagement Campaign', trigger: 'schedule', steps: 4, lastRun: '3 days ago', status: 'paused' },
];

const MOCK_RUNS = [
  { id: 1, workflow: 'New Order Follow-up', status: 'success', started: '2:34 PM', duration: '1.2s' },
  { id: 2, workflow: 'Lead Nurture Sequence', status: 'success', started: '2:15 PM', duration: '3.8s' },
  { id: 3, workflow: 'Abandoned Cart Recovery', status: 'running', started: '2:40 PM', duration: '—' },
  { id: 4, workflow: 'Weekly Report Generator', status: 'success', started: '1:00 PM', duration: '12.4s' },
  { id: 5, workflow: 'New Order Follow-up', status: 'failed', started: '12:22 PM', duration: '0.4s' },
  { id: 6, workflow: 'Lead Nurture Sequence', status: 'success', started: '11:50 AM', duration: '2.1s' },
  { id: 7, workflow: 'Abandoned Cart Recovery', status: 'success', started: '11:30 AM', duration: '1.8s' },
  { id: 8, workflow: 'New Order Follow-up', status: 'success', started: '10:15 AM', duration: '1.1s' },
];

const AI_TEMPLATES = [
  { name: 'Design Workflow', prompt: 'Design a complete marketing automation workflow including triggers, conditions, actions, and delays for maximum conversion' },
  { name: 'Optimize Flow Logic', prompt: 'Analyze and optimize an existing workflow for better performance, fewer steps, and improved conversion rates' },
  { name: 'Error Recovery Plan', prompt: 'Create a comprehensive error handling and recovery strategy for automated marketing workflows' },
  { name: 'Workflow Documentation', prompt: 'Generate detailed documentation for a marketing automation workflow including purpose, steps, conditions, and maintenance notes' },
];

const triggerLabel = (t) => {
  const map = { new_order: 'New Order', form_submit: 'Form Submit', schedule: 'Schedule', webhook: 'Webhook' };
  return map[t] || t;
};

const triggerColor = (t) => {
  const map = { new_order: '#22c55e', form_submit: '#3b82f6', schedule: '#f59e0b', webhook: '#ec4899' };
  return map[t] || '#6b7280';
};

const statusColor = (s) => {
  const map = { active: '#22c55e', draft: '#6b7280', paused: '#f59e0b', success: '#22c55e', failed: '#ef4444', running: '#3b82f6' };
  return map[s] || '#6b7280';
};

export default function WorkflowBuilderPage() {
  const [tab, setTab] = useState('workflows');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/workflow-builder/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>WORKFLOW BUILDER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Automation Workflows</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'ACTIVE WORKFLOWS', value: '6', sub: '2 drafts' },
          { label: 'TOTAL RUNS', value: '1.2K', sub: 'Last 30 days' },
          { label: 'SUCCESS RATE', value: '94%', sub: '+2% vs last month' },
          { label: 'TIME SAVED', value: '48h', sub: 'This month' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {['workflows', 'runs', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Workflows Tab */}
      {tab === 'workflows' && (
        <div className="space-y-3 animate-fade-in">
          {MOCK_WORKFLOWS.map(wf => (
            <div key={wf.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 hover:border-indigo-500/15 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 hidden sm:flex" style={{ background: `${MODULE_COLOR}15`, border: `1px solid ${MODULE_COLOR}20` }}>
                <svg className="w-6 h-6" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-200">{wf.name}</p>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${triggerColor(wf.trigger)}15`, color: triggerColor(wf.trigger), border: `1px solid ${triggerColor(wf.trigger)}25` }}>
                    {triggerLabel(wf.trigger)}
                  </span>
                  <span className="text-xs text-gray-500">{wf.steps} steps</span>
                  <span className="text-xs text-gray-600">Last run: {wf.lastRun}</span>
                </div>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto" style={{ background: `${statusColor(wf.status)}15`, color: statusColor(wf.status), border: `1px solid ${statusColor(wf.status)}25` }}>
                {wf.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Runs Tab */}
      {tab === 'runs' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
            <div className="divide-y divide-indigo-500/[0.04] min-w-[500px]">
              {MOCK_RUNS.map(run => (
                <div key={run.id} className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(run.status), boxShadow: run.status === 'running' ? `0 0 8px ${statusColor(run.status)}` : 'none' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300">{run.workflow}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(run.status)}15`, color: statusColor(run.status), border: `1px solid ${statusColor(run.status)}25` }}>
                    {run.status}
                  </span>
                  <span className="text-xs text-gray-500 w-16 text-right">{run.started}</span>
                  <span className="text-xs text-gray-600 font-mono w-12 text-right">{run.duration}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
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
    </div>
  );
}

import { useState } from 'react';

const MODULE_COLOR = '#3b82f6';

const MOCK_UPCOMING = [
  { id: 1, name: 'Instagram Carousel Post', module: 'Social', action: 'Publish to Instagram', scheduledFor: 'Today, 3:00 PM', frequency: 'once', status: 'scheduled' },
  { id: 2, name: 'Weekly Newsletter', module: 'Email', action: 'Send email campaign', scheduledFor: 'Today, 5:00 PM', frequency: 'weekly', status: 'scheduled' },
  { id: 3, name: 'Blog Post: SEO Tips', module: 'Content', action: 'Publish to blog', scheduledFor: 'Today, 6:30 PM', frequency: 'once', status: 'scheduled' },
  { id: 4, name: 'Facebook Ad Refresh', module: 'Ads', action: 'Update ad creatives', scheduledFor: 'Tomorrow, 9:00 AM', frequency: 'daily', status: 'scheduled' },
  { id: 5, name: 'Twitter Thread', module: 'Social', action: 'Post thread', scheduledFor: 'Tomorrow, 12:00 PM', frequency: 'once', status: 'scheduled' },
  { id: 6, name: 'Performance Report', module: 'Content', action: 'Generate and email report', scheduledFor: 'Fri, 8:00 AM', frequency: 'weekly', status: 'scheduled' },
  { id: 7, name: 'TikTok Video Post', module: 'Social', action: 'Upload and publish', scheduledFor: 'Fri, 2:00 PM', frequency: 'once', status: 'scheduled' },
  { id: 8, name: 'Retargeting Campaign', module: 'Ads', action: 'Launch retargeting ads', scheduledFor: 'Mon, 10:00 AM', frequency: 'once', status: 'scheduled' },
];

const MOCK_HISTORY = [
  { id: 1, name: 'Instagram Story', module: 'Social', action: 'Published story', completedAt: 'Today, 11:00 AM', status: 'completed' },
  { id: 2, name: 'Email Drip Step 3', module: 'Email', action: 'Sent email', completedAt: 'Today, 9:30 AM', status: 'completed' },
  { id: 3, name: 'Google Ads Budget Update', module: 'Ads', action: 'Adjusted budget', completedAt: 'Yesterday, 4:00 PM', status: 'completed' },
  { id: 4, name: 'Blog Post Publish', module: 'Content', action: 'Published article', completedAt: 'Yesterday, 2:00 PM', status: 'completed' },
  { id: 5, name: 'LinkedIn Post', module: 'Social', action: 'Post failed - retry scheduled', completedAt: 'Yesterday, 11:00 AM', status: 'failed' },
  { id: 6, name: 'Weekly Digest Email', module: 'Email', action: 'Sent to 2.4K subscribers', completedAt: '2 days ago', status: 'completed' },
];

const AI_TEMPLATES = [
  { name: 'Optimal Posting Times', prompt: 'Analyze audience behavior and recommend the best times to post across all social media platforms and email for maximum engagement' },
  { name: 'Campaign Schedule Plan', prompt: 'Create a comprehensive multi-channel campaign schedule with optimal timing, frequency, and sequencing for a product launch' },
  { name: 'Content Calendar Generator', prompt: 'Generate a 30-day content calendar with scheduled posts, emails, and ads across all marketing channels' },
  { name: 'Send Time Optimization', prompt: 'Optimize email and notification send times based on audience time zones, open rates, and engagement patterns' },
];

const moduleColor = (m) => {
  const map = { Social: '#3b82f6', Email: '#f59e0b', Ads: '#10b981', Content: '#f97316' };
  return map[m] || '#6b7280';
};

const frequencyLabel = (f) => {
  const map = { once: 'One-time', daily: 'Daily', weekly: 'Weekly' };
  return map[f] || f;
};

export default function SchedulerPage() {
  const [tab, setTab] = useState('upcoming');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/scheduler/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>SCHEDULER</p>
        <h1 className="text-2xl font-bold text-white mb-1">Task Scheduler</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'SCHEDULED', value: '18', sub: 'Across all modules' },
          { label: "TODAY'S TASKS", value: '5', sub: '3 remaining' },
          { label: 'COMPLETED', value: '142', sub: 'Last 30 days' },
          { label: 'UPCOMING', value: '12', sub: 'Next 7 days' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4">
            <p className="hud-label mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {['upcoming', 'history', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Upcoming Tab */}
      {tab === 'upcoming' && (
        <div className="space-y-2 animate-fade-in">
          {MOCK_UPCOMING.map(task => (
            <div key={task.id} className="panel rounded-xl p-4 flex items-center gap-4 hover:border-indigo-500/15 transition-all">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${moduleColor(task.module)}15`, border: `1px solid ${moduleColor(task.module)}20` }}>
                <svg className="w-5 h-5" style={{ color: moduleColor(task.module) }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200">{task.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor(task.module)}15`, color: moduleColor(task.module), border: `1px solid ${moduleColor(task.module)}25` }}>
                    {task.module}
                  </span>
                  <span className="text-[10px] text-gray-500">{task.action}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-gray-300">{task.scheduledFor}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{frequencyLabel(task.frequency)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="animate-fade-in">
          <div className="panel rounded-xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_HISTORY.map(task => (
                <div key={task.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.status === 'completed' ? '#22c55e' : '#ef4444' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-300">{task.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{task.action}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor(task.module)}15`, color: moduleColor(task.module), border: `1px solid ${moduleColor(task.module)}25` }}>
                    {task.module}
                  </span>
                  <span className="text-[10px] text-gray-500 w-32 text-right">{task.completedAt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-blue-500/20' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? MODULE_COLOR : undefined }} />
                <span className="hud-label" style={{ color: generating ? '#60a5fa' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

const MODULE_COLOR = '#f97316';

const AI_TEMPLATES = [
  { name: 'Generate Auto-Response', prompt: 'Create intelligent auto-response templates for common support tickets including acknowledgment, troubleshooting steps, and escalation triggers' },
  { name: 'Create FAQ Entry', prompt: 'Write a comprehensive FAQ entry with a clear question, detailed answer, related links, and troubleshooting steps for common customer issues' },
  { name: 'Write Escalation Template', prompt: 'Draft professional escalation email templates for different severity levels including context summary, impact assessment, and resolution timeline' },
  { name: 'Draft Customer Survey', prompt: 'Design a post-support customer satisfaction survey with NPS question, experience rating, and open-ended feedback prompts' },
];

const MOCK_TICKETS = [
  { id: 'TK-2847', subject: 'Unable to process payment', customer: 'John Miller', priority: 'critical', status: 'open', created: '15 min ago', assignee: 'Sarah K.' },
  { id: 'TK-2846', subject: 'Feature request: Export to CSV', customer: 'Lisa Park', priority: 'low', status: 'open', created: '1 hour ago', assignee: 'Unassigned' },
  { id: 'TK-2845', subject: 'Dashboard loading slowly', customer: 'Mike Chen', priority: 'high', status: 'in-progress', created: '2 hours ago', assignee: 'David R.' },
  { id: 'TK-2844', subject: 'Account access issue after password reset', customer: 'Emma Wilson', priority: 'high', status: 'in-progress', created: '3 hours ago', assignee: 'Sarah K.' },
  { id: 'TK-2843', subject: 'Billing discrepancy on invoice #4521', customer: 'Alex Thompson', priority: 'medium', status: 'waiting', created: '5 hours ago', assignee: 'Maria L.' },
  { id: 'TK-2842', subject: 'Integration webhook not firing', customer: 'Jordan Lee', priority: 'medium', status: 'open', created: '6 hours ago', assignee: 'David R.' },
  { id: 'TK-2841', subject: 'How to set up automated reports?', customer: 'Rachel Kim', priority: 'low', status: 'resolved', created: '1 day ago', assignee: 'Sarah K.' },
  { id: 'TK-2840', subject: 'API rate limit exceeded', customer: 'Tom Brown', priority: 'high', status: 'resolved', created: '1 day ago', assignee: 'David R.' },
];

const MOCK_TEMPLATES_LIST = [
  { id: 1, name: 'Welcome Response', category: 'General', usage: 342, lastUsed: '2 hours ago', snippet: 'Thank you for reaching out! We have received your request and...' },
  { id: 2, name: 'Password Reset Guide', category: 'Account', usage: 218, lastUsed: '4 hours ago', snippet: 'To reset your password, please follow these steps: 1. Go to...' },
  { id: 3, name: 'Billing Inquiry', category: 'Billing', usage: 156, lastUsed: '1 day ago', snippet: 'We understand your concern about the billing issue. Let me look into...' },
  { id: 4, name: 'Feature Request Acknowledgment', category: 'Product', usage: 98, lastUsed: '2 days ago', snippet: 'Thank you for your feature suggestion! We value your input and have...' },
  { id: 5, name: 'Escalation Notice', category: 'Internal', usage: 45, lastUsed: '3 days ago', snippet: 'This ticket has been escalated to our senior team. Expected resolution...' },
  { id: 6, name: 'Resolution Confirmation', category: 'General', usage: 289, lastUsed: '1 hour ago', snippet: 'Great news! The issue you reported has been resolved. Here is a summary...' },
];

export default function SupportCenterPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/support-center/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const priorityColor = (p) => p === 'critical' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#f59e0b' : '#6b7280';
  const statusColor = (s) => s === 'open' ? '#3b82f6' : s === 'in-progress' ? '#f59e0b' : s === 'waiting' ? '#8b5cf6' : '#22c55e';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>SUPPORT CENTER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Customer Support Hub</h1>
        <p className="text-base text-gray-500">Manage tickets, templates, and AI-powered responses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'OPEN TICKETS', value: '24', sub: '3 critical priority' },
          { label: 'RESOLVED TODAY', value: '18', sub: '75% resolution rate' },
          { label: 'AVG RESPONSE TIME', value: '14m', sub: '-3m vs last week' },
          { label: 'SATISFACTION', value: '94%', sub: 'Based on 847 ratings' },
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
        {['overview', 'tickets', 'templates', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>TICKETS BY PRIORITY</p>
              <div className="space-y-4">
                {[
                  { priority: 'Critical', count: 3, pct: 12 },
                  { priority: 'High', count: 7, pct: 29 },
                  { priority: 'Medium', count: 8, pct: 33 },
                  { priority: 'Low', count: 6, pct: 25 },
                ].map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: priorityColor(p.priority.toLowerCase()) }}>{p.priority}</span>
                      <span className="text-gray-500 font-mono">{p.count} tickets ({p.pct}%)</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: priorityColor(p.priority.toLowerCase()) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>AGENT PERFORMANCE</p>
              <div className="space-y-3">
                {[
                  { name: 'Sarah K.', resolved: 8, avgTime: '11m', satisfaction: '97%' },
                  { name: 'David R.', resolved: 6, avgTime: '16m', satisfaction: '92%' },
                  { name: 'Maria L.', resolved: 4, avgTime: '19m', satisfaction: '95%' },
                ].map((agent, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-2 sm:py-1.5 border-b border-indigo-500/[0.04] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: `${MODULE_COLOR}15`, color: MODULE_COLOR }}>
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-gray-300">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:ml-0 ml-10">
                      <span className="font-mono text-gray-400">{agent.resolved} resolved</span>
                      <span className="font-mono text-gray-500">{agent.avgTime} avg</span>
                      <span className="font-mono text-green-400">{agent.satisfaction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>TICKET VOLUME (LAST 7 DAYS)</p>
            <div className="flex items-end gap-1.5 sm:gap-3 h-24">
              {[18, 24, 31, 22, 28, 19, 24].map((v, i) => {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t" style={{ height: `${(v / 31) * 80}px`, background: `${MODULE_COLOR}${i === 6 ? '' : '60'}` }} />
                    <span className="text-[9px] text-gray-600">{days[i]}</span>
                    <span className="text-[9px] text-gray-500 font-mono">{v}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tickets */}
      {tab === 'tickets' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_TICKETS.map(t => (
                <div key={t.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-mono text-gray-500">{t.id}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${priorityColor(t.priority)}15`, color: priorityColor(t.priority), border: `1px solid ${priorityColor(t.priority)}25` }}>
                        {t.priority}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(t.status)}15`, color: statusColor(t.status), border: `1px solid ${statusColor(t.status)}25` }}>
                        {t.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">{t.created}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-300">{t.subject}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-1 text-xs text-gray-500">
                    <span>{t.customer}</span>
                    <span>&middot;</span>
                    <span>{t.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          {MOCK_TEMPLATES_LIST.map(tmpl => (
            <div key={tmpl.id} className="panel rounded-2xl p-4 sm:p-6 hover:border-orange-500/20 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-base font-bold text-gray-200">{tmpl.name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.03] text-gray-500 border border-white/[0.04]">{tmpl.category}</span>
                </div>
                <span className="text-xs text-gray-600">Used {tmpl.usage}x</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">{tmpl.snippet}</p>
              <p className="text-xs text-gray-600 mt-2">Last used: {tmpl.lastUsed}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-orange-500/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

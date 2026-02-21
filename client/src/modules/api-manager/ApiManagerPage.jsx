import { useState } from 'react';

const MOCK_KEYS = [
  { id: 1, name: 'Production Key', key: 'sk-prod...8f2x', requests: '8,420', status: 'active', created: 'Jan 15, 2026' },
  { id: 2, name: 'Staging Key', key: 'sk-stag...3k9m', requests: '3,210', status: 'active', created: 'Feb 1, 2026' },
  { id: 3, name: 'Development Key', key: 'sk-dev...7j4n', requests: '812', status: 'active', created: 'Feb 10, 2026' },
];

const MOCK_LOGS = [
  { endpoint: '/api/campaigns', method: 'GET', status: 200, time: '89ms', timestamp: '2 min ago' },
  { endpoint: '/api/audiences/create', method: 'POST', status: 201, time: '145ms', timestamp: '5 min ago' },
  { endpoint: '/api/analytics/report', method: 'GET', status: 200, time: '210ms', timestamp: '8 min ago' },
  { endpoint: '/api/content/generate', method: 'POST', status: 200, time: '1,240ms', timestamp: '12 min ago' },
  { endpoint: '/api/webhooks', method: 'GET', status: 200, time: '52ms', timestamp: '15 min ago' },
  { endpoint: '/api/integrations/sync', method: 'POST', status: 200, time: '320ms', timestamp: '18 min ago' },
  { endpoint: '/api/campaigns/123', method: 'PUT', status: 200, time: '98ms', timestamp: '22 min ago' },
  { endpoint: '/api/users/me', method: 'GET', status: 401, time: '12ms', timestamp: '25 min ago' },
];

const AI_TEMPLATES = [
  { name: 'Generate API Documentation', prompt: 'Generate comprehensive API documentation with endpoint descriptions, request/response examples, and authentication details' },
  { name: 'Rate Limit Strategy', prompt: 'Design an API rate limiting strategy with tiered limits, burst handling, and quota management recommendations' },
  { name: 'API Security Audit', prompt: 'Perform an API security audit covering authentication, authorization, input validation, and data exposure risks' },
  { name: 'Integration Code Samples', prompt: 'Generate code samples for API integration in multiple languages including JavaScript, Python, and cURL examples' },
];

export default function ApiManagerPage() {
  const [tab, setTab] = useState('keys');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/api-manager/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const methodColors = { GET: 'text-emerald-400 bg-emerald-500/10', POST: 'text-blue-400 bg-blue-500/10', PUT: 'text-yellow-400 bg-yellow-500/10', DELETE: 'text-red-400 bg-red-500/10' };
  const statusColor = (s) => s >= 200 && s < 300 ? 'text-emerald-400' : s >= 400 ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#0ea5e9' }}>API MANAGER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">API Manager</h1><p className="text-base text-gray-500">Manage API keys, monitor usage, and review request logs</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'ACTIVE KEYS', v: '3' }, { l: 'TOTAL REQUESTS', v: '12.4K' }, { l: 'AVG RESPONSE', v: '120ms' }, { l: 'RATE LIMIT USAGE', v: '34%' }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex gap-1 mb-6">
        {['keys', 'logs', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'keys' && (<div className="space-y-3 animate-fade-in">{MOCK_KEYS.map(k => (<div key={k.id} className="panel rounded-2xl p-4 sm:p-6 flex items-center gap-4 sm:gap-6"><div className="w-12 h-12 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg></div><div className="flex-1 min-w-0"><p className="text-base font-semibold text-gray-200">{k.name}</p><p className="text-xs text-gray-500 font-mono mt-0.5">{k.key}</p></div><div className="text-right"><p className="text-sm font-bold text-sky-400 font-mono">{k.requests}</p><p className="text-xs text-gray-500">requests</p></div><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{k.status}</span></div>))}</div>)}
      {tab === 'logs' && (<div className="panel rounded-2xl overflow-hidden animate-fade-in"><div className="divide-y divide-indigo-500/[0.04]"><div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 text-xs text-gray-500 font-semibold uppercase"><span className="w-14">Method</span><span className="flex-1">Endpoint</span><span className="w-12 text-right">Status</span><span className="w-16 text-right">Time</span><span className="w-20 text-right">When</span></div>{MOCK_LOGS.map((l, i) => (<div key={i} className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 hover:bg-white/[0.01] transition-colors"><span className={`w-14 text-[10px] font-bold px-1.5 py-0.5 rounded text-center ${methodColors[l.method]}`}>{l.method}</span><span className="flex-1 text-sm text-gray-300 font-mono truncate">{l.endpoint}</span><span className={`w-12 text-right text-sm font-bold font-mono ${statusColor(l.status)}`}>{l.status}</span><span className="w-16 text-right text-xs text-gray-500 font-mono">{l.time}</span><span className="w-20 text-right text-xs text-gray-500">{l.timestamp}</span></div>))}</div></div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-sky-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-3 mb-4"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-sky-400 animate-pulse' : 'bg-sky-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#38bdf8' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}

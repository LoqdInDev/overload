import { useState } from 'react';

const MOCK_WEBHOOKS = [
  { id: 1, name: 'Order Created', url: 'https://api.ex...e/orders', events: ['order.created', 'order.updated'], status: 'active', lastTriggered: '2 min ago' },
  { id: 2, name: 'Payment Received', url: 'https://pay.ex...k/notify', events: ['payment.completed'], status: 'active', lastTriggered: '8 min ago' },
  { id: 3, name: 'User Signup', url: 'https://crm.ex...m/signup', events: ['user.created', 'user.verified'], status: 'active', lastTriggered: '15 min ago' },
  { id: 4, name: 'Campaign Update', url: 'https://mkt.ex...ampaigns', events: ['campaign.started', 'campaign.paused', 'campaign.ended'], status: 'active', lastTriggered: '1 hr ago' },
  { id: 5, name: 'Inventory Alert', url: 'https://ops.ex...nventory', events: ['inventory.low'], status: 'paused', lastTriggered: '3 hrs ago' },
];

const MOCK_LOGS = [
  { webhook: 'Order Created', event: 'order.created', status: 200, latency: '32ms', timestamp: '2 min ago' },
  { webhook: 'Payment Received', event: 'payment.completed', status: 200, latency: '45ms', timestamp: '8 min ago' },
  { webhook: 'User Signup', event: 'user.created', status: 200, latency: '28ms', timestamp: '15 min ago' },
  { webhook: 'Order Created', event: 'order.updated', status: 200, latency: '51ms', timestamp: '22 min ago' },
  { webhook: 'Campaign Update', event: 'campaign.started', status: 200, latency: '67ms', timestamp: '1 hr ago' },
  { webhook: 'Order Created', event: 'order.created', status: 500, latency: '1,200ms', timestamp: '2 hrs ago' },
  { webhook: 'User Signup', event: 'user.verified', status: 200, latency: '38ms', timestamp: '3 hrs ago' },
];

const AI_TEMPLATES = [
  { name: 'Webhook Setup Guide', prompt: 'Create a comprehensive webhook setup guide with endpoint configuration, authentication, and payload format examples' },
  { name: 'Event Flow Design', prompt: 'Design an event-driven architecture with webhook flows for key business events and recommended payload structures' },
  { name: 'Error Handling Strategy', prompt: 'Develop a webhook error handling strategy with retry logic, dead letter queues, and alerting thresholds' },
  { name: 'Webhook Testing Plan', prompt: 'Create a testing plan for webhook endpoints including payload validation, failure scenarios, and load testing approach' },
];

export default function WebhooksPage() {
  const [tab, setTab] = useState('webhooks');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/webhooks/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const statusColor = (s) => s >= 200 && s < 300 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#f97316' }}>WEBHOOKS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Webhooks</h1><p className="text-base text-gray-500">Manage event hooks, monitor deliveries, and track performance</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'ACTIVE HOOKS', v: '5' }, { l: 'EVENTS TODAY', v: '89' }, { l: 'SUCCESS RATE', v: '99.2%' }, { l: 'AVG LATENCY', v: '45ms' }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex gap-1 mb-6">
        {['webhooks', 'logs', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'webhooks' && (<div className="space-y-3 animate-fade-in">{MOCK_WEBHOOKS.map(w => (<div key={w.id} className="panel rounded-2xl p-4 sm:p-6"><div className="flex items-center gap-4 sm:gap-6 mb-3"><div className="flex-1"><p className="text-base font-semibold text-gray-200">{w.name}</p><p className="text-xs text-gray-500 font-mono mt-0.5">{w.url}</p></div><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${w.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{w.status}</span></div><div className="flex items-center gap-3 flex-wrap"><span className="text-xs text-gray-500">Last: {w.lastTriggered}</span><span className="text-xs text-gray-600">&bull;</span>{w.events.map((e, i) => (<span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/15">{e}</span>))}</div></div>))}</div>)}
      {tab === 'logs' && (<div className="panel rounded-2xl overflow-hidden animate-fade-in"><div className="divide-y divide-indigo-500/[0.04]"><div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 text-xs text-gray-500 font-semibold uppercase"><span className="flex-1">Webhook</span><span className="w-32">Event</span><span className="w-12 text-right">Status</span><span className="w-16 text-right">Latency</span><span className="w-20 text-right">When</span></div>{MOCK_LOGS.map((l, i) => (<div key={i} className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 hover:bg-white/[0.01] transition-colors"><span className="flex-1 text-sm font-semibold text-gray-300">{l.webhook}</span><span className="w-32 text-xs text-gray-500 font-mono">{l.event}</span><span className={`w-12 text-right text-sm font-bold font-mono ${statusColor(l.status)}`}>{l.status}</span><span className="w-16 text-right text-xs text-gray-500 font-mono">{l.latency}</span><span className="w-20 text-right text-xs text-gray-500">{l.timestamp}</span></div>))}</div></div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-orange-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-3 mb-4"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-orange-400 animate-pulse' : 'bg-orange-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#fb923c' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-orange-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}

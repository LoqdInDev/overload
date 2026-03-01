import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const AI_TEMPLATES = [
  { name: 'Webhook Setup Guide', prompt: 'Create a comprehensive webhook setup guide with endpoint configuration, authentication, and payload format examples' },
  { name: 'Event Flow Design', prompt: 'Design an event-driven architecture with webhook flows for key business events and recommended payload structures' },
  { name: 'Error Handling Strategy', prompt: 'Develop a webhook error handling strategy with retry logic, dead letter queues, and alerting thresholds' },
  { name: 'Webhook Testing Plan', prompt: 'Create a testing plan for webhook endpoints including payload validation, failure scenarios, and load testing approach' },
];

function parseEvents(events) {
  if (Array.isArray(events)) return events;
  if (typeof events === 'string') {
    try { return JSON.parse(events); } catch { return [events]; }
  }
  return [];
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default function WebhooksPage() {
  usePageTitle('Webhook Center');
  const [tab, setTab] = useState('webhooks');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create webhook form state
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, logRes] = await Promise.all([
        fetchJSON('/api/webhooks/webhooks'),
        fetchJSON('/api/webhooks/logs'),
      ]);
      setWebhooks(Array.isArray(whRes?.data) ? whRes.data : Array.isArray(whRes) ? whRes : []);
      setLogs(Array.isArray(logRes?.data) ? logRes.data : Array.isArray(logRes) ? logRes : []);
    } catch (e) {
      console.error('Failed to load webhooks data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Compute stats from real data
  const activeHooks = webhooks.filter(w => w.status === 'active').length;
  const totalLogs = logs.length;
  const successLogs = logs.filter(l => l.status_code >= 200 && l.status_code < 300).length;
  const successRate = totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(1) + '%' : '0%';
  const avgLatency = totalLogs > 0
    ? Math.round(logs.reduce((a, l) => a + (parseFloat(l.response_time) || 0), 0) / totalLogs) + 'ms'
    : '0ms';

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await postJSON('/api/webhooks/webhooks', {
        name: newName,
        url: newUrl,
        events: newEvents.split(',').map(s => s.trim()).filter(Boolean),
        secret: newSecret,
      });
      setNewName(''); setNewUrl(''); setNewEvents(''); setNewSecret('');
      await loadData();
    } catch (err) {
      console.error('Failed to create webhook:', err);
    } finally {
      setCreating(false);
    }
  };

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/webhooks/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const statusColor = (s) => s >= 200 && s < 300 ? 'text-emerald-400' : 'text-red-400';

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#f97316' }}>WEBHOOKS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Webhooks</h1><p className="text-base text-gray-500">Manage event hooks, monitor deliveries, and track performance</p></div>
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#f97316' }}>WEBHOOKS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Webhooks</h1><p className="text-base text-gray-500">Manage event hooks, monitor deliveries, and track performance</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'ACTIVE HOOKS', v: String(activeHooks) }, { l: 'TOTAL DELIVERIES', v: String(totalLogs) }, { l: 'SUCCESS RATE', v: successRate }, { l: 'AVG LATENCY', v: avgLatency }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['webhooks', 'logs', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'webhooks' && (<div className="space-y-3 animate-fade-in">
        {/* Create Webhook Form */}
        <div className="panel rounded-2xl p-4 sm:p-6">
          <p className="hud-label text-[11px] mb-3" style={{ color: '#f97316' }}>CREATE WEBHOOK</p>
          <form onSubmit={handleCreateWebhook} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Webhook name" value={newName} onChange={e => setNewName(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/30" />
            <input type="url" placeholder="Endpoint URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/30" />
            <input type="text" placeholder="Events (comma-separated)" value={newEvents} onChange={e => setNewEvents(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/30" />
            <input type="text" placeholder="Secret (optional)" value={newSecret} onChange={e => setNewSecret(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/30" />
            <div className="sm:col-span-2">
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: creating ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.6)' }}>
                {creating ? 'Creating...' : 'Create Webhook'}
              </button>
            </div>
          </form>
        </div>

        {/* Webhooks List */}
        {webhooks.length === 0 ? (
          <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No webhooks configured yet. Create one above to get started.</p></div>
        ) : (
          webhooks.map(w => {
            const events = parseEvents(w.events);
            return (
              <div key={w.id} className="panel rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-4 sm:gap-6 mb-3">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-gray-200">{w.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{w.url}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${w.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{w.status}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">Created: {formatRelativeTime(w.created_at)}</span>
                  <span className="text-xs text-gray-600">&bull;</span>
                  {events.map((e, i) => (<span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/15">{e}</span>))}
                </div>
              </div>
            );
          })
        )}
      </div>)}
      {tab === 'logs' && (<div className="panel rounded-2xl overflow-hidden animate-fade-in">
        {logs.length === 0 ? (
          <div className="p-8 text-center"><p className="text-gray-500 text-sm">No delivery logs yet.</p></div>
        ) : (
          <div className="overflow-x-auto"><div className="divide-y divide-indigo-500/[0.04] min-w-[600px]"><div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 text-xs text-gray-500 font-semibold uppercase"><span className="flex-1">Webhook</span><span className="w-32">Event</span><span className="w-12 text-right">Status</span><span className="w-16 text-right">Latency</span><span className="w-20 text-right">When</span></div>{logs.map((l, i) => {
            const webhookName = webhooks.find(w => w.id === l.webhook_id)?.name || `Webhook #${l.webhook_id}`;
            return (
              <div key={i} className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 hover:bg-white/[0.01] transition-colors">
                <span className="flex-1 text-sm font-semibold text-gray-300">{webhookName}</span>
                <span className="w-32 text-xs text-gray-500 font-mono">{l.event}</span>
                <span className={`w-12 text-right text-sm font-bold font-mono ${statusColor(l.status_code)}`}>{l.status_code}</span>
                <span className="w-16 text-right text-xs text-gray-500 font-mono">{l.response_time != null ? l.response_time + 'ms' : '—'}</span>
                <span className="w-20 text-right text-xs text-gray-500">{formatRelativeTime(l.created_at)}</span>
              </div>
            );
          })}</div></div>
        )}
      </div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-orange-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-3 mb-4"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-orange-400 animate-pulse' : 'bg-orange-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#fb923c' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-orange-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
      <AIInsightsPanel moduleId="webhooks" />
    </div>
  );
}

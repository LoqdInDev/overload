import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const AI_TEMPLATES = [
  { name: 'Generate API Documentation', prompt: 'Generate comprehensive API documentation with endpoint descriptions, request/response examples, and authentication details' },
  { name: 'Rate Limit Strategy', prompt: 'Design an API rate limiting strategy with tiered limits, burst handling, and quota management recommendations' },
  { name: 'API Security Audit', prompt: 'Perform an API security audit covering authentication, authorization, input validation, and data exposure risks' },
  { name: 'Integration Code Samples', prompt: 'Generate code samples for API integration in multiple languages including JavaScript, Python, and cURL examples' },
];

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

function maskKeyHash(hash) {
  if (!hash) return '••••••••';
  if (hash.length <= 8) return hash.slice(0, 2) + '•••' + hash.slice(-2);
  return hash.slice(0, 6) + '••••••' + hash.slice(-4);
}

export default function ApiManagerPage() {
  usePageTitle('API Manager');
  const [tab, setTab] = useState('keys');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create key form state
  const [newName, setNewName] = useState('');
  const [newKeyHash, setNewKeyHash] = useState('');
  const [newPermissions, setNewPermissions] = useState('');
  const [newRateLimit, setNewRateLimit] = useState('100');
  const [creating, setCreating] = useState(false);

  // Generate Docs state
  const [docsApiName, setDocsApiName] = useState('');
  const [docsBaseUrl, setDocsBaseUrl] = useState('');
  const [docsOutput, setDocsOutput] = useState('');
  const [docsLoading, setDocsLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysRes, logsRes] = await Promise.all([
        fetchJSON('/api/api-manager/keys'),
        fetchJSON('/api/api-manager/logs'),
      ]);
      setKeys(Array.isArray(keysRes?.data) ? keysRes.data : Array.isArray(keysRes) ? keysRes : []);
      setLogs(Array.isArray(logsRes?.data) ? logsRes.data : Array.isArray(logsRes) ? logsRes : []);
    } catch (e) {
      console.error('Failed to load API Manager data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Compute stats from real data
  const activeKeys = keys.filter(k => k.status === 'active').length;
  const totalRequests = keys.reduce((sum, k) => sum + (k.usage_count || 0), 0);
  const totalRequestsDisplay = totalRequests >= 1000 ? (totalRequests / 1000).toFixed(1) + 'K' : String(totalRequests);
  const avgResponse = logs.length > 0
    ? Math.round(logs.reduce((a, l) => a + (parseFloat(l.response_time) || 0), 0) / logs.length) + 'ms'
    : '0ms';
  const maxRateLimit = Math.max(...keys.map(k => k.rate_limit || 100), 1);
  const maxUsage = Math.max(...keys.map(k => k.usage_count || 0), 0);
  const rateLimitPct = maxRateLimit > 0 ? Math.round((maxUsage / maxRateLimit) * 100) + '%' : '0%';

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const permissions = newPermissions
        ? newPermissions.split(',').map(s => s.trim()).filter(Boolean)
        : null;
      await postJSON('/api/api-manager/keys', {
        name: newName,
        key_hash: newKeyHash,
        permissions,
        rate_limit: parseInt(newRateLimit) || 100,
      });
      setNewName(''); setNewKeyHash(''); setNewPermissions(''); setNewRateLimit('100');
      await loadData();
    } catch (err) {
      console.error('Failed to create API key:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      await deleteJSON(`/api/api-manager/keys/${id}`);
      await loadData();
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/api-manager/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const methodColors = { GET: 'text-emerald-400 bg-emerald-500/10', POST: 'text-blue-400 bg-blue-500/10', PUT: 'text-yellow-400 bg-yellow-500/10', DELETE: 'text-red-400 bg-red-500/10' };
  const statusColor = (s) => s >= 200 && s < 300 ? 'text-emerald-400' : s >= 400 ? 'text-red-400' : 'text-yellow-400';

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#0ea5e9' }}>API MANAGER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">API Manager</h1><p className="text-base text-gray-500">Manage API keys, monitor usage, and review request logs</p></div>
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8 animate-fade-in"><div><p className="hud-label text-[11px] mb-2" style={{ color: '#0ea5e9' }}>API MANAGER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">API Manager</h1><p className="text-base text-gray-500">Manage API keys, monitor usage, and review request logs</p></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'ACTIVE KEYS', v: String(activeKeys) }, { l: 'TOTAL REQUESTS', v: totalRequestsDisplay }, { l: 'AVG RESPONSE', v: avgResponse }, { l: 'RATE LIMIT USAGE', v: rateLimitPct }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['keys', 'logs', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'keys' && (<div className="space-y-3 animate-fade-in">
        {/* Create API Key Form */}
        <div className="panel rounded-2xl p-4 sm:p-6">
          <p className="hud-label text-[11px] mb-3" style={{ color: '#0ea5e9' }}>+ ADD KEY</p>
          <form onSubmit={handleCreateKey} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Key name" value={newName} onChange={e => setNewName(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/30" />
            <input type="text" placeholder="Key hash / token" value={newKeyHash} onChange={e => setNewKeyHash(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/30" />
            <input type="text" placeholder="Permissions (comma-separated)" value={newPermissions} onChange={e => setNewPermissions(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/30" />
            <input type="number" placeholder="Rate limit (default 100)" value={newRateLimit} onChange={e => setNewRateLimit(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/30" />
            <div className="sm:col-span-2">
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: creating ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.6)' }}>
                {creating ? 'Creating...' : '+ Add Key'}
              </button>
            </div>
          </form>
        </div>

        {/* Generate API Docs Panel */}
        <div className="panel rounded-2xl p-4 sm:p-6">
          <p className="hud-label text-[11px] mb-3" style={{ color: '#0ea5e9' }}>GENERATE API DOCUMENTATION</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="API name (e.g. Payments API)"
              value={docsApiName}
              onChange={e => setDocsApiName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/30"
            />
            <input
              type="text"
              placeholder="Base URL (e.g. https://api.example.com)"
              value={docsBaseUrl}
              onChange={e => setDocsBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500/30"
            />
          </div>
          <button
            disabled={docsLoading || !docsApiName.trim()}
            onClick={() => {
              setDocsLoading(true);
              setDocsOutput('');
              connectSSE('/api/api-manager/generate-docs', { api_name: docsApiName, base_url: docsBaseUrl, keys }, {
                onChunk: (text) => setDocsOutput(p => p + text),
                onResult: (data) => { setDocsOutput(data.content); setDocsLoading(false); },
                onError: () => setDocsLoading(false),
                onDone: () => setDocsLoading(false),
              });
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: docsLoading ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.6)' }}
          >
            {docsLoading ? 'Generating...' : 'Generate Docs'}
          </button>
          {docsOutput && (
            <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{docsOutput}{docsLoading && <span className="inline-block w-1 h-3.5 bg-sky-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          )}
        </div>

        {/* Keys List */}
        {keys.length === 0 ? (
          <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No API keys yet. Create one above to get started.</p></div>
        ) : (
          keys.map(k => (
            <div key={k.id} className="group panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-200">{k.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{maskKeyHash(k.key_hash)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 sm:ml-auto">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-sky-400 font-mono">{k.usage_count || 0}</p>
                  <p className="text-xs text-gray-500">requests</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-gray-500">limit: <span className="text-gray-400 font-mono">{k.rate_limit}</span></p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{k.status}</span>
                <span className="text-xs text-gray-600">{formatRelativeTime(k.created_at)}</span>
                <button onClick={() => handleDeleteKey(k.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-500/10" title="Delete key">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>)}
      {tab === 'logs' && (<div className="panel rounded-2xl overflow-hidden animate-fade-in">
        {logs.length === 0 ? (
          <div className="p-8 text-center"><p className="text-gray-500 text-sm">No API logs recorded yet.</p></div>
        ) : (
          <div className="overflow-x-auto"><div className="min-w-[480px] divide-y divide-indigo-500/[0.04]"><div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 text-xs text-gray-500 font-semibold uppercase"><span className="w-14">Method</span><span className="flex-1">Endpoint</span><span className="w-20">Key</span><span className="w-12 text-right">Status</span><span className="w-16 text-right">Time</span><span className="w-20 text-right">When</span></div>{logs.map((l, i) => {
            const keyName = keys.find(k => k.id === l.key_id)?.name || `Key #${l.key_id}`;
            return (
              <div key={i} className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 hover:bg-white/[0.01] transition-colors">
                <span className={`w-14 text-[10px] font-bold px-1.5 py-0.5 rounded text-center flex-shrink-0 ${methodColors[l.method] || 'text-gray-400 bg-gray-500/10'}`}>{l.method}</span>
                <span className="flex-1 text-sm text-gray-300 font-mono truncate">{l.endpoint}</span>
                <span className="w-20 text-xs text-gray-500 truncate">{keyName}</span>
                <span className={`w-12 text-right text-sm font-bold font-mono flex-shrink-0 ${statusColor(l.status_code)}`}>{l.status_code}</span>
                <span className="w-16 text-right text-xs text-gray-500 font-mono flex-shrink-0">{l.response_time != null ? l.response_time + 'ms' : '—'}</span>
                <span className="w-20 text-right text-xs text-gray-500 flex-shrink-0">{formatRelativeTime(l.created_at)}</span>
              </div>
            );
          })}</div></div>
        )}
      </div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-sky-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-3 mb-4"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-sky-400 animate-pulse' : 'bg-sky-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#38bdf8' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
      <AIInsightsPanel moduleId="api-manager" />
    </div>
  );
}

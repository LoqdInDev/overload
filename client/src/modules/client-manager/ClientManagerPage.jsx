import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, connectSSE } from '../../lib/api';

const MODULE_COLOR = '#64748b';

const AI_TEMPLATES = [
  { name: 'Client Onboarding Plan', prompt: 'Create a comprehensive client onboarding plan with milestones, deliverables, and communication touchpoints for the first 90 days' },
  { name: 'Proposal Template', prompt: 'Generate a professional project proposal template with scope definition, timeline, pricing structure, and terms of engagement' },
  { name: 'Client Health Report', prompt: 'Design a client health report template covering project status, satisfaction metrics, risk indicators, and recommended actions' },
  { name: 'Retention Strategy', prompt: 'Develop a client retention strategy with proactive engagement tactics, upsell opportunities, and churn prevention measures' },
];

function parseModules(modules) {
  if (Array.isArray(modules)) return modules;
  if (typeof modules === 'string') {
    try { return JSON.parse(modules); } catch { return modules.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ClientManagerPage() {
  usePageTitle('Client Manager');
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        fetchJSON('/api/client-manager/'),
        fetchJSON('/api/client-manager/projects/list'),
      ]);
      setClients(Array.isArray(clientsRes) ? clientsRes : clientsRes.data || []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : projectsRes.data || []);
    } catch (e) {
      console.error('Failed to load client manager data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const clientStatusColor = (s) => s === 'active' ? '#22c55e' : s === 'paused' ? '#f59e0b' : '#ef4444';
  const projectStatusColor = (s) => s === 'active' ? '#3b82f6' : s === 'completed' ? '#22c55e' : '#f59e0b';
  const moduleTagColor = (m) => {
    const colors = { Ads: '#10b981', Content: '#f97316', Social: '#ec4899', SEO: '#8b5cf6', Email: '#3b82f6', 'Website Builder': '#06b6d4', CRM: '#6366f1', Calendar: '#f59e0b', PR: '#be185d', Analytics: '#14b8a6', Reports: '#64748b', Workflows: '#a855f7' };
    return colors[m] || MODULE_COLOR;
  };

  // Compute stats from real data
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  // Count projects per client
  const projectCountByClientId = {};
  projects.forEach(p => {
    projectCountByClientId[p.client_id] = (projectCountByClientId[p.client_id] || 0) + 1;
  });

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/client-manager/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>CLIENT MANAGER</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Client Management</h1>
          <p className="text-base text-gray-500">Manage clients, projects, and deliverables</p>
        </div>
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>CLIENT MANAGER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Client Management</h1>
        <p className="text-base text-gray-500">Manage clients, projects, and deliverables</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'ACTIVE CLIENTS', value: String(activeClients), sub: `${clients.length} total` },
          { label: 'TOTAL PROJECTS', value: String(totalProjects), sub: `${activeProjects} in progress` },
          { label: 'COMPLETED', value: String(completedProjects), sub: `of ${totalProjects} projects` },
          { label: 'PAUSED CLIENTS', value: String(clients.filter(c => c.status === 'paused').length), sub: `${clients.filter(c => c.status === 'churned').length} churned` },
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
        {['overview', 'clients', 'projects', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>TOP CLIENTS BY PROJECTS</p>
              <div className="space-y-3">
                {clients.length === 0 ? (
                  <p className="text-sm text-gray-500">No clients yet.</p>
                ) : (
                  [...clients].sort((a, b) => (projectCountByClientId[b.id] || 0) - (projectCountByClientId[a.id] || 0)).slice(0, 5).map((c, i) => {
                    const pCount = projectCountByClientId[c.id] || 0;
                    return (
                      <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-indigo-500/[0.04] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600 w-4">{i + 1}.</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-300">{c.name || c.company}</p>
                            <p className="text-xs text-gray-600">{pCount} project{pCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-mono font-bold" style={{ color: MODULE_COLOR }}>{c.company || '—'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>PROJECT STATUS</p>
              <div className="space-y-4">
                {totalProjects === 0 ? (
                  <p className="text-sm text-gray-500">No projects yet.</p>
                ) : (
                  [
                    { status: 'Active', count: projects.filter(p => p.status === 'active').length, color: '#3b82f6' },
                    { status: 'Completed', count: projects.filter(p => p.status === 'completed').length, color: '#22c55e' },
                    { status: 'Paused', count: projects.filter(p => p.status === 'paused').length, color: '#f59e0b' },
                  ].map((s, i) => {
                    const pct = ((s.count / totalProjects) * 100).toFixed(0);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold" style={{ color: s.color }}>{s.status}</span>
                          <span className="text-gray-500 font-mono">{s.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>RECENT CLIENTS</p>
            <div className="space-y-3">
              {clients.length === 0 ? (
                <p className="text-sm text-gray-500">No clients yet.</p>
              ) : (
                [...clients].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4).map(c => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-indigo-500/[0.04] last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-300 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.company || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${clientStatusColor(c.status)}15`, color: clientStatusColor(c.status), border: `1px solid ${clientStatusColor(c.status)}25` }}>
                        {c.status}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(c.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clients */}
      {tab === 'clients' && (
        <div className="animate-fade-in">
          {clients.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No clients yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
              {clients.map(c => {
                const pCount = projectCountByClientId[c.id] || 0;
                return (
                  <div key={c.id} className="panel rounded-2xl p-4 sm:p-6 hover:border-slate-500/20 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${MODULE_COLOR}15`, color: MODULE_COLOR }}>
                          {getInitials(c.name || c.company)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-bold text-gray-200 truncate">{c.name}</p>
                          <p className="text-xs text-gray-500 truncate">{c.company || '—'} &middot; Since {formatDate(c.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: `${clientStatusColor(c.status)}15`, color: clientStatusColor(c.status), border: `1px solid ${clientStatusColor(c.status)}25` }}>
                        {c.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                      <div>
                        <p className="text-sm sm:text-base font-bold font-mono text-white">{pCount}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">Projects</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-400 truncate">{c.email || '—'}</p>
                        <p className="text-[10px] sm:text-xs text-gray-600">Email</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-400 truncate">{c.phone || '—'}</p>
                        <p className="text-[10px] sm:text-xs text-gray-600">Phone</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Projects */}
      {tab === 'projects' && (
        <div className="animate-fade-in">
          {projects.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No projects yet.</p></div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden">
              <div className="divide-y divide-indigo-500/[0.04]">
                {projects.map(p => {
                  const modules = parseModules(p.modules);
                  return (
                    <div key={p.id} className="px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-300">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.client_name || '—'}{p.client_company ? ` (${p.client_company})` : ''}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: `${projectStatusColor(p.status)}15`, color: projectStatusColor(p.status), border: `1px solid ${projectStatusColor(p.status)}25` }}>
                          {p.status}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {modules.map((m, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${moduleTagColor(m)}15`, color: moduleTagColor(m), border: `1px solid ${moduleTagColor(m)}20` }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-slate-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{t.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full ${generating ? 'bg-slate-400 animate-pulse' : 'bg-slate-400'}`} />
                <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

const MODULE_COLOR = '#64748b';

const MOCK_CLIENTS = [
  { id: 1, name: 'TechCorp Industries', contact: 'Sarah Chen', email: 'sarah@techcorp.io', status: 'active', revenue: '$24,000', projects: 3, since: '2025-01-15' },
  { id: 2, name: 'StartupXYZ', contact: 'Mike Ross', email: 'mike@startupxyz.com', status: 'active', revenue: '$8,400', projects: 2, since: '2025-06-22' },
  { id: 3, name: 'BigBrand Co.', contact: 'Emma Wilson', email: 'emma@bigbrand.com', status: 'active', revenue: '$42,000', projects: 5, since: '2024-11-08' },
  { id: 4, name: 'The Agency', contact: 'Lisa Park', email: 'lisa@agency.co', status: 'active', revenue: '$15,600', projects: 2, since: '2025-03-14' },
  { id: 5, name: 'E-Com Shop', contact: 'James Liu', email: 'james@ecom.shop', status: 'paused', revenue: '$6,200', projects: 1, since: '2025-08-20' },
  { id: 6, name: 'GreenLeaf Brands', contact: 'Anna Taylor', email: 'anna@greenleaf.com', status: 'active', revenue: '$18,900', projects: 3, since: '2025-02-10' },
  { id: 7, name: 'Nova Digital', contact: 'Tom Brown', email: 'tom@novadigital.io', status: 'churned', revenue: '$3,800', projects: 1, since: '2025-09-05' },
];

const MOCK_PROJECTS = [
  { id: 1, name: 'Q1 Brand Campaign', client: 'TechCorp Industries', modules: ['Ads', 'Content', 'Social'], status: 'active', progress: 72, deadline: '2026-03-31' },
  { id: 2, name: 'Website Redesign', client: 'BigBrand Co.', modules: ['Website Builder', 'SEO'], status: 'active', progress: 45, deadline: '2026-04-15' },
  { id: 3, name: 'Product Launch', client: 'StartupXYZ', modules: ['Ads', 'Email', 'PR'], status: 'active', progress: 88, deadline: '2026-02-28' },
  { id: 4, name: 'Social Media Management', client: 'The Agency', modules: ['Social', 'Content', 'Calendar'], status: 'active', progress: 60, deadline: '2026-06-30' },
  { id: 5, name: 'SEO Overhaul', client: 'BigBrand Co.', modules: ['SEO', 'Content', 'Analytics'], status: 'active', progress: 35, deadline: '2026-05-15' },
  { id: 6, name: 'Email Automation', client: 'GreenLeaf Brands', modules: ['Email', 'CRM', 'Workflows'], status: 'completed', progress: 100, deadline: '2026-02-10' },
  { id: 7, name: 'Holiday Campaign', client: 'E-Com Shop', modules: ['Ads', 'Social', 'Email'], status: 'paused', progress: 30, deadline: '2026-12-01' },
  { id: 8, name: 'Analytics Dashboard', client: 'TechCorp Industries', modules: ['Analytics', 'Reports'], status: 'active', progress: 55, deadline: '2026-03-15' },
];

export default function ClientManagerPage() {
  const [tab, setTab] = useState('overview');

  const clientStatusColor = (s) => s === 'active' ? '#22c55e' : s === 'paused' ? '#f59e0b' : '#ef4444';
  const projectStatusColor = (s) => s === 'active' ? '#3b82f6' : s === 'completed' ? '#22c55e' : '#f59e0b';
  const moduleTagColor = (m) => {
    const colors = { Ads: '#10b981', Content: '#f97316', Social: '#ec4899', SEO: '#8b5cf6', Email: '#3b82f6', 'Website Builder': '#06b6d4', CRM: '#6366f1', Calendar: '#f59e0b', PR: '#be185d', Analytics: '#14b8a6', Reports: '#64748b', Workflows: '#a855f7' };
    return colors[m] || MODULE_COLOR;
  };

  const activeClients = MOCK_CLIENTS.filter(c => c.status === 'active').length;
  const totalProjects = MOCK_PROJECTS.length;
  const monthRevenue = MOCK_CLIENTS.reduce((a, c) => a + parseFloat(c.revenue.replace(/[$,]/g, '')), 0);
  const avgSatisfaction = '4.6';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>CLIENT MANAGER</p>
        <h1 className="text-2xl font-bold text-white mb-1">Client Management</h1>
        <p className="text-sm text-gray-500">Manage clients, projects, and deliverables</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'ACTIVE CLIENTS', value: activeClients.toString(), sub: `${MOCK_CLIENTS.length} total` },
          { label: 'TOTAL PROJECTS', value: totalProjects.toString(), sub: `${MOCK_PROJECTS.filter(p => p.status === 'active').length} in progress` },
          { label: 'THIS MONTH REVENUE', value: `$${(monthRevenue / 1000).toFixed(1)}K`, sub: '+12.4% vs last month' },
          { label: 'CLIENT SATISFACTION', value: `${avgSatisfaction}/5`, sub: 'Based on 42 reviews' },
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
        {['overview', 'clients', 'projects'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>TOP CLIENTS BY REVENUE</p>
              <div className="space-y-2">
                {[...MOCK_CLIENTS].sort((a, b) => parseFloat(b.revenue.replace(/[$,]/g, '')) - parseFloat(a.revenue.replace(/[$,]/g, ''))).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-indigo-500/[0.04] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-600 w-4">{i + 1}.</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-300">{c.name}</p>
                        <p className="text-[10px] text-gray-600">{c.projects} project{c.projects > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: MODULE_COLOR }}>{c.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>PROJECT STATUS</p>
              <div className="space-y-3">
                {[
                  { status: 'Active', count: MOCK_PROJECTS.filter(p => p.status === 'active').length, color: '#3b82f6' },
                  { status: 'Completed', count: MOCK_PROJECTS.filter(p => p.status === 'completed').length, color: '#22c55e' },
                  { status: 'Paused', count: MOCK_PROJECTS.filter(p => p.status === 'paused').length, color: '#f59e0b' },
                ].map((s, i) => {
                  const pct = ((s.count / totalProjects) * 100).toFixed(0);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-semibold" style={{ color: s.color }}>{s.status}</span>
                        <span className="text-gray-500 font-mono">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>UPCOMING DEADLINES</p>
            <div className="space-y-2">
              {MOCK_PROJECTS.filter(p => p.status === 'active').sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4).map(p => {
                const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-indigo-500/[0.04] last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-300">{p.name}</p>
                      <p className="text-[10px] text-gray-500">{p.client}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: p.progress > 80 ? '#22c55e' : p.progress > 50 ? '#3b82f6' : '#f59e0b' }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: daysLeft < 14 ? '#f59e0b' : '#6b7280' }}>
                        {daysLeft}d left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Clients */}
      {tab === 'clients' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3">
          {MOCK_CLIENTS.map(c => (
            <div key={c.id} className="panel rounded-xl p-4 hover:border-slate-500/20 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${MODULE_COLOR}15`, color: MODULE_COLOR }}>
                    {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200">{c.name}</p>
                    <p className="text-[10px] text-gray-500">{c.contact} &middot; Since {c.since}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${clientStatusColor(c.status)}15`, color: clientStatusColor(c.status), border: `1px solid ${clientStatusColor(c.status)}25` }}>
                  {c.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold font-mono" style={{ color: MODULE_COLOR }}>{c.revenue}</p>
                  <p className="text-[10px] text-gray-500">Revenue</p>
                </div>
                <div>
                  <p className="text-sm font-bold font-mono text-white">{c.projects}</p>
                  <p className="text-[10px] text-gray-500">Projects</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 truncate">{c.email}</p>
                  <p className="text-[10px] text-gray-600">Email</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {tab === 'projects' && (
        <div className="animate-fade-in">
          <div className="panel rounded-xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_PROJECTS.map(p => (
                <div key={p.id} className="px-4 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-300">{p.name}</p>
                      <p className="text-[10px] text-gray-500">{p.client} &middot; Due {p.deadline}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${projectStatusColor(p.status)}15`, color: projectStatusColor(p.status), border: `1px solid ${projectStatusColor(p.status)}25` }}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progress}%`, background: p.progress === 100 ? '#22c55e' : p.progress > 60 ? '#3b82f6' : '#f59e0b' }} />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">{p.progress}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.modules.map(m => (
                      <span key={m} className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${moduleTagColor(m)}15`, color: moduleTagColor(m), border: `1px solid ${moduleTagColor(m)}20` }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

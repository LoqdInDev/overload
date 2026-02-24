import { useState } from 'react';

const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: '#6366f1' },
  { id: 'qualified', name: 'Qualified', color: '#3b82f6' },
  { id: 'proposal', name: 'Proposal', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negotiation', color: '#f97316' },
  { id: 'won', name: 'Won', color: '#22c55e' },
  { id: 'lost', name: 'Lost', color: '#ef4444' },
];

const MOCK_DEALS = [
  { id: 1, name: 'Enterprise Plan', value: 24000, contact: 'Sarah Chen', stage: 'negotiation' },
  { id: 2, name: 'Starter Package', value: 4800, contact: 'Mike Ross', stage: 'qualified' },
  { id: 3, name: 'Agency License', value: 12000, contact: 'Lisa Park', stage: 'proposal' },
  { id: 4, name: 'Pro Upgrade', value: 9600, contact: 'James Liu', stage: 'lead' },
  { id: 5, name: 'Annual Contract', value: 36000, contact: 'Emma Wilson', stage: 'won' },
  { id: 6, name: 'Custom Build', value: 18000, contact: 'David Kim', stage: 'lead' },
  { id: 7, name: 'Team Plan', value: 7200, contact: 'Anna Taylor', stage: 'qualified' },
  { id: 8, name: 'Pilot Program', value: 3000, contact: 'Tom Brown', stage: 'lost' },
];

const MOCK_CONTACTS = [
  { id: 1, name: 'Sarah Chen', email: 'sarah@techcorp.io', company: 'TechCorp', status: 'customer', score: 92 },
  { id: 2, name: 'Mike Ross', email: 'mike@startupxyz.com', company: 'StartupXYZ', status: 'prospect', score: 74 },
  { id: 3, name: 'Lisa Park', email: 'lisa@agency.co', company: 'The Agency', status: 'prospect', score: 81 },
  { id: 4, name: 'James Liu', email: 'james@ecom.shop', company: 'E-Com Shop', status: 'lead', score: 45 },
  { id: 5, name: 'Emma Wilson', email: 'emma@bigbrand.com', company: 'BigBrand', status: 'customer', score: 97 },
  { id: 6, name: 'David Kim', email: 'david@startup.io', company: 'Startup.io', status: 'lead', score: 38 },
];

const AI_TOOLS = [
  { name: 'Follow-up Email', prompt: 'Write a professional follow-up email for a deal in the proposal stage' },
  { name: 'Cold Outreach', prompt: 'Write a compelling cold outreach email introducing our services' },
  { name: 'Upsell Proposal', prompt: 'Write an upsell proposal email for an existing customer' },
  { name: 'Win-back Email', prompt: 'Write a win-back email to re-engage a lost deal' },
];

export default function CrmPage() {
  const [tab, setTab] = useState('pipeline');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);

  const filteredContacts = MOCK_CONTACTS.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const generate = async (tool) => {
    setSelectedTool(tool); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/crm/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', prompt: tool.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const statusColor = (s) => s === 'customer' ? '#22c55e' : s === 'prospect' ? '#3b82f6' : '#f59e0b';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: '#6366f1' }}>CRM DASHBOARD</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Customer Relationships</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ label: 'TOTAL CONTACTS', value: '847', sub: '+12 this week' }, { label: 'ACTIVE DEALS', value: '23', sub: '$142.5K pipeline' }, { label: 'PIPELINE VALUE', value: '$142.5K', sub: '6 deals closing soon' }, { label: 'WIN RATE', value: '34%', sub: '+5% vs last month' }].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.label}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p><p className="text-[10px] text-gray-500 mt-1">{s.sub}</p></div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 sm:mb-6">
        {['pipeline', 'contacts', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Pipeline */}
      {tab === 'pipeline' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
          {PIPELINE_STAGES.map(stage => {
            const deals = MOCK_DEALS.filter(d => d.stage === stage.id);
            const total = deals.reduce((a, b) => a + b.value, 0);
            return (
              <div key={stage.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} /><span className="text-[10px] font-bold text-gray-400">{stage.name}</span></div>
                  <span className="text-[9px] text-gray-600 font-mono">{deals.length}</span>
                </div>
                <div className="text-[9px] text-gray-600 px-1 font-mono">${(total / 1000).toFixed(1)}K</div>
                <div className="space-y-1.5">
                  {deals.map(deal => (
                    <div key={deal.id} className="panel rounded-lg p-3 cursor-pointer hover:border-indigo-500/20 transition-all">
                      <p className="text-[11px] font-semibold text-gray-300 truncate">{deal.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{deal.contact}</p>
                      <p className="text-xs font-bold mt-1" style={{ color: stage.color }}>${deal.value.toLocaleString()}</p>
                    </div>
                  ))}
                  {deals.length === 0 && <div className="text-[10px] text-gray-700 text-center py-4">No deals</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contacts */}
      {tab === 'contacts' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="flex-1 input-field rounded-xl px-5 py-3 text-base" />
            <div className="flex flex-wrap gap-1">{['all', 'lead', 'prospect', 'customer'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`chip text-[10px] ${statusFilter === s ? 'active' : ''}`}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div>
          </div>
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {filteredContacts.map(c => (
                <div key={c.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">{c.name.split(' ').map(n => n[0]).join('')}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-300 truncate">{c.name}</p><p className="text-[10px] text-gray-500">{c.email}</p></div>
                  <span className="text-[10px] text-gray-500 hidden md:block">{c.company}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(c.status)}15`, color: statusColor(c.status), border: `1px solid ${statusColor(c.status)}25` }}>{c.status}</span>
                  <div className="w-10 h-10 rounded-full hidden sm:flex items-center justify-center text-[10px] font-bold" style={{ background: c.score > 75 ? 'rgba(34,197,94,0.1)' : c.score > 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: c.score > 75 ? '#22c55e' : c.score > 50 ? '#f59e0b' : '#ef4444' }}>{c.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TOOLS.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTool?.name === tool.name ? 'border-indigo-500/20' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#818cf8' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span></div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

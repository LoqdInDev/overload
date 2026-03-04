import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: '#6366f1' },
  { id: 'qualified', name: 'Qualified', color: '#3b82f6' },
  { id: 'proposal', name: 'Proposal', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negotiation', color: '#f97316' },
  { id: 'won', name: 'Won', color: '#22c55e' },
  { id: 'lost', name: 'Lost', color: '#ef4444' },
];

const AI_TOOLS = [
  { name: 'Follow-up Email', prompt: 'Write a professional follow-up email for a deal in the proposal stage' },
  { name: 'Cold Outreach', prompt: 'Write a compelling cold outreach email introducing our services' },
  { name: 'Upsell Proposal', prompt: 'Write an upsell proposal email for an existing customer' },
  { name: 'Win-back Email', prompt: 'Write a win-back email to re-engage a lost deal' },
  { name: 'Analyze Segments', prompt: 'Perform deep analysis of customer segments including behavioral patterns, purchase frequency, average spend, and engagement metrics' },
  { name: 'Predict Churn', prompt: 'Analyze customer behavior signals and predict churn risk levels, identifying at-risk customers and recommending retention strategies' },
  { name: 'Generate Persona', prompt: 'Create detailed customer personas based on demographic data, psychographics, buying behavior, and pain points' },
  { name: 'LTV Analysis', prompt: 'Calculate and analyze customer lifetime value across segments, identify highest-value cohorts' },
];

export default function CrmPage() {
  usePageTitle('CRM');
  const [tab, setTab] = useState('pipeline');
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', status: 'lead' });
  const [newDeal, setNewDeal] = useState({ name: '', value: '', contact_id: '', stage: 'lead' });
  const [selectedContact, setSelectedContact] = useState(null);
  const [scoreInputs, setScoreInputs] = useState({ emails_opened: '0', pages_visited: '0', downloads: '0', days_in_pipeline: '0' });
  const [leadScore, setLeadScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJSON('/api/crm/contacts'),
      fetchJSON('/api/crm/deals'),
      fetchJSON('/api/crm/segments'),
    ]).then(([c, d, s]) => {
      setContacts(c);
      setDeals(d);
      setSegments(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredContacts = contacts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.company?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addContact = async () => {
    if (!newContact.name.trim()) return;
    try {
      const created = await postJSON('/api/crm/contacts', newContact);
      setContacts(prev => [created, ...prev]);
      setNewContact({ name: '', email: '', company: '', status: 'lead' });
      setShowAddContact(false);
    } catch (err) { console.error(err); }
  };

  const addDeal = async () => {
    if (!newDeal.name.trim()) return;
    try {
      const created = await postJSON('/api/crm/deals', {
        ...newDeal,
        value: parseFloat(newDeal.value) || 0,
        contact_id: parseInt(newDeal.contact_id) || contacts[0]?.id,
      });
      setDeals(prev => [created, ...prev]);
      setNewDeal({ name: '', value: '', contact_id: '', stage: 'lead' });
      setShowAddDeal(false);
    } catch (err) { console.error(err); }
  };

  const removeContact = async (id) => {
    try {
      await deleteJSON(`/api/crm/contacts/${id}`);
      setContacts(prev => prev.filter(c => c.id !== id));
      setDeals(prev => prev.filter(d => d.contact_id !== id));
    } catch (err) { console.error(err); }
  };

  const removeDeal = async (id) => {
    try {
      await deleteJSON(`/api/crm/deals/${id}`);
      setDeals(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error(err); }
  };

  const generate = (tool) => {
    setSelectedTool(tool); setGenerating(true); setOutput('');
    connectSSE('/api/crm/generate', { type: 'email', prompt: tool.prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const statusColor = (s) => s === 'customer' ? '#22c55e' : s === 'prospect' ? '#3b82f6' : '#f59e0b';
  const tabLabel = (t) => t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1);

  const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonDeals = deals.filter(d => d.stage === 'won').length;
  const closedDeals = wonDeals + deals.filter(d => d.stage === 'lost').length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: '#6366f1' }}>CRM DASHBOARD</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Customer Relationships</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'TOTAL CONTACTS', value: contacts.length.toLocaleString() },
          { label: 'ACTIVE DEALS', value: activeDeals.length.toString() },
          { label: 'PIPELINE VALUE', value: pipelineValue >= 1000 ? `$${(pipelineValue / 1000).toFixed(1)}K` : `$${pipelineValue}` },
          { label: 'WIN RATE', value: `${winRate}%` },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4 sm:mb-6">
        {['pipeline', 'contacts', 'segments', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' } : {}}>{tabLabel(t)}</button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddDeal(!showAddDeal)} className="chip text-[10px]" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}>+ Add Deal</button>
          </div>
          {showAddDeal && (
            <div className="panel rounded-2xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input value={newDeal.name} onChange={e => setNewDeal({ ...newDeal, name: e.target.value })} placeholder="Deal name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newDeal.value} onChange={e => setNewDeal({ ...newDeal, value: e.target.value })} placeholder="Value ($)" type="number" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newDeal.stage} onChange={e => setNewDeal({ ...newDeal, stage: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={newDeal.contact_id} onChange={e => setNewDeal({ ...newDeal, contact_id: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="">Select contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={addDeal} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#6366f1' }}>Create Deal</button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PIPELINE_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.id);
              const total = stageDeals.reduce((a, b) => a + (b.value || 0), 0);
              return (
                <div key={stage.id} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} /><span className="text-[10px] font-bold text-gray-400">{stage.name}</span></div>
                    <span className="text-[9px] text-gray-600 font-mono">{stageDeals.length}</span>
                  </div>
                  <div className="text-[9px] text-gray-600 px-1 font-mono">${(total / 1000).toFixed(1)}K</div>
                  <div className="space-y-1.5">
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="group panel rounded-lg p-3 cursor-pointer hover:border-indigo-500/20 transition-all">
                        <p className="text-[11px] font-semibold text-gray-300 truncate">{deal.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{deal.contact_name || '—'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-bold" style={{ color: stage.color }}>${(deal.value || 0).toLocaleString()}</p>
                          <button onClick={(e) => { e.stopPropagation(); removeDeal(deal.id); }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && <div className="text-[10px] text-gray-700 text-center py-4">No deals</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="flex-1 input-field rounded-xl px-5 py-3 text-base" />
            <div className="flex flex-wrap gap-1">
              {['all', 'lead', 'prospect', 'customer'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`chip text-[10px] ${statusFilter === s ? 'active' : ''}`}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>))}
              <button onClick={() => setShowAddContact(!showAddContact)} className="chip text-[10px]" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}>+ Add</button>
            </div>
          </div>
          {showAddContact && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newContact.company} onChange={e => setNewContact({ ...newContact, company: e.target.value })} placeholder="Company" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newContact.status} onChange={e => setNewContact({ ...newContact, status: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <button onClick={addContact} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#6366f1' }}>Add Contact</button>
            </div>
          )}
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {filteredContacts.length === 0 && <div className="p-6 text-center text-sm text-gray-600">{loading ? 'Loading...' : 'No contacts yet'}</div>}
              {filteredContacts.map(c => (
                <div key={c.id} className="group flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">{c.name?.split(' ').map(n => n[0]).join('') || '?'}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-300 truncate">{c.name}</p><p className="text-[10px] text-gray-500">{c.email}</p></div>
                  <span className="text-[10px] text-gray-500 hidden md:block">{c.company}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(c.status)}15`, color: statusColor(c.status), border: `1px solid ${statusColor(c.status)}25` }}>{c.status}</span>
                  {c.score != null && <div className="w-10 h-10 rounded-full hidden sm:flex items-center justify-center text-[10px] font-bold" style={{ background: c.score > 75 ? 'rgba(34,197,94,0.1)' : c.score > 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: c.score > 75 ? '#22c55e' : c.score > 50 ? '#f59e0b' : '#ef4444' }}>{c.score}</div>}
                  <button onClick={() => { setSelectedContact(selectedContact?.id === c.id ? null : c); setLeadScore(null); }} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all" style={{ color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}>Score</button>
                  <button onClick={() => removeContact(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Scoring Panel */}
          {selectedContact && (
            <div className="panel animate-fade-in" style={{ marginTop: 16 }}>
              <div className="hud-label" style={{ marginBottom: 12 }}>Lead Score — {selectedContact.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[['Emails Opened', 'emails_opened'], ['Pages Visited', 'pages_visited'], ['Downloads', 'downloads'], ['Days in Pipeline', 'days_in_pipeline']].map(([label, key]) => (
                  <div key={key}>
                    <div className="hud-label" style={{ marginBottom: 4 }}>{label}</div>
                    <input className="input-field rounded px-3 py-2 text-xs w-full" type="number" value={scoreInputs[key]} onChange={e => setScoreInputs(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#6366f1' }} disabled={scoreLoading}
                onClick={async () => {
                  setScoreLoading(true);
                  try {
                    const result = await postJSON('/api/crm/score-lead', {
                      contact_name: selectedContact.name,
                      company: selectedContact.company,
                      job_title: selectedContact.job_title || selectedContact.title,
                      ...scoreInputs
                    });
                    setLeadScore(result);
                  } catch {}
                  setScoreLoading(false);
                }}>{scoreLoading ? 'Scoring...' : 'Calculate Score'}</button>
              {leadScore && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: leadScore.tier === 'hot' ? '#ef4444' : leadScore.tier === 'warm' ? '#f59e0b' : '#6b7280' }}>
                      {leadScore.score}
                    </div>
                    <div>
                      <div className="chip" style={{
                        background: leadScore.tier === 'hot' ? 'rgba(239,68,68,0.12)' : leadScore.tier === 'warm' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)',
                        borderColor: leadScore.tier === 'hot' ? '#ef4444' : leadScore.tier === 'warm' ? '#f59e0b' : '#6b7280',
                        marginBottom: 4, display: 'inline-block'
                      }}>{leadScore.tier?.toUpperCase()} LEAD</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{leadScore.probability_to_close} close probability</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>
                    <strong>Next Action:</strong> {leadScore.next_action}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{leadScore.timing}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'segments' && (
        <div className="animate-fade-in">
          {segments.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No segments created yet</p>
              <p className="text-xs text-gray-600 mt-1">Use AI Tools to analyze and generate customer segments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {segments.map(seg => (
                <div key={seg.id} className="panel rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    {seg.color && <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />}
                    <p className="text-sm font-bold text-white">{seg.name}</p>
                  </div>
                  {seg.rules && <p className="text-xs text-gray-500 mt-2">{typeof seg.rules === 'string' ? seg.rules : JSON.stringify(seg.rules)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
      <AIInsightsPanel moduleId="crm" />
    </div>
  );
}

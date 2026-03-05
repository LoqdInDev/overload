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
  const [nbaData, setNbaData] = useState({});
  const [nbaLoading, setNbaLoading] = useState({});

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
    if (!newDeal.name.trim() || !newDeal.contact_id) return;
    try {
      const created = await postJSON('/api/crm/deals', {
        ...newDeal,
        value: parseFloat(newDeal.value) || 0,
        contact_id: parseInt(newDeal.contact_id) || null,
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
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-2">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4 sm:mb-6">
        {['pipeline', 'contacts', 'segments', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' } : {}}>{tabLabel(t)}</button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <div className="animate-fade-in space-y-5">

          {/* Summary bar */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PIPELINE_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.id);
              const total = stageDeals.reduce((a, b) => a + (b.value || 0), 0);
              return (
                <div key={stage.id} className="rounded-xl px-4 py-3 text-center" style={{ background: `${stage.color}0d`, border: `1px solid ${stage.color}22` }}>
                  <p className="text-[10px] font-bold tracking-wide mb-1" style={{ color: stage.color }}>{stage.name.toUpperCase()}</p>
                  <p className="text-base font-bold">{stageDeals.length}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{total > 0 ? `$${(total / 1000).toFixed(1)}K` : '—'}</p>
                </div>
              );
            })}
          </div>

          {/* Add Deal form */}
          <div className="flex justify-end">
            <button onClick={() => setShowAddDeal(!showAddDeal)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              style={{ background: showAddDeal ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Deal
            </button>
          </div>

          {showAddDeal && (
            <div className="rounded-2xl p-5 sm:p-6 space-y-4" style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}>
              <p className="text-sm font-semibold">New Deal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">DEAL NAME</p>
                  <input value={newDeal.name} onChange={e => setNewDeal({ ...newDeal, name: e.target.value })} placeholder="e.g. Acme Corp Renewal" className="input-field w-full rounded-xl px-4 py-3 text-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">VALUE ($)</p>
                  <input value={newDeal.value} onChange={e => setNewDeal({ ...newDeal, value: e.target.value })} placeholder="e.g. 5000" type="number" className="input-field w-full rounded-xl px-4 py-3 text-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">STAGE</p>
                  <select value={newDeal.stage} onChange={e => setNewDeal({ ...newDeal, stage: e.target.value })} className="input-field w-full rounded-xl px-4 py-3 text-sm">
                    {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">CONTACT</p>
                  <select value={newDeal.contact_id} onChange={e => setNewDeal({ ...newDeal, contact_id: e.target.value })} className="input-field w-full rounded-xl px-4 py-3 text-sm">
                    <option value="">Select contact</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={addDeal} disabled={!newDeal.name.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: '#6366f1', color: '#fff' }}>Create Deal</button>
                <button onClick={() => setShowAddDeal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 transition-all hover:text-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Kanban board */}
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-6 gap-3 min-w-[900px]">
              {PIPELINE_STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage.id);
                const total = stageDeals.reduce((a, b) => a + (b.value || 0), 0);
                return (
                  <div key={stage.id} className="flex flex-col min-h-[200px]">
                    {/* Column header */}
                    <div className="rounded-xl px-3 py-3 mb-3" style={{ background: `${stage.color}0d`, borderTop: `3px solid ${stage.color}`, border: `1px solid ${stage.color}20`, borderTopWidth: 3 }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${stage.color}22`, color: stage.color }}>{stageDeals.length}</span>
                      </div>
                      {total > 0 && <p className="text-xs font-semibold mt-1 text-gray-500">${total.toLocaleString()}</p>}
                    </div>

                    {/* Deal cards */}
                    <div className="space-y-2 flex-1">
                      {stageDeals.map(deal => (
                        <div key={deal.id} className="group rounded-xl p-3.5 transition-all cursor-pointer hover:-translate-y-0.5"
                          style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid rgba(0,0,0,0.07)`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <p className="text-xs font-semibold leading-tight truncate">{deal.name}</p>
                            <button onClick={(e) => { e.stopPropagation(); removeDeal(deal.id); }}
                              className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0 mt-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          {deal.contact_name && <p className="text-[10px] text-gray-400 mb-2 truncate">{deal.contact_name}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold" style={{ color: stage.color }}>${(deal.value || 0).toLocaleString()}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${stage.color}15`, color: stage.color }}>{stage.name}</span>
                          </div>
                        </div>
                      ))}

                      {stageDeals.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed py-8 text-center transition-all"
                          style={{ borderColor: `${stage.color}20` }}>
                          <div className="w-6 h-6 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: `${stage.color}15` }}>
                            <svg className="w-3.5 h-3.5" style={{ color: stage.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          </div>
                          <p className="text-[10px] text-gray-400">No deals</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                <div key={c.id} className="group flex flex-col px-3 sm:px-5 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">{c.name?.split(' ').map(n => n[0]).join('') || '?'}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-300 truncate">{c.name}</p><p className="text-[10px] text-gray-500">{c.email}</p></div>
                    <span className="text-[10px] text-gray-500 hidden md:block">{c.company}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(c.status)}15`, color: statusColor(c.status), border: `1px solid ${statusColor(c.status)}25` }}>{c.status}</span>
                    {c.score != null && <div className="w-10 h-10 rounded-full hidden sm:flex items-center justify-center text-[10px] font-bold" style={{ background: c.score > 75 ? 'rgba(34,197,94,0.1)' : c.score > 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: c.score > 75 ? '#22c55e' : c.score > 50 ? '#f59e0b' : '#ef4444' }}>{c.score}</div>}
                    <button onClick={() => { setSelectedContact(selectedContact?.id === c.id ? null : c); setLeadScore(null); }} className="opacity-0 group-hover:opacity-100 chip text-[9px] transition-all" style={{ color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}>Score</button>
                    <button
                      onClick={async () => {
                        setNbaLoading(prev => ({ ...prev, [c.id]: true }));
                        try {
                          const data = await postJSON(`/api/crm/contacts/${c.id}/next-action`, {});
                          setNbaData(prev => ({ ...prev, [c.id]: data }));
                        } catch {}
                        setNbaLoading(prev => ({ ...prev, [c.id]: false }));
                      }}
                      className="opacity-0 group-hover:opacity-100 chip text-[10px] transition-all"
                      disabled={nbaLoading[c.id]}
                    >
                      {nbaLoading[c.id] ? 'Analyzing...' : '⚡ Next Action'}
                    </button>
                    <button onClick={() => removeContact(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                  {nbaData[c.id] && (
                    <div className="mt-2 ml-12 p-3 rounded-xl text-xs space-y-1.5"
                      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-300">{nbaData[c.id].action}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          nbaData[c.id].urgency === 'high' ? 'bg-red-500/15 text-red-400' :
                          nbaData[c.id].urgency === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-emerald-500/15 text-emerald-400'
                        }`}>{nbaData[c.id].urgency?.toUpperCase()}</span>
                      </div>
                      <p className="text-gray-400">{nbaData[c.id].reason}</p>
                      {nbaData[c.id].message_template && (
                        <div className="p-2 rounded-lg text-gray-300 italic" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          "{nbaData[c.id].message_template}"
                          <button onClick={() => navigator.clipboard.writeText(nbaData[c.id].message_template)} className="ml-2 chip text-[9px] not-italic">Copy</button>
                        </div>
                      )}
                    </div>
                  )}
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

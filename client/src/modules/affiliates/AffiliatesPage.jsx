import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const AI_TEMPLATES = [
  { name: 'Recruitment Email', prompt: 'Write a compelling affiliate recruitment email inviting potential partners to join our program' },
  { name: 'Program Terms', prompt: 'Generate comprehensive affiliate program terms and conditions' },
  { name: 'Welcome Onboarding', prompt: 'Write a welcome email for new affiliates with tips for success' },
  { name: 'Promotional Kit', prompt: 'Create a promotional toolkit guide with swipe copy, banner suggestions, and social media posts for affiliates' },
];

export default function AffiliatesPage() {
  usePageTitle('Affiliate Manager');
  const [tab, setTab] = useState('programs');
  const [programs, setPrograms] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [commInputs, setCommInputs] = useState({ current_rate: '', industry: 'E-commerce', product_margin: '40', avg_order_value: '50' });
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddAffiliate, setShowAddAffiliate] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', commissionType: 'percentage', commissionRate: '', cookieDuration: '30', terms: '' });
  const [newAffiliate, setNewAffiliate] = useState({ programId: '', name: '', email: '' });

  // Payouts state
  const [payouts, setPayouts] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [newPayout, setNewPayout] = useState({ affiliate_id: '', amount: '', period: '', notes: '' });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJSON('/api/affiliates/programs'),
      fetchJSON('/api/affiliates/affiliates'),
    ]).then(([p, a]) => {
      setPrograms(p);
      setAffiliates(a);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addProgram = async () => {
    if (!newProgram.name.trim()) return;
    try {
      const created = await postJSON('/api/affiliates/programs', {
        name: newProgram.name,
        commissionType: newProgram.commissionType,
        commissionRate: parseFloat(newProgram.commissionRate) || 10,
        cookieDuration: parseInt(newProgram.cookieDuration) || 30,
        terms: newProgram.terms || null,
      });
      setPrograms(prev => [created, ...prev]);
      setNewProgram({ name: '', commissionType: 'percentage', commissionRate: '', cookieDuration: '30', terms: '' });
      setShowAddProgram(false);
    } catch (err) { console.error(err); }
  };

  const addAffiliate = async () => {
    if (!newAffiliate.name.trim() || !newAffiliate.programId) return;
    try {
      const created = await postJSON('/api/affiliates/affiliates', {
        programId: parseInt(newAffiliate.programId),
        name: newAffiliate.name,
        email: newAffiliate.email || null,
      });
      setAffiliates(prev => [created, ...prev]);
      setNewAffiliate({ programId: '', name: '', email: '' });
      setShowAddAffiliate(false);
    } catch (err) { console.error(err); }
  };

  const removeProgram = async (id) => {
    try {
      await deleteJSON(`/api/affiliates/programs/${id}`);
      setPrograms(prev => prev.filter(p => p.id !== id));
      setAffiliates(prev => prev.filter(a => a.program_id !== id));
    } catch (err) { console.error(err); }
  };

  const removeAffiliate = async (id) => {
    try {
      await deleteJSON(`/api/affiliates/affiliates/${id}`);
      setAffiliates(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const loadPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const [p, s] = await Promise.all([
        fetchJSON('/api/affiliates/payouts'),
        fetchJSON('/api/affiliates/payouts/summary'),
      ]);
      setPayouts(p);
      setPayoutSummary(s);
    } catch (err) { console.error(err); }
    finally { setPayoutsLoading(false); }
  };

  useEffect(() => {
    if (tab === 'payouts') loadPayouts();
  }, [tab]);

  const addPayout = async () => {
    if (!newPayout.affiliate_id || !newPayout.amount) return;
    try {
      const created = await postJSON('/api/affiliates/payouts', {
        affiliate_id: parseInt(newPayout.affiliate_id),
        amount: parseFloat(newPayout.amount),
        period: newPayout.period || null,
        notes: newPayout.notes || null,
      });
      setPayouts(prev => [created, ...prev]);
      setNewPayout({ affiliate_id: '', amount: '', period: '', notes: '' });
      setShowAddPayout(false);
      loadPayouts();
    } catch (err) { console.error(err); }
  };

  const markPaid = async (id) => {
    try {
      const updated = await putJSON(`/api/affiliates/payouts/${id}/mark-paid`, {});
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      loadPayouts();
    } catch (err) { console.error(err); }
  };

  const deletePayout = async (id) => {
    try {
      await deleteJSON(`/api/affiliates/payouts/${id}`);
      setPayouts(prev => prev.filter(p => p.id !== id));
      loadPayouts();
    } catch (err) { console.error(err); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/affiliates/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const totalAffiliates = affiliates.length;
  const totalRevenue = affiliates.reduce((sum, a) => sum + (a.revenue || 0), 0);
  const activePrograms = programs.filter(p => p.status === 'active').length;
  const totalClicks = affiliates.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const totalConversions = affiliates.reduce((sum, a) => sum + (a.conversions || 0), 0);
  const avgConvRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#22c55e' }}>AFFILIATE MANAGER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Affiliate Program</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { l: 'TOTAL AFFILIATES', v: loading ? '—' : totalAffiliates.toLocaleString() },
          { l: 'TOTAL REVENUE', v: loading ? '—' : totalRevenue >= 1000 ? `$${(totalRevenue / 1000).toFixed(1)}K` : `$${totalRevenue}` },
          { l: 'CONV. RATE', v: loading ? '—' : `${avgConvRate}%` },
          { l: 'ACTIVE PROGRAMS', v: loading ? '—' : activePrograms.toString() },
        ].map((s, i) => (<div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6"><p className="hud-label text-[10px] mb-2">{s.l}</p><p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['programs', 'affiliates', 'payouts', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>

      {tab === 'programs' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end mb-1">
            <button onClick={() => setShowAddProgram(!showAddProgram)} className="chip text-[10px]" style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>+ Add Program</button>
          </div>
          {showAddProgram && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input value={newProgram.name} onChange={e => setNewProgram({ ...newProgram, name: e.target.value })} placeholder="Program name" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newProgram.commissionType} onChange={e => setNewProgram({ ...newProgram, commissionType: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat Rate</option>
                </select>
                <input value={newProgram.commissionRate} onChange={e => setNewProgram({ ...newProgram, commissionRate: e.target.value })} placeholder={newProgram.commissionType === 'percentage' ? 'Commission %' : 'Flat amount ($)'} type="number" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newProgram.cookieDuration} onChange={e => setNewProgram({ ...newProgram, cookieDuration: e.target.value })} placeholder="Cookie days" type="number" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <button onClick={addProgram} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#22c55e' }}>Create Program</button>
            </div>
          )}
          {programs.length === 0 && !loading && (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No programs yet</p>
              <p className="text-xs text-gray-600 mt-1">Create your first affiliate program to get started</p>
            </div>
          )}
          {loading && programs.length === 0 && <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading...</div>}
          <div className="space-y-3">
            {programs.map(p => (
              <div key={p.id} className="group panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-200">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.commission_type === 'percentage' ? `${p.commission_rate}% commission` : `$${p.commission_rate} per sale`}
                    {p.cookie_duration ? ` \u2022 ${p.cookie_duration}d cookie` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : p.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{p.status}</span>
                  <button onClick={() => removeProgram(p.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'affiliates' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end mb-1">
            <button onClick={() => setShowAddAffiliate(!showAddAffiliate)} className="chip text-[10px]" style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>+ Add Affiliate</button>
          </div>
          {showAddAffiliate && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newAffiliate.name} onChange={e => setNewAffiliate({ ...newAffiliate, name: e.target.value })} placeholder="Affiliate name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newAffiliate.email} onChange={e => setNewAffiliate({ ...newAffiliate, email: e.target.value })} placeholder="Email (optional)" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newAffiliate.programId} onChange={e => setNewAffiliate({ ...newAffiliate, programId: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="">Select program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button onClick={addAffiliate} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#22c55e' }}>Add Affiliate</button>
            </div>
          )}
          {affiliates.length === 0 && !loading && (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No affiliates yet</p>
              <p className="text-xs text-gray-600 mt-1">Add affiliates to start tracking referrals</p>
            </div>
          )}
          {loading && affiliates.length === 0 && <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading...</div>}
          <div className="panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="divide-y divide-indigo-500/[0.04] min-w-[480px]">
                {affiliates.map(a => (
                  <div key={a.id} className="group flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-bold text-emerald-400 flex-shrink-0">{a.name?.split(' ').map(n => n[0]).join('') || '?'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-300">{a.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{a.affiliate_code || a.tracking_code || '—'}</p>
                      {a.program_name && <p className="text-[10px] text-gray-600">{a.program_name}</p>}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{(a.clicks || 0).toLocaleString()} clicks</p>
                      <p>{(a.conversions || 0).toLocaleString()} conv.</p>
                    </div>
                    <span className="text-base font-bold text-emerald-400 font-mono">${(a.revenue || 0).toLocaleString()}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{a.status}</span>
                    <button onClick={() => removeAffiliate(a.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'payouts' && (() => {
        const totalPending = payoutSummary.reduce((sum, a) => sum + (a.pending_amount || 0), 0);
        const totalPaid = payoutSummary.reduce((sum, a) => sum + (a.paid_amount || 0), 0);
        const affiliatesWithPending = payoutSummary.filter(a => a.pending_count > 0).length;
        return (
          <div className="animate-fade-in space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
              {[
                { l: 'TOTAL PENDING', v: payoutsLoading ? '—' : `$${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#f59e0b' },
                { l: 'TOTAL PAID', v: payoutsLoading ? '—' : `$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#22c55e' },
                { l: 'AFFILIATES OWED', v: payoutsLoading ? '—' : affiliatesWithPending.toString(), color: '#a78bfa' },
              ].map((s, i) => (
                <div key={i} className="panel rounded-2xl p-4 sm:p-6">
                  <p className="hud-label text-[11px] mb-1" style={{ color: s.color }}>{s.l}</p>
                  <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p>
                </div>
              ))}
            </div>

            {/* Add Payout button */}
            <div className="flex justify-end mb-1">
              <button onClick={() => setShowAddPayout(!showAddPayout)} className="chip text-[10px]" style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>+ Add Payout</button>
            </div>

            {/* Add Payout form */}
            {showAddPayout && (
              <div className="panel rounded-2xl p-4 space-y-3">
                <p className="hud-label text-[11px] mb-2" style={{ color: '#4ade80' }}>NEW PAYOUT</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={newPayout.affiliate_id} onChange={e => setNewPayout({ ...newPayout, affiliate_id: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                    <option value="">Select affiliate</option>
                    {affiliates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <input value={newPayout.amount} onChange={e => setNewPayout({ ...newPayout, amount: e.target.value })} placeholder="Amount ($)" type="number" min="0" step="0.01" className="input-field rounded px-3 py-2 text-xs" />
                  <input value={newPayout.period} onChange={e => setNewPayout({ ...newPayout, period: e.target.value })} placeholder="Period (e.g. March 2026)" className="input-field rounded px-3 py-2 text-xs" />
                  <input value={newPayout.notes} onChange={e => setNewPayout({ ...newPayout, notes: e.target.value })} placeholder="Notes (optional)" className="input-field rounded px-3 py-2 text-xs" />
                </div>
                <button onClick={addPayout} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#22c55e' }}>Create Payout</button>
              </div>
            )}

            {/* Payouts table */}
            {payoutsLoading && payouts.length === 0 && <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading...</div>}
            {!payoutsLoading && payouts.length === 0 && (
              <div className="panel rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-500">No payouts recorded yet</p>
                <p className="text-xs text-gray-600 mt-1">Create a payout to track affiliate earnings and payments</p>
              </div>
            )}
            {payouts.length > 0 && (
              <div className="panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['AFFILIATE', 'AMOUNT', 'PERIOD', 'STATUS', 'CREATED', 'ACTIONS'].map(h => (
                          <th key={h} className="hud-label text-[10px] px-4 sm:px-6 py-3 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/[0.04]">
                      {payouts.map(p => (
                        <tr key={p.id} className={`group hover:bg-white/[0.01] transition-colors ${p.status === 'pending' ? 'bg-amber-500/[0.02]' : ''}`}>
                          <td className="px-4 sm:px-6 py-3">
                            <p className="font-semibold text-gray-300">{p.affiliate_name || '—'}</p>
                            {p.affiliate_email && <p className="text-[10px] text-gray-600">{p.affiliate_email}</p>}
                          </td>
                          <td className="px-4 sm:px-6 py-3 font-mono font-bold text-emerald-400">${(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 sm:px-6 py-3 text-gray-500">{p.period || '—'}</td>
                          <td className="px-4 sm:px-6 py-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>{p.status}</span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 font-mono">{p.created_at ? p.created_at.slice(0, 10) : '—'}</td>
                          <td className="px-4 sm:px-6 py-3">
                            <div className="flex items-center gap-2">
                              {p.status === 'pending' && (
                                <button onClick={() => markPaid(p.id)} className="chip text-[9px]" style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>Mark Paid</button>
                              )}
                              {p.status === 'pending' && (
                                <button onClick={() => deletePayout(p.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {tab === 'ai-tools' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="rounded-2xl overflow-hidden animate-fade-in mt-4" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.14)' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(16,185,129,0.08)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Commission Structure Optimizer</p>
                <p className="text-xs text-gray-500">AI-designed tiered commission rates for your affiliate program</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Current Rate', unit: '%', key: 'current_rate', placeholder: '10' },
                  { label: 'Product Margin', unit: '%', key: 'product_margin', placeholder: '40' },
                  { label: 'Avg Order Value', unit: '$', key: 'avg_order_value', placeholder: '50' },
                ].map(({ label, unit, key, placeholder }) => (
                  <div key={key}>
                    <label className="hud-label text-[10px] block mb-1.5">{label.toUpperCase()}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none" style={{ color: 'rgba(16,185,129,0.6)' }}>{unit}</span>
                      <input
                        className="input-field w-full rounded-xl pl-7 pr-3 py-2.5 text-sm"
                        type="number" placeholder={placeholder}
                        value={commInputs[key]}
                        onChange={e => setCommInputs(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="hud-label text-[10px] block mb-1.5">INDUSTRY</label>
                  <select
                    className="input-field w-full rounded-xl px-3 py-2.5 text-sm appearance-none cursor-pointer"
                    value={commInputs.industry}
                    onChange={e => setCommInputs(prev => ({ ...prev, industry: e.target.value }))}>
                    {['E-commerce', 'SaaS', 'Digital Products', 'Physical Products', 'Services'].map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
                onClick={async () => {
                  try { const result = await postJSON('/api/affiliates/optimize-commission', commInputs); setCommissionData(result); } catch {}
                }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                Optimize Commission
              </button>
              {commissionData && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <span className="text-emerald-400 font-semibold">Recommended Base Rate:</span>
                    <strong className="text-white">{commissionData.recommended_base_rate}</strong>
                  </div>
                  <p className="hud-label text-[10px]">TIER STRUCTURE</p>
                  <div className="space-y-2">
                    {commissionData.tier_structure?.map((tier, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-white">{['🥉', '🥈', '🥇'][i]} {tier.tier}</span>
                          <span className="chip text-[10px]">{tier.commission} commission</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-1.5">{tier.threshold}</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {tier.perks?.map((perk, j) => <span key={j} className="chip text-[10px]">{perk}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {commissionData.rationale && <p className="text-xs text-gray-500 leading-relaxed">{commissionData.rationale}</p>}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-emerald-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{t.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-0.5 animate-pulse" />}</pre></div>}
        </div>
      )}
      <AIInsightsPanel moduleId="affiliates" />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
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
        ].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['programs', 'affiliates', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
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

      {tab === 'ai-tools' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="panel animate-fade-in" style={{ marginTop: 16 }}>
            <div className="hud-label" style={{ marginBottom: 12 }}>Commission Structure Optimizer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[['Current Rate %', 'current_rate', '10'], ['Product Margin %', 'product_margin', '40'], ['Avg Order Value $', 'avg_order_value', '50']].map(([label, key, placeholder]) => (
                <div key={key}>
                  <div className="hud-label" style={{ marginBottom: 4 }}>{label}</div>
                  <input className="input" type="number" placeholder={placeholder} value={commInputs[key]} onChange={e => setCommInputs(prev => ({ ...prev, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <div className="hud-label" style={{ marginBottom: 4 }}>Industry</div>
                <select className="input" value={commInputs.industry} onChange={e => setCommInputs(prev => ({ ...prev, industry: e.target.value }))}>
                  {['E-commerce', 'SaaS', 'Digital Products', 'Physical Products', 'Services'].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-accent" onClick={async () => {
              try { const result = await postJSON('/api/affiliates/optimize-commission', commInputs); setCommissionData(result); } catch {}
            }}>Optimize Commission</button>
            {commissionData && (
              <div style={{ marginTop: 16 }}>
                <div className="chip" style={{ marginBottom: 12 }}>Recommended Base Rate: <strong>{commissionData.recommended_base_rate}</strong></div>
                <div className="hud-label" style={{ marginBottom: 8 }}>Tier Structure</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {commissionData.tier_structure?.map((tier, i) => (
                    <div key={i} className="panel" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{['Bronze', 'Silver', 'Gold'][i] === tier.tier ? ['🥉', '🥈', '🥇'][i] : ''} {tier.tier}</span>
                        <span className="chip" style={{ fontSize: 11 }}>{tier.commission} commission</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tier.threshold}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {tier.perks?.map((perk, j) => <span key={j} className="chip" style={{ fontSize: 10 }}>{perk}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                {commissionData.rationale && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{commissionData.rationale}</div>}
              </div>
            )}
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

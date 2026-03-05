import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, putJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#e11d48';

const AI_TEMPLATES = [
  { name: 'Design Loyalty Program', prompt: 'Design a tiered loyalty program with point earning rules, tier thresholds, exclusive benefits per tier, and engagement mechanics to maximize retention' },
  { name: 'Generate Referral Copy', prompt: 'Write persuasive referral program copy including invitation emails, social share messages, landing page headlines, and thank-you notifications' },
  { name: 'Build VIP Tier Structure', prompt: 'Create a VIP tier structure with 4-5 tiers including names, qualification criteria, benefits, and upgrade incentives that drive aspirational spending' },
  { name: 'Create Rewards Strategy', prompt: 'Develop a comprehensive rewards strategy including point values, redemption options, bonus events calendar, and gamification elements' },
];

const TIER_COLORS = { Platinum: '#a78bfa', Gold: '#f59e0b', Silver: '#9ca3af', Bronze: '#d97706' };

export default function ReferralLoyaltyPage() {
  usePageTitle('Referral & Loyalty');
  const [tab, setTab] = useState('programs');
  const [programs, setPrograms] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [pointsOutput, setPointsOutput] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsInputs, setPointsInputs] = useState({ product_category: '', avg_order_value: '50', desired_rewards: 'discounts, free products' });
  const [viralData, setViralData] = useState(null);
  const [viralInputs, setViralInputs] = useState({ total_users: '', referred_users: '', avg_referrals_per_user: '' });
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', type: '', reward_type: '', reward_value: '', rules: '' });
  const [newMember, setNewMember] = useState({ program_id: '', customer_name: '', email: '', tier: '', points: '', referrals: '' });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJSON('/api/referral-loyalty'),
      fetchJSON('/api/referral-loyalty/members/list'),
    ]).then(([p, m]) => {
      setPrograms(p);
      setMembers(m);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addProgram = async () => {
    if (!newProgram.name.trim()) return;
    try {
      const created = await postJSON('/api/referral-loyalty', {
        name: newProgram.name,
        type: newProgram.type || null,
        reward_type: newProgram.reward_type || null,
        reward_value: newProgram.reward_value || null,
        rules: newProgram.rules || null,
        status: 'active',
      });
      setPrograms(prev => [created, ...prev]);
      setNewProgram({ name: '', type: '', reward_type: '', reward_value: '', rules: '' });
      setShowAddProgram(false);
    } catch (err) { console.error(err); }
  };

  const addMember = async () => {
    if (!newMember.customer_name.trim() || !newMember.program_id) return;
    try {
      const created = await postJSON('/api/referral-loyalty/members', {
        program_id: parseInt(newMember.program_id),
        customer_name: newMember.customer_name,
        email: newMember.email || null,
        tier: newMember.tier || null,
        points: parseInt(newMember.points) || 0,
        referrals: parseInt(newMember.referrals) || 0,
      });
      // re-fetch members to get program_name join
      const updated = await fetchJSON('/api/referral-loyalty/members/list');
      setMembers(updated);
      setNewMember({ program_id: '', customer_name: '', email: '', tier: '', points: '', referrals: '' });
      setShowAddMember(false);
    } catch (err) { console.error(err); }
  };

  const removeProgram = async (id) => {
    try {
      await deleteJSON(`/api/referral-loyalty/${id}`);
      setPrograms(prev => prev.filter(p => p.id !== id));
      setMembers(prev => prev.filter(m => m.program_id !== id));
    } catch (err) { console.error(err); }
  };

  const updateMember = async (id, tier, points) => {
    try {
      await putJSON(`/api/referral-loyalty/members/${id}`, { tier, points });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, tier, points } : m));
    } catch (err) { console.error(err); }
  };

  const removeMember = async (id) => {
    try {
      await deleteJSON(`/api/referral-loyalty/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) { console.error(err); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/referral-loyalty/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const activePrograms = programs.filter(p => p.status === 'active').length;
  const totalMembers = members.length;
  const totalReferrals = members.reduce((sum, m) => sum + (m.referrals || 0), 0);
  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>REFERRAL & LOYALTY</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Loyalty & Referral Programs</h1>
        <p className="text-base text-gray-500">Build and manage customer loyalty programs and referral campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'ACTIVE PROGRAMS', value: loading ? '\u2014' : activePrograms.toString() },
          { label: 'TOTAL MEMBERS', value: loading ? '\u2014' : totalMembers.toLocaleString() },
          { label: 'TOTAL REFERRALS', value: loading ? '\u2014' : totalReferrals.toLocaleString() },
          { label: 'TOTAL POINTS', value: loading ? '\u2014' : totalPoints >= 1000 ? `${(totalPoints / 1000).toFixed(1)}K` : totalPoints.toString() },
        ].map((s, i) => (
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-2">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {['programs', 'members', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Programs */}
      {tab === 'programs' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end mb-1">
            <button onClick={() => setShowAddProgram(!showAddProgram)} className="chip text-[10px]" style={{ background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR }}>+ Add Program</button>
          </div>
          {showAddProgram && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newProgram.name} onChange={e => setNewProgram({ ...newProgram, name: e.target.value })} placeholder="Program name" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newProgram.type} onChange={e => setNewProgram({ ...newProgram, type: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="">Type (optional)</option>
                  <option value="Points">Points</option>
                  <option value="Referral">Referral</option>
                  <option value="Tiered">Tiered</option>
                  <option value="Event">Event</option>
                </select>
                <input value={newProgram.reward_type} onChange={e => setNewProgram({ ...newProgram, reward_type: e.target.value })} placeholder="Reward type (e.g. discount, credit)" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newProgram.reward_value} onChange={e => setNewProgram({ ...newProgram, reward_value: e.target.value })} placeholder="Reward value (e.g. 10%)" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newProgram.rules} onChange={e => setNewProgram({ ...newProgram, rules: e.target.value })} placeholder="Rules (optional)" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <button onClick={addProgram} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>Create Program</button>
            </div>
          )}
          {programs.length === 0 && !loading && (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No programs yet</p>
              <p className="text-xs text-gray-600 mt-1">Create your first loyalty or referral program to get started</p>
            </div>
          )}
          {loading && programs.length === 0 && <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
            {programs.map(prog => (
              <div key={prog.id} className="group panel rounded-2xl p-4 sm:p-6 hover:border-rose-600/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-200">{prog.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{prog.type ? `${prog.type} Program` : 'Program'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: prog.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)', color: prog.status === 'active' ? '#22c55e' : '#6b7280', border: `1px solid ${prog.status === 'active' ? 'rgba(34,197,94,0.25)' : 'rgba(107,114,128,0.25)'}` }}>
                      {prog.status}
                    </span>
                    <button onClick={() => removeProgram(prog.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {prog.reward_type && (
                    <div>
                      <span className="text-gray-500">Reward Type</span>
                      <p className="font-mono font-bold text-gray-300">{prog.reward_type}</p>
                    </div>
                  )}
                  {prog.reward_value && (
                    <div>
                      <span className="text-gray-500">Reward Value</span>
                      <p className="font-mono font-bold" style={{ color: MODULE_COLOR }}>{prog.reward_value}</p>
                    </div>
                  )}
                  {prog.rules && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Rules</span>
                      <p className="text-gray-400 mt-0.5">{prog.rules}</p>
                    </div>
                  )}
                </div>
                {!prog.reward_type && !prog.reward_value && !prog.rules && (
                  <p className="text-xs text-gray-600 italic">No reward details configured</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end mb-1">
            <button onClick={() => setShowAddMember(!showAddMember)} className="chip text-[10px]" style={{ background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR }}>+ Add Member</button>
          </div>
          {showAddMember && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newMember.customer_name} onChange={e => setNewMember({ ...newMember, customer_name: e.target.value })} placeholder="Customer name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="Email (optional)" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newMember.program_id} onChange={e => setNewMember({ ...newMember, program_id: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="">Select program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={newMember.tier} onChange={e => setNewMember({ ...newMember, tier: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  <option value="">Tier (optional)</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
                <input value={newMember.points} onChange={e => setNewMember({ ...newMember, points: e.target.value })} placeholder="Points (0)" type="number" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newMember.referrals} onChange={e => setNewMember({ ...newMember, referrals: e.target.value })} placeholder="Referrals (0)" type="number" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <button onClick={addMember} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>Add Member</button>
            </div>
          )}
          {members.length === 0 && !loading && (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No members yet</p>
              <p className="text-xs text-gray-600 mt-1">Add members to your loyalty programs to start tracking</p>
            </div>
          )}
          {loading && members.length === 0 && <div className="panel rounded-2xl p-8 text-center text-sm text-gray-600">Loading...</div>}
          <div className="panel rounded-2xl overflow-hidden overflow-x-auto">
            <div className="divide-y divide-indigo-500/[0.04]">
              {members.map(m => (
                <div key={m.id} className="group flex items-center gap-3 sm:gap-6 px-3 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0" style={{ background: `${TIER_COLORS[m.tier] || '#6b7280'}15`, color: TIER_COLORS[m.tier] || '#6b7280' }}>
                    {m.customer_name ? m.customer_name.split(' ').map(n => n[0]).join('') : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 truncate">{m.customer_name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.email || '\u2014'}</p>
                    {m.program_name && <p className="text-[10px] text-gray-600">{m.program_name}</p>}
                  </div>
                  <select
                    value={m.tier || ''}
                    onChange={e => updateMember(m.id, e.target.value, m.points || 0)}
                    className="input-field rounded px-2 py-1 text-[10px] font-bold flex-shrink-0"
                    style={{ color: TIER_COLORS[m.tier] || '#6b7280', borderColor: `${TIER_COLORS[m.tier] || '#6b7280'}40`, background: `${TIER_COLORS[m.tier] || '#6b7280'}10`, minWidth: '80px' }}
                  >
                    <option value="">No Tier</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                  <div className="text-right hidden md:block flex-shrink-0">
                    <input
                      type="number"
                      value={m.points || 0}
                      onChange={e => updateMember(m.id, m.tier || '', parseInt(e.target.value) || 0)}
                      className="input-field rounded px-2 py-1 text-sm font-mono font-bold text-gray-300 text-right w-20"
                      min="0"
                    />
                    <p className="text-xs text-gray-600 mt-0.5">points</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-mono font-bold" style={{ color: MODULE_COLOR }}>{m.referrals || 0}</p>
                    <p className="text-xs text-gray-600">referrals</p>
                  </div>
                  <button onClick={() => removeMember(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all flex-shrink-0">&times;</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          {/* Points Economy Designer */}
          <div className="rounded-2xl overflow-hidden animate-fade-in mb-4" style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.14)' }}>
            <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(244,63,94,0.08)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,63,94,0.12)' }}>
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
              </div>
              <div>
                <p className="text-base font-semibold text-white">Points Economy Designer</p>
                <p className="text-sm text-gray-500">Design a balanced loyalty points system for your customers</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              <div>
                <p className="hud-label text-xs mb-2">PRODUCT CATEGORY</p>
                <input className="input w-full px-4 py-3 text-sm rounded-xl" placeholder="e.g. skincare, supplements" value={pointsInputs.product_category} onChange={e => setPointsInputs(p => ({ ...p, product_category: e.target.value }))} />
              </div>
              <div>
                <p className="hud-label text-xs mb-2">AVERAGE ORDER VALUE ($)</p>
                <input className="input w-full px-4 py-3 text-sm rounded-xl" type="number" placeholder="e.g. 75" value={pointsInputs.avg_order_value} onChange={e => setPointsInputs(p => ({ ...p, avg_order_value: e.target.value }))} />
              </div>
              <div>
                <p className="hud-label text-xs mb-2">DESIRED REWARDS</p>
                <input className="input w-full px-4 py-3 text-sm rounded-xl" placeholder="e.g. discounts, free shipping, early access" value={pointsInputs.desired_rewards} onChange={e => setPointsInputs(p => ({ ...p, desired_rewards: e.target.value }))} />
              </div>
              <button className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(244,63,94,0.12)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.22)' }}
                disabled={!pointsInputs.product_category || pointsLoading}
                onClick={() => {
                  setPointsOutput('');
                  setPointsLoading(true);
                  connectSSE('/api/referral-loyalty/design-points-economy', pointsInputs, {
                    onChunk: (text) => setPointsOutput(prev => prev + text),
                    onResult: () => setPointsLoading(false),
                    onError: () => setPointsLoading(false),
                    onDone: () => setPointsLoading(false),
                  });
                }}>{pointsLoading ? 'Designing...' : 'Design Points Economy'}</button>
              {pointsOutput && (
                <div className="rounded-xl p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {pointsOutput}
                </div>
              )}
            </div>
          </div>

          {/* Viral Coefficient Calculator */}
          <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.14)' }}>
            <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(244,63,94,0.08)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,63,94,0.12)' }}>
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
              </div>
              <div>
                <p className="text-base font-semibold text-white">Viral Coefficient (K-Factor)</p>
                <p className="text-sm text-gray-500">Calculate how virally your product is spreading</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[['Total Users', 'total_users', '1000'], ['Referred Users', 'referred_users', '150'], ['Avg Referrals/User', 'avg_referrals_per_user', '1.5']].map(([label, key, placeholder]) => (
                  <div key={key}>
                    <p className="hud-label text-xs mb-2">{label.toUpperCase()}</p>
                    <input className="input w-full px-4 py-3 text-sm rounded-xl" type="number" step="0.1" placeholder={placeholder} value={viralInputs[key]} onChange={e => setViralInputs(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(244,63,94,0.12)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.22)' }}
                onClick={async () => {
                  try { const result = await postJSON('/api/referral-loyalty/calculate-viral-coefficient', viralInputs); setViralData(result); } catch {}
                }}>Calculate K-Factor</button>
              {viralData && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-black" style={{ color: parseFloat(viralData.k_factor) >= 1 ? '#22c55e' : parseFloat(viralData.k_factor) >= 0.5 ? '#fb7185' : '#ef4444' }}>
                      K={viralData.k_factor}
                    </div>
                    <div>
                      <div className="chip mb-1.5">{viralData.growth_type}</div>
                      <p className="text-xs text-gray-400 leading-relaxed">{viralData.interpretation}</p>
                    </div>
                  </div>
                  {viralData.recommendations?.length > 0 && (
                    <div>
                      <p className="hud-label text-[10px] mb-2">RECOMMENDATIONS</p>
                      <div className="space-y-1">
                        {viralData.recommendations.map((rec, i) => <p key={i} className="text-xs text-gray-400">• {rec}</p>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-rose-600/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7 overflow-x-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
      <AIInsightsPanel moduleId="referral-loyalty" />
    </div>
  );
}

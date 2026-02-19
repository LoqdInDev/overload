import { useState } from 'react';

const MODULE_COLOR = '#e11d48';

const AI_TEMPLATES = [
  { name: 'Design Loyalty Program', prompt: 'Design a tiered loyalty program with point earning rules, tier thresholds, exclusive benefits per tier, and engagement mechanics to maximize retention' },
  { name: 'Generate Referral Copy', prompt: 'Write persuasive referral program copy including invitation emails, social share messages, landing page headlines, and thank-you notifications' },
  { name: 'Build VIP Tier Structure', prompt: 'Create a VIP tier structure with 4-5 tiers including names, qualification criteria, benefits, and upgrade incentives that drive aspirational spending' },
  { name: 'Create Rewards Strategy', prompt: 'Develop a comprehensive rewards strategy including point values, redemption options, bonus events calendar, and gamification elements' },
];

const MOCK_PROGRAMS = [
  { id: 1, name: 'Points Rewards Program', type: 'Points', members: 4280, status: 'active', pointsIssued: '1.2M', redemptionRate: '34%' },
  { id: 2, name: 'Refer-a-Friend', type: 'Referral', members: 1890, status: 'active', referrals: 342, conversion: '28%' },
  { id: 3, name: 'VIP Club', type: 'Tiered', members: 820, status: 'active', tiers: 4, avgSpend: '$245' },
  { id: 4, name: 'Birthday Rewards', type: 'Event', members: 3150, status: 'paused', redemptions: 189, revenue: '$14.2K' },
];

const MOCK_MEMBERS = [
  { id: 1, name: 'Emily Rodriguez', email: 'emily@example.com', tier: 'Platinum', points: 14500, referrals: 12, joined: '2025-03-15' },
  { id: 2, name: 'Alex Thompson', email: 'alex@example.com', tier: 'Gold', points: 8200, referrals: 7, joined: '2025-06-22' },
  { id: 3, name: 'Jordan Lee', email: 'jordan@example.com', tier: 'Gold', points: 6800, referrals: 4, joined: '2025-08-10' },
  { id: 4, name: 'Samantha Clark', email: 'sam@example.com', tier: 'Silver', points: 3400, referrals: 2, joined: '2025-11-05' },
  { id: 5, name: 'Marcus White', email: 'marcus@example.com', tier: 'Silver', points: 2100, referrals: 1, joined: '2025-12-18' },
  { id: 6, name: 'Olivia Brown', email: 'olivia@example.com', tier: 'Bronze', points: 850, referrals: 0, joined: '2026-01-22' },
  { id: 7, name: 'Daniel Nguyen', email: 'daniel@example.com', tier: 'Platinum', points: 18200, referrals: 15, joined: '2025-01-08' },
];

const TIER_COLORS = { Platinum: '#a78bfa', Gold: '#f59e0b', Silver: '#9ca3af', Bronze: '#d97706' };

export default function ReferralLoyaltyPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/referral-loyalty/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>REFERRAL & LOYALTY</p>
        <h1 className="text-2xl font-bold text-white mb-1">Loyalty & Referral Programs</h1>
        <p className="text-sm text-gray-500">Build and manage customer loyalty programs and referral campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'ACTIVE PROGRAMS', value: '3', sub: '1 paused' },
          { label: 'TOTAL MEMBERS', value: '6,990', sub: '+340 this month' },
          { label: 'REFERRALS THIS MONTH', value: '127', sub: '28% conversion rate' },
          { label: 'POINTS ISSUED', value: '1.2M', sub: '34% redeemed' },
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
        {['overview', 'programs', 'members', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>TIER DISTRIBUTION</p>
              <div className="space-y-3">
                {[
                  { tier: 'Platinum', count: 420, pct: 6, color: '#a78bfa' },
                  { tier: 'Gold', count: 1380, pct: 20, color: '#f59e0b' },
                  { tier: 'Silver', count: 2640, pct: 38, color: '#9ca3af' },
                  { tier: 'Bronze', count: 2550, pct: 36, color: '#d97706' },
                ].map((t, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-semibold" style={{ color: t.color }}>{t.tier}</span>
                      <span className="text-gray-500 font-mono">{t.count.toLocaleString()} ({t.pct}%)</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${t.pct}%`, background: t.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>REFERRAL PERFORMANCE</p>
              <div className="space-y-2">
                {[
                  { metric: 'Invites Sent', value: '1,842' },
                  { metric: 'Clicks', value: '634' },
                  { metric: 'Sign-ups', value: '342' },
                  { metric: 'First Purchase', value: '127' },
                  { metric: 'Referral Revenue', value: '$18,420' },
                ].map((m, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-indigo-500/[0.04] last:border-0">
                    <span className="text-gray-400">{m.metric}</span>
                    <span className="font-mono font-bold text-gray-200">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>TOP REWARDS REDEEMED</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { reward: '$10 Store Credit', redeemed: 890, points: 1000 },
                { reward: 'Free Shipping', redeemed: 1240, points: 500 },
                { reward: '20% Off Coupon', redeemed: 456, points: 2000 },
                { reward: 'Exclusive Product', redeemed: 78, points: 5000 },
              ].map((r, i) => (
                <div key={i} className="bg-white/[0.02] rounded-lg p-3 border border-indigo-500/[0.06]">
                  <p className="text-xs font-semibold text-gray-300">{r.reward}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{r.points} pts required</p>
                  <p className="text-sm font-bold font-mono mt-2" style={{ color: MODULE_COLOR }}>{r.redeemed}</p>
                  <p className="text-[10px] text-gray-600">times redeemed</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Programs */}
      {tab === 'programs' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3">
          {MOCK_PROGRAMS.map(prog => (
            <div key={prog.id} className="panel rounded-xl p-4 hover:border-rose-600/20 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-200">{prog.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{prog.type} Program</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: prog.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)', color: prog.status === 'active' ? '#22c55e' : '#6b7280', border: `1px solid ${prog.status === 'active' ? 'rgba(34,197,94,0.25)' : 'rgba(107,114,128,0.25)'}` }}>
                  {prog.status}
                </span>
              </div>
              <p className="text-xl font-bold font-mono text-white">{prog.members.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mb-3">members enrolled</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {prog.type === 'Points' && (
                  <>
                    <div><span className="text-gray-500">Points Issued</span><p className="font-mono font-bold text-gray-300">{prog.pointsIssued}</p></div>
                    <div><span className="text-gray-500">Redemption Rate</span><p className="font-mono font-bold" style={{ color: MODULE_COLOR }}>{prog.redemptionRate}</p></div>
                  </>
                )}
                {prog.type === 'Referral' && (
                  <>
                    <div><span className="text-gray-500">Referrals</span><p className="font-mono font-bold text-gray-300">{prog.referrals}</p></div>
                    <div><span className="text-gray-500">Conversion</span><p className="font-mono font-bold" style={{ color: MODULE_COLOR }}>{prog.conversion}</p></div>
                  </>
                )}
                {prog.type === 'Tiered' && (
                  <>
                    <div><span className="text-gray-500">Tiers</span><p className="font-mono font-bold text-gray-300">{prog.tiers}</p></div>
                    <div><span className="text-gray-500">Avg Spend</span><p className="font-mono font-bold" style={{ color: MODULE_COLOR }}>{prog.avgSpend}</p></div>
                  </>
                )}
                {prog.type === 'Event' && (
                  <>
                    <div><span className="text-gray-500">Redemptions</span><p className="font-mono font-bold text-gray-300">{prog.redemptions}</p></div>
                    <div><span className="text-gray-500">Revenue</span><p className="font-mono font-bold" style={{ color: MODULE_COLOR }}>{prog.revenue}</p></div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div className="animate-fade-in">
          <div className="panel rounded-xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_MEMBERS.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${TIER_COLORS[m.tier]}15`, color: TIER_COLORS[m.tier] }}>
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-300 truncate">{m.name}</p>
                    <p className="text-[10px] text-gray-500">{m.email}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${TIER_COLORS[m.tier]}15`, color: TIER_COLORS[m.tier], border: `1px solid ${TIER_COLORS[m.tier]}25` }}>
                    {m.tier}
                  </span>
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-mono font-bold text-gray-300">{m.points.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-600">points</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-mono font-bold" style={{ color: MODULE_COLOR }}>{m.referrals}</p>
                    <p className="text-[10px] text-gray-600">referrals</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-rose-600/30' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

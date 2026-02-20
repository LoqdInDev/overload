import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import AIToolsTab from '../../components/shared/AIToolsTab';

const MODULE_COLOR = '#64748b';

const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', period: '/mo', current: false,
    features: ['3 modules', '100 AI generations/mo', '1 team member', 'Basic analytics'],
  },
  {
    id: 'pro', name: 'Pro', price: '$99', period: '/mo', current: true,
    features: ['All modules', '5,000 AI generations/mo', '10 team members', 'Advanced analytics', 'Priority support', 'Autopilot mode'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$299', period: '/mo', current: false,
    features: ['Everything in Pro', 'Unlimited AI generations', 'Unlimited team members', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'SSO & SAML'],
  },
];

const MOCK_INVOICES = [
  { id: 1, date: 'Feb 1, 2026', amount: '$99.00', status: 'paid', period: 'Feb 2026' },
  { id: 2, date: 'Jan 1, 2026', amount: '$99.00', status: 'paid', period: 'Jan 2026' },
  { id: 3, date: 'Dec 1, 2025', amount: '$99.00', status: 'paid', period: 'Dec 2025' },
  { id: 4, date: 'Nov 1, 2025', amount: '$99.00', status: 'paid', period: 'Nov 2025' },
  { id: 5, date: 'Oct 1, 2025', amount: '$99.00', status: 'paid', period: 'Oct 2025' },
  { id: 6, date: 'Sep 1, 2025', amount: '$79.00', status: 'paid', period: 'Sep 2025' },
];

const MOCK_USAGE = [
  { module: 'Content', used: 450, limit: 1000, color: '#f97316' },
  { module: 'Video', used: 120, limit: 500, color: '#8b5cf6' },
  { module: 'Ads', used: 340, limit: 800, color: '#10b981' },
  { module: 'Email', used: 890, limit: 1000, color: '#f59e0b' },
  { module: 'Social', used: 620, limit: 1000, color: '#3b82f6' },
  { module: 'SEO', used: 210, limit: 500, color: '#ec4899' },
  { module: 'Creative', used: 180, limit: 500, color: '#6366f1' },
];

const AI_TEMPLATES = [
  { name: 'Cost Optimization Tips', prompt: 'Analyze current usage patterns and provide actionable tips to optimize costs and get more value from the current plan' },
  { name: 'Usage Forecast', prompt: 'Based on current usage trends, forecast expected usage for the next 3 months and recommend if a plan change is needed' },
  { name: 'Plan Comparison Analysis', prompt: 'Provide a detailed comparison analysis of all available plans highlighting which features provide the most ROI for this account' },
  { name: 'ROI Calculator', prompt: 'Calculate the return on investment from using the marketing OS including time saved, content generated, and estimated revenue impact' },
];

export default function BillingPage() {
  const { dark } = useTheme();
  const [tab, setTab] = useState('plan');
  const [planModal, setPlanModal] = useState(null); // 'free' | 'enterprise' | null
  const [toast, setToast] = useState(null);

  const panelCls = dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm';
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-500' : 'text-gray-500';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePlanAction = (planId) => {
    setPlanModal(planId);
  };

  const confirmPlanChange = () => {
    const plan = PLANS.find(p => p.id === planModal);
    showToast(`Plan change to ${plan?.name} requested. Our team will reach out shortly.`);
    setPlanModal(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>BILLING & USAGE</p>
        <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Billing</h1>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-xs font-semibold shadow-lg animate-fade-in ${
          dark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
        }`}>
          {toast}
        </div>
      )}

      {/* Current Plan Card */}
      <div className={`${panelCls} rounded-xl p-5 mb-6 animate-fade-in`} style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-lg font-bold ${textPrimary}`}>Pro Plan</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>CURRENT</span>
              </div>
              <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Next billing: March 1, 2026</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold font-mono ${textPrimary}`}>$99<span className={`text-sm ${textSecondary}`}>/mo</span></p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {['plan', 'invoices', 'usage', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`chip text-xs ${tab === t ? 'active' : ''}`}
            style={tab === t ? { background: dark ? 'rgba(100,116,139,0.2)' : 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.35)', color: dark ? '#94a3b8' : '#475569' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Plan Tab */}
      {tab === 'plan' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in stagger">
          {PLANS.map(plan => (
            <div key={plan.id} className={`${panelCls} rounded-xl p-5 transition-all ${plan.current ? 'border-indigo-500/20' : dark ? 'hover:border-indigo-500/10' : 'hover:shadow-md'}`}
              style={plan.current ? { background: dark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.02)' } : {}}>
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-bold ${textPrimary}`}>{plan.name}</p>
                {plan.current && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>CURRENT</span>
                )}
              </div>
              <div className="mb-4">
                <span className={`text-3xl font-bold font-mono ${textPrimary}`}>{plan.price}</span>
                <span className={`text-sm ${textSecondary}`}>{plan.period}</span>
              </div>
              <div className="space-y-2 mb-5">
                {plan.features.map((f, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              {plan.current ? (
                <button className={`w-full py-2.5 rounded-lg text-xs font-bold border cursor-default ${dark ? 'border-indigo-500/15 text-gray-400' : 'border-gray-200 text-gray-400'}`}>
                  Current Plan
                </button>
              ) : (
                <button onClick={() => handlePlanAction(plan.id)}
                  className="w-full py-2.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: plan.id === 'enterprise' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : dark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
                    color: plan.id === 'enterprise' ? '#fff' : '#818cf8',
                    border: `1px solid ${plan.id === 'enterprise' ? 'transparent' : 'rgba(99,102,241,0.2)'}`,
                    boxShadow: plan.id === 'enterprise' ? '0 4px 20px -4px rgba(99,102,241,0.4)' : 'none',
                  }}>
                  {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div className="animate-fade-in">
          <div className={`${panelCls} rounded-xl overflow-hidden`}>
            <div className={`grid grid-cols-4 px-4 py-3 ${dark ? 'border-b border-indigo-500/[0.04]' : 'border-b border-gray-100'}`}>
              <span className={`text-[10px] font-bold ${textSecondary}`}>DATE</span>
              <span className={`text-[10px] font-bold ${textSecondary}`}>PERIOD</span>
              <span className={`text-[10px] font-bold ${textSecondary}`}>AMOUNT</span>
              <span className={`text-[10px] font-bold text-right ${textSecondary}`}>STATUS</span>
            </div>
            <div className={`divide-y ${dark ? 'divide-indigo-500/[0.04]' : 'divide-gray-100'}`}>
              {MOCK_INVOICES.map(inv => (
                <div key={inv.id} className={`grid grid-cols-4 px-4 py-3 items-center transition-colors ${dark ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50'}`}>
                  <span className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{inv.date}</span>
                  <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{inv.period}</span>
                  <span className={`text-xs font-mono font-bold ${textPrimary}`}>{inv.amount}</span>
                  <div className="text-right">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: inv.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: inv.status === 'paid' ? '#4ade80' : '#fbbf24', border: `1px solid ${inv.status === 'paid' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && (
        <div className="animate-fade-in space-y-4">
          <div className={`${panelCls} rounded-xl p-5`}>
            <p className="hud-label mb-4" style={{ color: MODULE_COLOR }}>AI GENERATION USAGE</p>
            <div className="space-y-4">
              {MOCK_USAGE.map(u => (
                <div key={u.module}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: u.color }} />
                      <span className={`text-xs font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{u.module}</span>
                    </div>
                    <span className={`text-xs font-mono ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className={`font-bold ${textPrimary}`}>{u.used}</span> / {u.limit} gens
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${dark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(u.used / u.limit) * 100}%`, background: u.color, boxShadow: `0 0 8px ${u.color}40` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-5 pt-4 ${dark ? 'border-t border-indigo-500/[0.06]' : 'border-t border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Total Used</span>
                <span className={`text-sm font-mono font-bold ${textPrimary}`}>
                  {MOCK_USAGE.reduce((a, b) => a + b.used, 0).toLocaleString()} <span className={textSecondary}>/ 5,000</span>
                </span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden mt-2 ${dark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(MOCK_USAGE.reduce((a, b) => a + b.used, 0) / 5000) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', boxShadow: '0 0 12px rgba(99,102,241,0.3)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <AIToolsTab templates={AI_TEMPLATES} color={MODULE_COLOR} apiEndpoint="/api/billing/generate" />
      )}

      {/* Plan Change Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPlanModal(null)}>
          <div className={`${dark ? 'bg-[#0c0c14] border-white/[0.06]' : 'bg-white border-gray-200'} border rounded-2xl p-6 w-full max-w-sm mx-4`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>
              {planModal === 'free' ? 'Downgrade to Free' : 'Upgrade to Enterprise'}
            </h3>
            <p className={`text-sm mb-5 ${textSecondary}`}>
              {planModal === 'free'
                ? 'You will lose access to premium features at the end of your current billing cycle.'
                : 'Our team will reach out to set up your Enterprise account with custom onboarding.'}
            </p>

            {planModal === 'enterprise' && (
              <div className={`${dark ? 'bg-indigo-500/5 border border-indigo-500/15' : 'bg-indigo-50 border border-indigo-100'} rounded-xl p-4 mb-5`}>
                <p className={`text-xs font-semibold ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>Enterprise includes:</p>
                <ul className={`text-[11px] mt-2 space-y-1 ${dark ? 'text-indigo-300/80' : 'text-indigo-500'}`}>
                  <li>Unlimited AI generations</li>
                  <li>Dedicated account manager</li>
                  <li>Custom integrations & SSO</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPlanModal(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${dark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.04]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}>
                Cancel
              </button>
              <button onClick={confirmPlanChange}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: planModal === 'free' ? '#ef4444' : '#6366f1' }}>
                {planModal === 'free' ? 'Downgrade' : 'Contact Sales'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { fetchJSON, postJSON } from '../lib/api';

const PLAN_ORDER = ['manual', 'copilot', 'autopilot'];
const PLAN_ICONS = {
  manual: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  ),
  copilot: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  autopilot: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

const STATUS_LABELS = {
  trialing: 'Free Trial',
  active: 'Active',
  past_due: 'Past Due',
  canceled: 'Canceled',
  none: 'No Plan',
};

const STATUS_COLORS = {
  trialing: '#5E8E6E',
  active: '#5E8E6E',
  past_due: '#C45D3E',
  canceled: '#94908A',
  none: '#94908A',
};

export default function BillingPage() {
  const { dark } = useTheme();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState({});
  const [trialDays, setTrialDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const bg = dark ? '#1A1816' : '#FBF7F0';
  const cardBg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const muted = '#94908A';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#F8F6F3';

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessMsg('Subscription activated successfully! Welcome aboard.');
    }
    if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled. No charges were made.');
    }
  }, [searchParams]);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoading(true);
      const data = await fetchJSON('/api/billing/subscription');
      setSubscription({ plan: data.plan, status: data.status, trialEndsAt: data.trialEndsAt, currentPeriodEnd: data.currentPeriodEnd, cancelAtPeriodEnd: data.cancelAtPeriodEnd });
      setPlans(data.plans || {});
      setTrialDays(data.trialDays || 14);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(plan) {
    try {
      setActionLoading(plan);
      setError('');
      const data = await postJSON('/api/billing/create-checkout', { plan });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManageBilling() {
    try {
      setActionLoading('portal');
      setError('');
      const data = await postJSON('/api/billing/portal', {});
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSubscription() {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) return;

    try {
      setActionLoading('cancel');
      setError('');
      await postJSON('/api/billing/cancel', {});
      setSuccessMsg('Subscription will be canceled at the end of your billing period.');
      await loadSubscription();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(iso) {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2.5 min-h-[400px]">
        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C45D3E', animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#5E8E6E', animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C45D3E', animationDelay: '300ms' }} />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const currentStatus = subscription?.status || 'none';
  const hasActiveSubscription = ['trialing', 'active'].includes(currentStatus);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: ink, fontFamily: "'Fraunces', Georgia, serif" }}>
          Billing & Subscription
        </h1>
        <p className="text-[13px] mt-1" style={{ color: muted }}>
          Manage your plan, billing details, and payment history.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div
          className="px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
          style={{ background: 'rgba(94,142,110,0.1)', color: '#5E8E6E', border: '1px solid rgba(94,142,110,0.15)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-auto opacity-60 hover:opacity-100">x</button>
        </div>
      )}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
          style={{ background: 'rgba(196,93,62,0.1)', color: '#C45D3E', border: '1px solid rgba(196,93,62,0.15)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">x</button>
        </div>
      )}

      {/* Current Plan Status */}
      {hasActiveSubscription && (
        <div
          className="rounded-2xl p-6"
          style={{ background: cardBg, border: `1px solid ${border}`, boxShadow: dark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: muted }}>
                Current Plan
              </p>
              <h2 className="text-xl font-bold" style={{ color: ink, fontFamily: "'Fraunces', Georgia, serif" }}>
                Overload {plans[currentPlan]?.name || currentPlan}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: `${STATUS_COLORS[currentStatus]}18`, color: STATUS_COLORS[currentStatus] }}
                >
                  {STATUS_LABELS[currentStatus]}
                </span>
                {subscription?.cancelAtPeriodEnd && (
                  <span className="text-[12px]" style={{ color: '#C45D3E' }}>
                    Cancels {formatDate(subscription.currentPeriodEnd)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {currentStatus === 'trialing' && subscription?.trialEndsAt && (
                <p className="text-[12px] mb-1" style={{ color: muted }}>
                  Trial ends {formatDate(subscription.trialEndsAt)}
                </p>
              )}
              {subscription?.currentPeriodEnd && currentStatus !== 'trialing' && (
                <p className="text-[12px] mb-1" style={{ color: muted }}>
                  {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
              <p className="text-2xl font-bold" style={{ color: ink }}>
                ${plans[currentPlan] ? (plans[currentPlan].priceMonthly / 100).toFixed(0) : '0'}
                <span className="text-[13px] font-normal" style={{ color: muted }}>/mo</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 flex-wrap">
            <button
              onClick={handleManageBilling}
              disabled={actionLoading === 'portal'}
              className="px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200 hover:opacity-80 disabled:opacity-50"
              style={{ background: inputBg, border: `1px solid ${border}`, color: ink }}
            >
              {actionLoading === 'portal' ? 'Loading...' : 'Manage Billing'}
            </button>
            {!subscription?.cancelAtPeriodEnd && (
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading === 'cancel'}
                className="px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                style={{ background: 'rgba(196,93,62,0.08)', color: '#C45D3E', border: '1px solid rgba(196,93,62,0.12)' }}
              >
                {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: ink, fontFamily: "'Fraunces', Georgia, serif" }}>
          {hasActiveSubscription ? 'Change Plan' : 'Choose Your Plan'}
        </h2>
        <p className="text-[13px] mb-6" style={{ color: muted }}>
          All plans include a {trialDays}-day free trial. Cancel anytime.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_ORDER.map((planKey) => {
            const plan = plans[planKey];
            if (!plan) return null;
            const isCurrent = currentPlan === planKey && hasActiveSubscription;
            const isPopular = planKey === 'copilot';

            return (
              <div
                key={planKey}
                className="relative rounded-2xl p-6 transition-all duration-200"
                style={{
                  background: cardBg,
                  border: isCurrent
                    ? '2px solid #5E8E6E'
                    : isPopular
                    ? '2px solid #C45D3E'
                    : `1px solid ${border}`,
                  boxShadow: dark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)',
                }}
              >
                {isPopular && !isCurrent && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-white"
                    style={{ background: 'linear-gradient(135deg, #C45D3E 0%, #A84D33 100%)' }}
                  >
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-white"
                    style={{ background: '#5E8E6E' }}
                  >
                    Current Plan
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: inputBg, color: isCurrent ? '#5E8E6E' : '#C45D3E' }}
                  >
                    {PLAN_ICONS[planKey]}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ color: ink }}>{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold" style={{ color: ink }}>
                    ${(plan.priceMonthly / 100).toFixed(0)}
                  </span>
                  <span className="text-[13px]" style={{ color: muted }}>/month</span>
                </div>

                <p className="text-[12px] mb-6 leading-relaxed" style={{ color: muted }}>
                  {plan.description}
                </p>

                <button
                  onClick={() => handleSelectPlan(planKey)}
                  disabled={isCurrent || actionLoading === planKey}
                  className="w-full py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    isCurrent
                      ? { background: inputBg, color: muted, border: `1px solid ${border}` }
                      : { background: 'linear-gradient(135deg, #C45D3E 0%, #A84D33 100%)', color: '#FFFFFF' }
                  }
                >
                  {actionLoading === planKey
                    ? 'Redirecting...'
                    : isCurrent
                    ? 'Current Plan'
                    : hasActiveSubscription
                    ? 'Switch Plan'
                    : `Start ${trialDays}-Day Trial`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ / Fine print */}
      <div
        className="rounded-2xl p-6"
        style={{ background: cardBg, border: `1px solid ${border}`, boxShadow: dark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <h3 className="text-[14px] font-bold mb-4" style={{ color: ink }}>Frequently Asked Questions</h3>
        <div className="space-y-4">
          {[
            { q: 'What happens during my free trial?', a: `You get full access to your chosen plan for ${trialDays} days. No charge until the trial ends. Cancel anytime.` },
            { q: 'Can I change plans later?', a: 'Absolutely. Upgrade or downgrade at any time. Changes take effect immediately with prorated billing.' },
            { q: 'How do I cancel?', a: 'Click "Cancel Subscription" above or go to Manage Billing. You\'ll keep access until the end of your billing period.' },
            { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) through our secure payment partner Stripe.' },
          ].map((faq, i) => (
            <div key={i}>
              <p className="text-[13px] font-semibold" style={{ color: ink }}>{faq.q}</p>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: muted }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

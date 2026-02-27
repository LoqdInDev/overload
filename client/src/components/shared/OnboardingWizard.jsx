import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { fetchJSON, postJSON } from '../../lib/api';

const STEPS = [
  {
    key: 'welcome',
    title: 'Welcome to Overload',
    subtitle: 'Your AI-powered marketing command center',
    description: 'Let\u2019s get you set up in 3 quick steps so your AI tools produce the best possible results.',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
    color: '#C45D3E',
  },
  {
    key: 'brand',
    title: 'Set Up Brand Profile',
    subtitle: 'Tell the AI who you are',
    description: 'Your brand name, voice, and audience help every AI module generate on-brand content from day one.',
    icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
    color: '#D4915C',
    path: '/brand-hub',
    cta: 'Go to Brand Hub',
  },
  {
    key: 'integration',
    title: 'Connect a Platform',
    subtitle: 'Link your marketing tools',
    description: 'Connect Google Ads, Meta, Shopify, or any of 14+ platforms to unlock cross-channel analytics and automation.',
    icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
    color: '#5E8E6E',
    path: '/integrations',
    cta: 'Go to Integrations',
  },
  {
    key: 'content',
    title: 'Create Your First Content',
    subtitle: 'See AI in action',
    description: 'Generate a blog post, ad copy, or social content. The AI uses your brand profile for perfect results.',
    icon: 'M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l12.15-12.15z',
    color: '#8B7355',
    path: '/content',
    cta: 'Go to Content Creator',
  },
  {
    key: 'complete',
    title: 'You\u2019re All Set!',
    subtitle: 'Your command center is ready',
    description: 'All core setup complete. Explore 39 AI-powered modules across marketing, advertising, analytics, and automation.',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: '#5E8E6E',
  },
];

export default function OnboardingWizard({ onComplete, onDismiss }) {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState({ brand: false, integration: false, firstContent: false });

  useEffect(() => {
    fetchJSON('/api/onboarding/state').then(data => {
      setStep(data.currentStep || 0);
      setSteps(data.steps || {});
    }).catch(() => {});
  }, []);

  const goTo = useCallback((idx) => {
    setStep(idx);
    postJSON('/api/onboarding/step', { step: idx }).catch(() => {});
  }, []);

  const handleDismiss = useCallback(() => {
    postJSON('/api/onboarding/dismiss', {}).catch(() => {});
    onDismiss?.();
  }, [onDismiss]);

  const handleComplete = useCallback(() => {
    postJSON('/api/onboarding/complete', {}).catch(() => {});
    onComplete?.();
  }, [onComplete]);

  const handleNavigate = useCallback((path) => {
    navigate(path);
    onDismiss?.();
  }, [navigate, onDismiss]);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // Theme tokens
  const bg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.1)';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const muted = '#94908A';
  const t3 = dark ? '#6B6660' : '#94908A';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleDismiss} />
      <div
        className="relative w-full max-w-lg rounded-3xl shadow-2xl animate-fade-up overflow-hidden"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Progress bar */}
        <div className="flex gap-1.5 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{
              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)',
            }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: i <= step ? '100%' : '0%',
                background: i <= step ? current.color : 'transparent',
              }} />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-4 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{
            background: `${current.color}12`,
          }}>
            <svg className="w-8 h-8" style={{ color: current.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={current.icon} />
            </svg>
          </div>

          <h2 className="text-[20px] font-bold mb-1" style={{
            color: ink,
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
          }}>
            {current.title}
          </h2>
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: current.color }}>
            {current.subtitle}
          </p>
          <p className="text-[13px] leading-relaxed max-w-sm mx-auto" style={{ color: muted }}>
            {current.description}
          </p>

          {/* Step-specific checklist (middle steps) */}
          {!isFirst && !isLast && (
            <div className="mt-5 flex items-center justify-center gap-3">
              {['brand', 'integration', 'firstContent'].map((key, i) => {
                const done = steps[key];
                const labels = ['Brand', 'Integration', 'Content'];
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{
                      background: done ? '#5E8E6E' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)'),
                    }}>
                      {done && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: done ? '#5E8E6E' : t3 }}>
                      {labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
          <button onClick={handleDismiss} className="text-[12px] font-medium px-3 py-2 rounded-lg transition-colors" style={{ color: muted }}
            onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={() => goTo(step - 1)} className="text-[12px] font-medium px-4 py-2 rounded-lg transition-colors" style={{
                color: ink,
                background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
              }}>
                Back
              </button>
            )}

            {current.path ? (
              <button onClick={() => handleNavigate(current.path)} className="text-[12px] font-bold px-5 py-2.5 rounded-xl text-white transition-all" style={{
                background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`,
                boxShadow: `0 4px 12px -2px ${current.color}40`,
              }}>
                {current.cta}
              </button>
            ) : isLast ? (
              <button onClick={handleComplete} className="text-[12px] font-bold px-5 py-2.5 rounded-xl text-white transition-all" style={{
                background: 'linear-gradient(135deg, #5E8E6E, #5E8E6Edd)',
                boxShadow: '0 4px 12px -2px rgba(94,142,110,0.4)',
              }}>
                Get Started
              </button>
            ) : (
              <button onClick={() => goTo(step + 1)} className="text-[12px] font-bold px-5 py-2.5 rounded-xl text-white transition-all" style={{
                background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`,
                boxShadow: `0 4px 12px -2px ${current.color}40`,
              }}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════
   SCROLL-DRIVEN CARD ANIMATION
   Cards slide in from alternating sides
   as the user scrolls vertically
   ═══════════════════════════════════════════ */
function useCardScroll(progressRef) {
  useEffect(() => {
    const cards = document.querySelectorAll('[data-scroll-card]');
    if (!cards.length) return;

    let ticking = false;

    function update() {
      const vh = window.innerHeight;
      const isMobile = window.innerWidth < 768;
      const maxTx = isMobile ? 22 : 55;
      const maxRot = isMobile ? 0.4 : 1.5;
      let totalProgress = 0;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const raw = (vh - rect.top) / (vh * 0.55);
        const p = Math.max(0, Math.min(1, raw));
        const e = 1 - Math.pow(1 - p, 3);

        const dir = card.dataset.scrollCard === 'left' ? -1 : 1;
        const tx = (1 - e) * dir * maxTx;
        const rot = (1 - e) * dir * maxRot;
        const sc = 0.93 + e * 0.07;
        const op = Math.min(1, e * 2.2);

        card.style.transform = `translateX(${tx}%) rotate(${rot}deg) scale(${sc})`;
        card.style.opacity = op;
        totalProgress += p;
      });

      if (progressRef.current) {
        const pct = (totalProgress / cards.length) * 100;
        progressRef.current.style.height = `${pct}%`;
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [progressRef]);
}

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const num = parseInt(value, 10);
      if (isNaN(num)) { setDisplay(value); return; }
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        setDisplay(Math.round(ease * num).toString());
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{display}</span>;
}

/* ═══════════════════════════════════════════
   SIMPLE SVG ICONS (line style)
   ═══════════════════════════════════════════ */
const Icon = {
  bolt: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  play: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  pen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  bulb: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>
    </svg>
  ),
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/>
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  check: (color) => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke={color}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */
const SOLUTIONS = [
  { title: 'Your whole marketing team, in one place', desc: 'Content, ads, analytics, email — everything you used to need five people for, handled by one platform that actually works together.' },
  { title: 'Launch campaigns in minutes, not weeks', desc: 'Set your goals and watch campaigns go live across Google, Meta, and TikTok. Configured, optimized, and running before your coffee gets cold.' },
  { title: 'See what\'s actually working', desc: 'No more guessing. Unified reporting across every channel shows you exactly where your money goes and what it brings back.' },
];

const JOURNEY = [
  { title: 'Build Your Brand', desc: 'Set up your brand profile once. Overload learns your voice, audience, products, and goals.' },
  { title: 'Create Content', desc: 'Generate video ads, blog posts, social captions, email sequences, and creatives — all on-brand.' },
  { title: 'Launch Campaigns', desc: 'Paid ads go live across Google, Meta, and TikTok. Funnels and landing pages deployed instantly.' },
  { title: 'Grow Your Audience', desc: 'SEO optimized. Social scheduled. Influencers found. Referral programs launched and running.' },
  { title: 'Convert & Retain', desc: 'Email flows triggered. Cart recovery active. Loyalty programs running — all automatically.' },
  { title: 'Analyze Everything', desc: 'Unified dashboard with real ROAS, profit margins, and customer lifetime value at a glance.' },
  { title: 'Go on Autopilot', desc: 'Flip the switch. Overload runs your marketing 24/7. You just check in weekly.' },
];

const INTEGRATIONS = [
  'Shopify', 'Meta', 'Google', 'TikTok', 'Twitter/X', 'LinkedIn',
  'Klaviyo', 'Mailchimp', 'Stripe', 'HubSpot', 'YouTube', 'Pinterest',
  'Slack', 'Amazon', 'Notion', 'Airtable', 'Zapier', 'Snapchat',
];

const TESTIMONIALS = [
  { quote: "Overload replaced our entire 5-person marketing team. We're saving $30K/month and getting better results.", name: 'Sarah Chen', role: 'CEO, Lumina Beauty' },
  { quote: "The Advisor briefing every morning is like having a CMO who never sleeps. It caught a bleeding campaign before I even woke up.", name: 'Marcus Rodriguez', role: 'Founder, UrbanFit', big: true },
  { quote: "We went from $2K to $18K/month in revenue in 3 months. Autopilot mode is genuinely insane.", name: 'Jamie Park', role: 'Co-founder, NovaTech' },
  { quote: "I was skeptical about AI running my ads. Then it outperformed my agency by 3x in the first week.", name: 'Rachel Kim', role: 'DTC Brand Owner' },
  { quote: "Setup took 20 minutes. By the next morning, I had campaigns running on 4 platforms I'd never used before.", name: 'David Okafor', role: 'E-commerce Entrepreneur' },
];

const PRICING = [
  {
    name: 'Starter', desc: 'For solo founders getting started.', price: '$49', period: '/mo',
    features: ['All 43+ modules', 'AI content generation', 'Basic analytics', 'Email support', '5 campaigns/month'],
  },
  {
    name: 'Autopilot', desc: 'For growing businesses ready to scale.', price: '$149', period: '/mo', featured: true,
    features: ['Everything in Starter', 'Full autonomous execution', 'The Advisor daily briefings', 'Unlimited campaigns', 'Priority support', 'Custom integrations'],
  },
  {
    name: 'Blackout', desc: 'For brands that want total domination.', price: '$299', period: '/mo',
    features: ['Everything in Autopilot', '24/7 autonomous operations', 'Custom model training', 'Dedicated account manager', 'White-label reports', 'Full API access'],
  },
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const progressRef = useRef(null);
  useCardScroll(progressRef);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const go = () => navigate('/dashboard');

  return (
    <div className="lp">
      {/* Scroll progress indicator */}
      <div className="lp-progress-track hidden lg:block">
        <div ref={progressRef} className="lp-progress-fill" />
      </div>

      {/* ═══════ NAVBAR ═══════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--lp-terra)' }}>
              <span className="text-white text-sm font-black">O</span>
            </div>
            <span className="lp-serif" style={{ fontSize: 18, color: 'var(--lp-ink)' }}>Overload</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {['Platform', 'Modules', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="text-[13px] font-medium transition-colors duration-200"
                style={{ color: 'var(--lp-muted)' }}
                onMouseEnter={e => e.target.style.color = 'var(--lp-ink)'}
                onMouseLeave={e => e.target.style.color = 'var(--lp-muted)'}
              >{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <button onClick={go} className="text-[13px] font-medium hidden sm:block" style={{ color: 'var(--lp-muted)' }}
              onMouseEnter={e => e.target.style.color = 'var(--lp-ink)'}
              onMouseLeave={e => e.target.style.color = 'var(--lp-muted)'}
            >Sign in</button>
            <button onClick={go} className="lp-cta lp-cta-terra" style={{ padding: '10px 26px', fontSize: 13 }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden" style={{ background: 'var(--lp-cream)' }}>
        <div className="lp-hero-glow" />
        <div className="lp-hero-glow-2 hidden md:block" />

        <div className="text-center max-w-3xl mx-auto relative z-10 lp-hero-anim">
          <div style={{ marginBottom: 28 }}>
            <span className="lp-pill">Marketing OS</span>
          </div>

          <h1 className="lp-serif" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 4.8rem)', lineHeight: 1.08, letterSpacing: '-0.025em', marginBottom: 24 }}>
            <span style={{ color: 'var(--lp-ink)' }}>The marketing platform</span><br />
            <span style={{ color: 'var(--lp-terra)' }}>that runs itself</span>
          </h1>

          <p style={{ color: 'var(--lp-muted)', fontSize: 17, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Content, ads, email, analytics — 43 tools working together on autopilot. So you can get back to building.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={go} className="lp-cta lp-cta-terra" style={{ padding: '16px 44px', fontSize: 15 }}>
              Start free trial
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button onClick={go} className="lp-cta lp-cta-outline" style={{ padding: '16px 36px', fontSize: 15 }}>Watch demo</button>
          </div>

          <p style={{ color: 'var(--lp-muted)', fontSize: 13, marginTop: 32, opacity: 0.7 }}>
            Trusted by 2,000+ businesses worldwide
          </p>
        </div>
      </section>

      {/* ═══════ CARD STACK ═══════ */}
      <div className="lp-card-stack">

        {/* ── CARD 1: Stats ── */}
        <section data-scroll-card="left">
          <div className="lp-section-card lp-sc-light">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-0">
                {[
                  { val: '43', suf: '+', label: 'Active Modules' },
                  { val: '100', suf: '%', label: 'Autonomous' },
                  { val: '$0', suf: '', label: 'Extra Tools', raw: true },
                  { val: '10', suf: 'x', label: 'Faster Output' },
                ].map((s, i, arr) => (
                  <div key={i} className="flex items-center">
                    <div className="text-center px-6 md:px-10">
                      <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--lp-ink)', letterSpacing: '-0.04em', fontFamily: "'DM Sans', sans-serif" }}>
                        {s.raw ? s.val : <><AnimatedNumber value={s.val} />{s.suf}</>}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500, marginTop: 4 }}>{s.label}</p>
                    </div>
                    {i < arr.length - 1 && <div className="lp-divider hidden md:block" style={{ height: 40 }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 2: Why Overload ── */}
        <section data-scroll-card="right" id="platform">
          <div className="lp-section-card lp-sc-cream">
            <div className="max-w-5xl mx-auto">
              <div className="lp-card-tab">Why Overload</div>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 56, color: 'var(--lp-ink)' }}>
                One platform that replaces<br className="hidden md:block" />
                <span style={{ color: 'var(--lp-muted)' }}>your entire marketing stack</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SOLUTIONS.map((s, i) => (
                  <div key={i} className="lp-card" style={{ padding: 32 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: ['rgba(196,93,62,0.08)', 'rgba(94,142,110,0.1)', 'rgba(51,47,43,0.06)'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: ['var(--lp-terra)', 'var(--lp-sage)', 'var(--lp-ink)'][i] }}>
                        {['01', '02', '03'][i]}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 10, lineHeight: 1.3 }}>{s.title}</h3>
                    <p style={{ fontSize: 14, color: 'var(--lp-muted)', lineHeight: 1.7 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 3: Modules Bento ── */}
        <section data-scroll-card="left" id="modules">
          <div className="lp-section-card lp-sc-light">
            <div className="max-w-5xl mx-auto">
              <div className="lp-card-tab">43+ Modules</div>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 48, color: 'var(--lp-ink)' }}>
                Everything you need.<br className="hidden md:block" />
                <span style={{ color: 'var(--lp-muted)' }}>Nothing you don't.</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Autopilot — large */}
                <div className="lp-card md:col-span-2 md:row-span-2" style={{ padding: 32, background: 'var(--lp-blush)', borderColor: 'rgba(196,93,62,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                    <div className="lp-icon lp-icon-terra">{Icon.bolt}</div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-ink)' }}>Autopilot Mode</p>
                      <p style={{ fontSize: 12, color: 'var(--lp-muted)' }}>Runs everything around the clock</p>
                    </div>
                  </div>
                  <div style={{ borderRadius: 16, background: '#fff', padding: 20, border: '1px solid rgba(44,40,37,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lp-sage)', boxShadow: '0 0 8px rgba(94,142,110,0.4)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-sage)', letterSpacing: '0.04em' }}>RUNNING</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {['Content Generation', 'Ad Deployment', 'Email Sequences', 'Social Scheduling'].map((t, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>{t}</span>
                          <div style={{ width: 72, height: 5, borderRadius: 5, background: 'var(--lp-sand)' }}>
                            <div style={{ height: '100%', borderRadius: 5, background: j % 2 === 0 ? 'var(--lp-terra)' : 'var(--lp-sage)', width: `${70 + j * 8}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Video */}
                <div className="lp-card">
                  <div className="lp-icon lp-icon-sage" style={{ marginBottom: 14 }}>{Icon.play}</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 4 }}>Video Marketing</p>
                  <p style={{ fontSize: 12, color: 'var(--lp-muted)' }}>Script to screen in minutes</p>
                </div>

                {/* Analytics */}
                <div className="lp-card">
                  <div className="lp-icon lp-icon-ink" style={{ marginBottom: 14 }}>{Icon.chart}</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 10 }}>Analytics</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
                    {[40, 65, 45, 80, 55, 90, 70].map((h, j) => (
                      <div key={j} style={{ flex: 1, borderRadius: 3, height: h + '%', background: j === 5 ? 'var(--lp-terra)' : 'var(--lp-sand)' }} />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="lp-card">
                  <div className="lp-icon lp-icon-terra" style={{ marginBottom: 14 }}>{Icon.pen}</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 4 }}>Content Creation</p>
                  <p style={{ fontSize: 12, color: 'var(--lp-muted)' }}>Blog, copy, captions at scale</p>
                </div>

                {/* Advisor */}
                <div className="lp-card" style={{ background: 'rgba(94,142,110,0.06)', borderColor: 'rgba(94,142,110,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="lp-icon lp-icon-sage">{Icon.bulb}</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lp-ink)' }}>The Advisor</p>
                      <p style={{ fontSize: 10, color: 'var(--lp-sage)', fontWeight: 600 }}>Your daily marketing brief</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--lp-sage)', fontWeight: 700 }}>+</span>
                      <span style={{ color: 'var(--lp-ink)' }}>ROAS up 23% on Meta</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--lp-terra)', fontWeight: 700 }}>!</span>
                      <span style={{ color: 'var(--lp-ink)' }}>Shift budget from TikTok</span>
                    </div>
                  </div>
                </div>

                {/* Small row */}
                <div className="lp-card flex items-center gap-3">
                  <div className="lp-icon lp-icon-ink" style={{ width: 36, height: 36, borderRadius: 10 }}>{Icon.mail}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--lp-ink)' }}>Email & SMS</p>
                    <p style={{ fontSize: 11, color: 'var(--lp-muted)' }}>Drip sequences & blasts</p>
                  </div>
                </div>
                <div className="lp-card flex items-center gap-3">
                  <div className="lp-icon lp-icon-terra" style={{ width: 36, height: 36, borderRadius: 10 }}>{Icon.target}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--lp-ink)' }}>Paid Advertising</p>
                    <p style={{ fontSize: 11, color: 'var(--lp-muted)' }}>Google, Meta, TikTok</p>
                  </div>
                </div>
              </div>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--lp-muted)', marginTop: 32, fontWeight: 500 }}>...and 35+ more modules inside</p>
            </div>
          </div>
        </section>

        {/* ── CARD 4: How it works ── */}
        <section data-scroll-card="right">
          <div className="lp-section-card lp-sc-cream">
            <div className="max-w-5xl mx-auto">
              <div className="lp-card-tab">How it works</div>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 56, color: 'var(--lp-ink)' }}>
                Seven steps from zero<br className="hidden md:block" />
                <span style={{ color: 'var(--lp-muted)' }}>to running on autopilot</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {JOURNEY.map((step, i) => {
                  const isLast = i === 6;
                  const num = String(i + 1).padStart(2, '0');
                  return (
                    <div key={i} className={`rounded-[20px] p-6 transition-all duration-300 ${isLast ? 'md:col-span-3' : ''}`}
                      style={{
                        background: isLast ? 'var(--lp-dark)' : 'var(--lp-surface)',
                        border: isLast ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(44,40,37,0.05)',
                        boxShadow: isLast ? '0 20px 64px -16px rgba(44,40,37,0.25)' : '0 1px 4px rgba(44,40,37,0.03)',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <span className="lp-serif" style={{ fontSize: 32, color: isLast ? 'var(--lp-terra)' : 'rgba(44,40,37,0.08)', lineHeight: 1, flexShrink: 0 }}>{num}</span>
                        <div>
                          <h3 style={{ fontWeight: 700, marginBottom: 4, color: isLast ? '#fff' : 'var(--lp-ink)', fontSize: 15 }}>{step.title}</h3>
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: isLast ? 'rgba(255,255,255,0.5)' : 'var(--lp-muted)' }}>{step.desc}</p>
                          {isLast && <p style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--lp-terra)' }}>The best part of Overload</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 5: Integrations ── DARK */}
        <section data-scroll-card="left">
          <div className="lp-section-card lp-sc-dark">
            <div className="max-w-5xl mx-auto text-center">
              <div className="lp-card-tab">Integrations</div>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 56 }}>
                <span style={{ color: '#fff' }}>Works with the tools</span><br />
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>you already love</span>
              </h2>

              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--lp-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 48px', boxShadow: '0 16px 48px rgba(196,93,62,0.25)' }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>O</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-w-3xl mx-auto">
                {INTEGRATIONS.map((name, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all duration-300 cursor-default"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = ''; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{name.slice(0, 2).toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 6: Testimonials ── */}
        <section data-scroll-card="right">
          <div className="lp-section-card lp-sc-light">
            <div className="max-w-5xl mx-auto">
              <div className="lp-card-tab">What people say</div>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 48, color: 'var(--lp-ink)' }}>
                Real results from<br className="hidden md:block" />
                <span style={{ color: 'var(--lp-muted)' }}>real businesses</span>
              </h2>

              <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="lp-testimonial break-inside-avoid">
                    <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                      {[...Array(5)].map((_, j) => <span key={j} style={{ color: 'var(--lp-terra)', fontSize: 13 }}>&#9733;</span>)}
                    </div>
                    <p className={t.big ? 'lp-serif' : ''} style={{ color: 'var(--lp-ink)', lineHeight: 1.7, marginBottom: 18, fontSize: t.big ? 17 : 14, fontStyle: t.big ? 'italic' : 'normal' }}>"{t.quote}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: ['#C45D3E', '#5E8E6E', '#8B7355', '#9B6B6B', '#6B7E9B'][i] }}>
                        {t.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lp-ink)' }}>{t.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--lp-muted)' }}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Video card */}
                <div className="lp-testimonial break-inside-avoid flex flex-col items-center justify-center" style={{ background: 'var(--lp-dark)', borderColor: 'rgba(255,255,255,0.06)', padding: '44px 28px', cursor: 'pointer' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <svg width="22" height="22" fill="#fff" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Watch how UrbanFit scaled 9x</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>2 min video</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 7: Pricing ── DARK */}
        <section data-scroll-card="left" id="pricing">
          <div className="lp-section-card lp-sc-dark">
            <div className="max-w-5xl mx-auto">
              <div className="text-center">
                <div className="lp-card-tab">Pricing</div>
                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 56 }}>
                  <span style={{ color: '#fff' }}>Simple, honest pricing</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {PRICING.map((p, i) => (
                  <div key={i}
                    className={`rounded-[24px] p-8 relative transition-all duration-300 ${p.featured ? 'lp-pricing-featured' : 'lp-card'}`}
                    style={!p.featured ? { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' } : {}}
                    onMouseEnter={e => { if (!p.featured) e.currentTarget.style.transform = 'translateY(-4px)'; }}
                    onMouseLeave={e => { if (!p.featured) e.currentTarget.style.transform = ''; }}
                  >
                    {p.featured && (
                      <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--lp-terra)', fontSize: 10, fontWeight: 700, color: '#fff', padding: '6px 18px', borderRadius: 100, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: '0 4px 16px rgba(196,93,62,0.3)' }}>Most popular</div>
                    )}
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: p.featured ? 'var(--lp-terra-light)' : 'rgba(255,255,255,0.5)' }}>{p.name}</p>
                    <p style={{ fontSize: 12, marginBottom: 20, color: p.featured ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }}>{p.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                      <span style={{ fontSize: 38, fontWeight: 700, color: p.featured ? '#fff' : 'rgba(255,255,255,0.85)', letterSpacing: '-0.04em' }}>{p.price}</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>{p.period}</span>
                    </div>
                    <button onClick={go}
                      className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center ${p.featured ? 'lp-cta-white' : 'lp-cta'}`}
                      style={{ marginBottom: 24 }}
                    >Get started</button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {p.features.map((f, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {Icon.check(p.featured ? '#C45D3E' : '#5E8E6E')}
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 8: CTA ── */}
        <section data-scroll-card="right">
          <div className="lp-section-card lp-sc-accent">
            <div className="max-w-3xl mx-auto text-center" style={{ padding: '40px 0' }}>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.1, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>
                Ready to take marketing<br />
                <span style={{ color: 'rgba(255,255,255,0.65)' }}>off your plate?</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 420, margin: '0 auto 40px', lineHeight: 1.7 }}>
                Join thousands of businesses already running their entire marketing on Overload.
              </p>
              <button onClick={go} className="lp-cta" style={{ padding: '18px 48px', fontSize: 16, background: '#fff', color: 'var(--lp-dark)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                Start your free trial
              </button>
            </div>
          </div>
        </section>

      </div>{/* end card stack */}

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ padding: '72px 24px 36px', background: 'var(--lp-dark)', color: 'rgba(255,255,255,0.4)' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--lp-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>O</span>
            </div>
            <span className="lp-serif" style={{ fontSize: 16, color: '#fff' }}>Overload</span>
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 300, lineHeight: 1.6, marginBottom: 48 }}>
            Your marketing, handled.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8" style={{ marginBottom: 48 }}>
            {[
              { title: 'Product', links: ['Autopilot', 'The Advisor', 'Analytics', 'Integrations', 'Pricing'] },
              { title: 'Solutions', links: ['E-commerce', 'Agencies', 'SaaS', 'Local Business', 'Enterprise'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact', 'Partners'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR', 'Status'] },
            ].map((col, i) => (
              <div key={i}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 18 }}>{col.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {col.links.map((l, j) => (
                    <p key={j} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                    >{l}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>&copy; 2026 Overload. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                style={{ padding: '10px 16px', borderRadius: 12, fontSize: 13, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', outline: 'none', width: 200 }}
                onFocus={e => e.target.style.borderColor = 'rgba(196,93,62,0.3)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <button onClick={go} className="lp-cta lp-cta-terra" style={{ padding: '10px 20px', fontSize: 13 }}>Get access</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

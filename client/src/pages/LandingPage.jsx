import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODULE_REGISTRY } from '../config/modules';

const MODULE_COUNT = MODULE_REGISTRY.length;
const BENTO_REMAINING = MODULE_COUNT - 8;

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
   HERO DASHBOARD MOCKUP
   Pure CSS/JSX product preview
   ═══════════════════════════════════════════ */
function HeroDashboard() {
  return (
    <div className="lp-hero-mockup">
      {/* Browser chrome */}
      <div className="lp-mock-chrome">
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF605C' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD44' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00CA4E' }} />
        </div>
        <div className="lp-mock-url">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>overload.app/dashboard</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Dashboard body */}
      <div className="lp-mock-body">
        {/* Sidebar mini */}
        <div className="lp-mock-sidebar hidden md:flex">
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--lp-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>O</span>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: 5,
              background: i === 0 ? 'rgba(196,93,62,0.15)' : 'rgba(255,255,255,0.06)',
              border: i === 0 ? '1px solid rgba(196,93,62,0.25)' : '1px solid rgba(255,255,255,0.04)',
            }} />
          ))}
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', minWidth: 0 }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E8E4DE', letterSpacing: '-0.01em' }}>Command Center</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Good morning — 4 actions completed overnight</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Mode toggle mock */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 2 }}>
                <div style={{ padding: '2px 8px', borderRadius: 4, fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Manual</div>
                <div style={{ padding: '2px 8px', borderRadius: 4, fontSize: 7, fontWeight: 600, color: '#D4A017', background: 'rgba(212,160,23,0.12)' }}>Copilot</div>
                <div style={{ padding: '2px 8px', borderRadius: 4, fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Autopilot</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { label: 'Revenue', val: '$24.8K', change: '+18%', up: true },
              { label: 'ROAS', val: '4.2x', change: '+0.8', up: true },
              { label: 'Campaigns', val: '12', change: 'Active', up: null },
              { label: 'AI Actions', val: '847', change: 'This week', up: null },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E4DE', letterSpacing: '-0.02em' }}>{s.val}</div>
                <div style={{ fontSize: 7, fontWeight: 600, color: s.up === true ? '#5E8E6E' : s.up === false ? '#C45D3E' : 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                  {s.up === true && '↑ '}{s.up === false && '↓ '}{s.change}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom row: chart + feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8, flex: 1 }}>
            {/* Chart area */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Revenue Trend</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3, minHeight: 48 }}>
                {[28, 35, 32, 45, 42, 55, 48, 62, 58, 72, 68, 78].map((h, j) => (
                  <div key={j} style={{ flex: 1, borderRadius: 2, height: `${h}%`, background: j >= 10 ? 'var(--lp-terra)' : j >= 8 ? 'rgba(196,93,62,0.4)' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Live Activity</div>
              {[
                { icon: '✓', color: '#5E8E6E', text: 'Blog post published', time: '2m ago' },
                { icon: '⚡', color: '#D4A017', text: 'Ad budget optimized', time: '8m ago' },
                { icon: '✓', color: '#5E8E6E', text: 'Email sequence sent', time: '14m ago' },
                { icon: '→', color: '#C45D3E', text: 'Awaiting approval', time: '22m ago' },
              ].map((a, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${a.color}18`, color: a.color, fontSize: 7, fontWeight: 700, flexShrink: 0 }}>{a.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.55)', flex: 1 }}>{a.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  { title: 'Automation that replaces your marketing team', desc: 'Content, ads, analytics, email — everything you used to need five people for, handled by AI that executes autonomously across every channel.' },
  { title: 'Three modes: Manual, Copilot, Autopilot', desc: 'Start hands-on and graduate to full automation at your own pace. Review everything, approve AI suggestions, or let it run entirely on its own.' },
  { title: 'Always optimizing, even while you sleep', desc: 'AI monitors every campaign, reallocates budget, pauses underperformers, and scales winners — 24/7 without manual intervention.' },
];

const JOURNEY = [
  { title: 'Connect', desc: 'Link your platforms — Shopify, Meta, Google, TikTok, email, and more. One-click integrations, no code required.' },
  { title: 'Configure', desc: 'Set your brand voice, goals, audience, and budget. Overload builds your strategy automatically.' },
  { title: 'Manual Mode', desc: 'Start hands-on. Review every recommendation, approve each action, and stay in full control while you build trust.' },
  { title: 'Copilot Mode', desc: 'AI drafts campaigns, content, and optimizations. You review and approve — like a CMO who never sleeps.' },
  { title: 'Analyze & Optimize', desc: 'Unified dashboard with real ROAS, profit margins, and customer lifetime value. AI finds what works and doubles down.' },
  { title: 'Scale Confidently', desc: 'Campaigns, content, email flows, and ad spend — all managed and optimized across every channel simultaneously.' },
  { title: 'Autopilot Mode', desc: 'Flip the switch. Overload runs your entire marketing 24/7. You just check in weekly.' },
];

const INTEGRATIONS = [
  { name: 'Shopify', color: '#95BF47' },
  { name: 'Meta', color: '#0081FB' },
  { name: 'Google', color: '#4285F4' },
  { name: 'TikTok', color: '#FE2C55' },
  { name: 'Twitter/X', color: '#999999' },
  { name: 'LinkedIn', color: '#0A66C2' },
  { name: 'Klaviyo', color: '#BFD730' },
  { name: 'Mailchimp', color: '#FFE01B' },
  { name: 'Stripe', color: '#635BFF' },
  { name: 'HubSpot', color: '#FF7A59' },
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Pinterest', color: '#E60023' },
  { name: 'Slack', color: '#4A154B' },
  { name: 'Amazon', color: '#FF9900' },
  { name: 'Notion', color: '#999999' },
  { name: 'Airtable', color: '#18BFFF' },
  { name: 'Zapier', color: '#FF4F00' },
  { name: 'Snapchat', color: '#FFFC00' },
];

const SOCIAL_PROOF_BRANDS = [
  'Lumina Beauty', 'UrbanFit', 'NovaTech', 'Drift Supply', 'Peakform', 'Meridian Co.',
];

const TESTIMONIALS = [
  { quote: "Overload replaced our entire 5-person marketing team. We're saving $30K/month and getting better results.", name: 'Sarah Chen', role: 'CEO, Lumina Beauty', metric: '$30K/mo saved', metricColor: '#5E8E6E' },
  { quote: "The Advisor briefing every morning is like having a CMO who never sleeps. It caught a bleeding campaign before I even woke up.", name: 'Marcus Rodriguez', role: 'Founder, UrbanFit', big: true, metric: '9x growth', metricColor: '#C45D3E' },
  { quote: "We went from $2K to $18K/month in revenue in 3 months. Autopilot mode is genuinely insane.", name: 'Jamie Park', role: 'Co-founder, NovaTech', metric: '$2K → $18K/mo', metricColor: '#C45D3E' },
  { quote: "I was skeptical about AI running my ads. Then it outperformed my agency by 3x in the first week.", name: 'Rachel Kim', role: 'DTC Brand Owner', metric: '3x ROAS increase', metricColor: '#5E8E6E' },
  { quote: "Setup took 20 minutes. By the next morning, I had campaigns running on 4 platforms I'd never used before.", name: 'David Okafor', role: 'E-commerce Entrepreneur', metric: '20 min setup', metricColor: '#8B7355' },
];

const PRICING = [
  {
    name: 'Manual', desc: 'Full control. You call the shots.', price: '$49', period: '/mo',
    features: [`All ${MODULE_COUNT} modules`, 'AI content generation', 'Basic analytics', 'Email support', '5 campaigns/month'],
  },
  {
    name: 'Copilot', desc: 'AI recommends. You approve.', price: '$149', period: '/mo', featured: true,
    features: ['Everything in Manual', 'AI-drafted campaigns & content', 'The Advisor daily briefings', 'Unlimited campaigns', 'Priority support', 'Custom integrations'],
  },
  {
    name: 'Autopilot', desc: 'Fully autonomous marketing.', price: '$299', period: '/mo',
    features: ['Everything in Copilot', '24/7 autonomous operations', 'Custom model training', 'Dedicated account manager', 'White-label reports', 'Full API access'],
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
      <section className="relative pt-36 pb-8 md:pt-44 md:pb-12 px-6 overflow-hidden" style={{ background: 'var(--lp-cream)' }}>
        <div className="lp-hero-glow" />
        <div className="lp-hero-glow-2 hidden md:block" />

        <div className="text-center max-w-3xl mx-auto relative z-10 lp-hero-anim">
          <div style={{ marginBottom: 28 }}>
            <span className="lp-pill">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lp-sage)', display: 'inline-block', boxShadow: '0 0 8px rgba(94,142,110,0.5)', animation: 'lp-live-dot 2s ease-in-out infinite' }} />
              AI-Powered Marketing OS
            </span>
          </div>

          <h1 className="lp-serif" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 4.8rem)', lineHeight: 1.08, letterSpacing: '-0.025em', marginBottom: 24 }}>
            <span style={{ color: 'var(--lp-ink)' }}>Your marketing</span><br />
            <span style={{ color: 'var(--lp-terra)' }}>runs itself</span>
          </h1>

          <p style={{ color: 'var(--lp-muted)', fontSize: 17, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
            {MODULE_COUNT} AI modules across content, ads, email, and analytics. Three modes — from full control to fully autonomous.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={go} className="lp-cta lp-cta-terra" style={{ padding: '16px 44px', fontSize: 15 }}>
              Start free trial
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button onClick={go} className="lp-cta lp-cta-outline" style={{ padding: '16px 36px', fontSize: 15 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}><path d="M8 5v14l11-7z" /></svg>
              Watch demo
            </button>
          </div>

          {/* Social proof bar */}
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lp-muted)', opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
              Trusted by 2,000+ businesses including
            </p>
            <div className="lp-logo-bar">
              {SOCIAL_PROOF_BRANDS.map((brand, i) => (
                <span key={i} className="lp-logo-item">{brand}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Hero product mockup */}
        <div className="lp-hero-anim" style={{ maxWidth: 900, margin: '48px auto 0', position: 'relative', zIndex: 10 }}>
          <div style={{ opacity: 0, animation: 'lp-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards' }}>
            <HeroDashboard />
          </div>
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
                  { val: String(MODULE_COUNT), suf: '', label: 'Active Modules' },
                  { val: '100', suf: '%', label: 'Autonomous' },
                  { val: '3', suf: '', label: 'Automation Modes', raw: false },
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
                One platform that automates<br className="hidden md:block" />
                <span style={{ color: 'var(--lp-muted)' }}>your entire marketing operation</span>
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
              <div className="lp-card-tab">{MODULE_COUNT} Modules</div>
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
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--lp-muted)', marginTop: 32, fontWeight: 500 }}>...and {BENTO_REMAINING} more modules inside</p>
            </div>
          </div>
        </section>

        {/* ── CARD 4: How it works ── */}
        <section data-scroll-card="right">
          <div className="lp-section-card lp-sc-cream">
            <div className="max-w-5xl mx-auto">
              <div className="lp-card-tab">How it works</div>
              <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 56, color: 'var(--lp-ink)' }}>
                From connected<br className="hidden md:block" />
                <span style={{ color: 'var(--lp-muted)' }}>to fully autonomous</span>
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
                <span style={{ color: '#fff' }}>Works with the platforms</span><br />
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>you already use</span>
              </h2>

              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--lp-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 48px', boxShadow: '0 16px 48px rgba(196,93,62,0.25)' }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>O</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-w-3xl mx-auto">
                {INTEGRATIONS.map((int, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all duration-300 cursor-default"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = ''; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: int.color, opacity: 0.85 }}>{int.name.slice(0, 2).toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{int.name}</span>
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
                    {/* Metric badge */}
                    {t.metric && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 100, marginBottom: 14, background: `${t.metricColor}0d`, border: `1px solid ${t.metricColor}1a` }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.metricColor} strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.metricColor }}>{t.metric}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                      {[...Array(5)].map((_, j) => <span key={j} style={{ color: 'var(--lp-terra)', fontSize: 13 }}>&#9733;</span>)}
                    </div>
                    <p className={t.big ? 'lp-serif' : ''} style={{ color: 'var(--lp-ink)', lineHeight: 1.7, marginBottom: 18, fontSize: t.big ? 17 : 14, fontStyle: t.big ? 'italic' : 'normal' }}>"{t.quote}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: ['#C45D3E', '#5E8E6E', '#8B7355', '#9B6B6B', '#6B7E9B'][i] }}>
                        {t.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lp-ink)' }}>{t.name}</p>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--lp-sage)" style={{ flexShrink: 0 }}><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
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
              {/* Limited offer badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', marginBottom: 28, fontSize: 12, fontWeight: 600, color: '#fff' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'lp-live-dot 2s ease-in-out infinite' }} />
                Early access — 30% off for first 500 users
              </div>

              <h2 className="lp-serif" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.1, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>
                Ready to put marketing<br />
                <span style={{ color: 'rgba(255,255,255,0.65)' }}>on autopilot?</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 420, margin: '0 auto 40px', lineHeight: 1.7 }}>
                Join 2,000+ businesses already automating their marketing. Start free, upgrade when you're ready.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button onClick={go} className="lp-cta" style={{ padding: '18px 48px', fontSize: 16, background: '#fff', color: 'var(--lp-dark)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                  Start your free trial
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 20 }}>
                No credit card required &middot; 14-day free trial &middot; Cancel anytime
              </p>
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
            Your marketing, automated.
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

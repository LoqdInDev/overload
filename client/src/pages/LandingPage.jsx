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
          <img src="/favicon.png" alt="O" style={{ width: 30, height: 30, borderRadius: 6 }} />
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
  {
    title: 'Automation that replaces your marketing team',
    desc: 'Content, ads, analytics, email — everything you used to need five people for, handled by AI that executes autonomously across every channel.',
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Three modes: Manual, Copilot, Autopilot',
    desc: 'Start hands-on and graduate to full automation at your own pace. Review everything, approve AI suggestions, or let it run entirely on its own.',
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Always optimizing, even while you sleep',
    desc: 'AI monitors every campaign, reallocates budget, pauses underperformers, and scales winners — 24/7 without manual intervention.',
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
];

const JOURNEY = [
  {
    title: 'Connect', desc: 'Link your platforms — Shopify, Meta, Google, TikTok, email, and more. One-click integrations, no code required.',
    phase: 'setup', iconBg: 'rgba(94,142,110,0.1)', iconBorder: 'rgba(94,142,110,0.12)', accentColor: 'var(--lp-sage)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lp-sage)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  },
  {
    title: 'Configure', desc: 'Set your brand voice, goals, audience, and budget. Overload builds your strategy automatically.',
    phase: 'setup', iconBg: 'rgba(94,142,110,0.1)', iconBorder: 'rgba(94,142,110,0.12)', accentColor: 'var(--lp-sage)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lp-sage)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  },
  {
    title: 'Manual Mode', desc: 'Start hands-on. Review every recommendation, approve each action, and stay in full control while you build trust.',
    phase: 'grow', iconBg: 'rgba(196,93,62,0.08)', iconBorder: 'rgba(196,93,62,0.1)', accentColor: 'var(--lp-terra)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lp-terra)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>,
  },
  {
    title: 'Copilot Mode', desc: 'AI drafts campaigns, content, and optimizations. You review and approve — like a CMO who never sleeps.',
    phase: 'grow', iconBg: 'rgba(196,93,62,0.08)', iconBorder: 'rgba(196,93,62,0.1)', accentColor: 'var(--lp-terra)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lp-terra)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    title: 'Analyze & Optimize', desc: 'Unified dashboard with real ROAS, profit margins, and customer lifetime value. AI finds what works and doubles down.',
    phase: 'grow', iconBg: 'rgba(196,93,62,0.08)', iconBorder: 'rgba(196,93,62,0.1)', accentColor: 'var(--lp-terra)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lp-terra)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  },
  {
    title: 'Scale Confidently', desc: 'Campaigns, content, email flows, and ad spend — all managed and optimized across every channel simultaneously.',
    phase: 'auto', iconBg: 'rgba(51,47,43,0.06)', iconBorder: 'rgba(51,47,43,0.08)', accentColor: 'var(--lp-ink)',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lp-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  },
];

const INTEGRATIONS = [
  { name: 'Shopify', color: '#95BF47', slug: 'shopify' },
  { name: 'Meta', color: '#0081FB', slug: 'meta' },
  { name: 'Google', color: '#4285F4', slug: 'google' },
  { name: 'TikTok', color: '#FE2C55', slug: 'tiktok' },
  { name: 'Twitter/X', color: '#AAAAAA', slug: 'x' },
  { name: 'LinkedIn', color: '#0A66C2', slug: 'linkedin' },
  { name: 'Klaviyo', color: '#BFD730', slug: 'klaviyo' },
  { name: 'Mailchimp', color: '#FFE01B', slug: 'mailchimp' },
  { name: 'Stripe', color: '#635BFF', slug: 'stripe' },
  { name: 'HubSpot', color: '#FF7A59', slug: 'hubspot' },
  { name: 'YouTube', color: '#FF0000', slug: 'youtube' },
  { name: 'Pinterest', color: '#E60023', slug: 'pinterest' },
  { name: 'Slack', color: '#ECB22E', slug: 'slack' },
  { name: 'Amazon', color: '#FF9900', slug: 'amazon' },
  { name: 'Notion', color: '#CCCCCC', slug: 'notion' },
  { name: 'Airtable', color: '#18BFFF', slug: 'airtable' },
  { name: 'Zapier', color: '#FF4F00', slug: 'zapier' },
  { name: 'Snapchat', color: '#FFFC00', slug: 'snapchat' },
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
            <img src="/logo.png" alt="Overload" style={{ width: 40, height: 40, borderRadius: 8 }} />
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
          <div className="lp-section-card lp-sc-light" style={{ overflow: 'hidden' }}>
            {/* Decorative background elements */}
            <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,93,62,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,142,110,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="max-w-5xl mx-auto relative">
              {/* Section header */}
              <div className="text-center mb-12 md:mb-16">
                <div className="lp-card-tab">By the numbers</div>
                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--lp-ink)' }}>
                  Built for scale,{' '}
                  <span style={{ color: 'var(--lp-muted)' }}>designed for speed</span>
                </h2>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {[
                  {
                    val: String(MODULE_COUNT), suf: '', label: 'Active Modules', sub: 'Content, ads, analytics & more',
                    color: '#C45D3E', grad: 'rgba(196,93,62,0.06)', gradHover: 'rgba(196,93,62,0.10)', borderColor: 'rgba(196,93,62,0.12)',
                  },
                  {
                    val: '100', suf: '%', label: 'Autonomous', sub: 'Zero human intervention needed',
                    color: '#5E8E6E', grad: 'rgba(94,142,110,0.06)', gradHover: 'rgba(94,142,110,0.10)', borderColor: 'rgba(94,142,110,0.12)',
                  },
                  {
                    val: '3', suf: '', label: 'Automation Modes', sub: 'Manual · Copilot · Autopilot',
                    color: '#D4A017', grad: 'rgba(212,160,23,0.05)', gradHover: 'rgba(212,160,23,0.09)', borderColor: 'rgba(212,160,23,0.10)',
                  },
                  {
                    val: '10', suf: 'x', label: 'Faster Output', sub: 'Compared to manual marketing',
                    color: '#6366f1', grad: 'rgba(99,102,241,0.05)', gradHover: 'rgba(99,102,241,0.09)', borderColor: 'rgba(99,102,241,0.10)',
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="group relative rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 transition-all duration-500 cursor-default"
                    style={{
                      background: s.grad,
                      border: `1px solid ${s.borderColor}`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = s.gradHover;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 12px 40px ${s.color}15, 0 4px 16px ${s.color}10`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = s.grad;
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    {/* Decorative arc */}
                    <div style={{
                      position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%',
                      border: `1.5px solid ${s.color}10`, pointerEvents: 'none',
                    }} />

                    {/* Number */}
                    <p style={{
                      fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, color: s.color,
                      letterSpacing: '-0.04em', lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
                      marginBottom: 6,
                    }}>
                      <AnimatedNumber value={s.val} />{s.suf}
                    </p>

                    {/* Label */}
                    <p style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--lp-ink)',
                      letterSpacing: '-0.01em', marginBottom: 4,
                    }}>
                      {s.label}
                    </p>

                    {/* Subtitle */}
                    <p style={{
                      fontSize: 12, color: 'var(--lp-muted)', lineHeight: 1.5, fontWeight: 500,
                    }}>
                      {s.sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 2: Why Overload ── */}
        <section data-scroll-card="right" id="platform">
          <div className="lp-section-card lp-sc-cream lp-why-section">
            <div className="max-w-5xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
              {/* Centered heading group */}
              <div className="lp-why-heading-group">
                <div className="lp-card-tab" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Why Overload</div>
                <h2 className="lp-serif" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20, color: 'var(--lp-ink)' }}>
                  One platform that automates<br className="hidden md:block" />
                  <span style={{ color: 'var(--lp-muted)' }}>your entire marketing operation</span>
                </h2>
                <p className="lp-why-subtitle">
                  Stop juggling ten tools that don't talk to each other. Overload handles everything from content to conversion — automatically.
                </p>
                <div className="lp-why-divider" />
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 48 }}>
                {SOLUTIONS.map((s, i) => (
                  <div key={i} className="lp-why-card">
                    {/* Faint large number watermark */}
                    <span className="lp-why-number">{['01', '02', '03'][i]}</span>

                    {/* Icon */}
                    <div className={`lp-why-icon ${['lp-why-icon-terra', 'lp-why-icon-sage', 'lp-why-icon-ink'][i]}`}>
                      {s.icon(['var(--lp-terra)', 'var(--lp-sage)', 'var(--lp-ink)'][i])}
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 12, lineHeight: 1.35, letterSpacing: '-0.01em' }}>{s.title}</h3>
                    <p style={{ fontSize: 14.5, color: 'var(--lp-muted)', lineHeight: 1.75 }}>{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="lp-why-cta-row">
                <a href="#modules" className="lp-why-cta-link">
                  See all 38+ modules
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 3: Modules Bento ── */}
        <section data-scroll-card="left" id="modules">
          <div className="lp-section-card lp-sc-light lp-bento-section">
            <div className="max-w-5xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
              {/* Centered heading group */}
              <div className="lp-bento-heading-group">
                <div className="lp-card-tab" style={{ marginLeft: 'auto', marginRight: 'auto' }}>{MODULE_COUNT} Modules</div>
                <h2 className="lp-serif" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20, color: 'var(--lp-ink)' }}>
                  Everything you need.<br className="hidden md:block" />
                  <span style={{ color: 'var(--lp-muted)' }}>Nothing you don't.</span>
                </h2>
                <p className="lp-bento-subtitle">
                  One unified platform with every tool your marketing team needs — from content creation to campaign analytics.
                </p>
                <div className="lp-bento-divider" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5" style={{ marginTop: 48 }}>
                {/* Autopilot — hero card */}
                <div className="lp-bento-card lp-bento-hero md:col-span-2 md:row-span-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                    <div className="lp-icon lp-icon-terra" style={{ width: 48, height: 48, borderRadius: 14 }}>{Icon.bolt}</div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--lp-ink)', letterSpacing: '-0.01em' }}>Autopilot Mode</p>
                      <p style={{ fontSize: 12.5, color: 'var(--lp-muted)', fontWeight: 500 }}>Runs everything around the clock</p>
                    </div>
                  </div>
                  <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', padding: 22, border: '1px solid rgba(44,40,37,0.04)', position: 'relative', zIndex: 1 }}>
                    <div className="lp-bento-status">
                      <div className="lp-bento-status-dot" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-sage)', letterSpacing: '0.05em' }}>RUNNING</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[
                        { name: 'Content Generation', pct: 78, color: 'var(--lp-terra)' },
                        { name: 'Ad Deployment', pct: 92, color: 'var(--lp-sage)' },
                        { name: 'Email Sequences', pct: 85, color: 'var(--lp-terra)' },
                        { name: 'Social Scheduling', pct: 96, color: 'var(--lp-sage)' },
                      ].map((item, j) => (
                        <div key={j}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: 'var(--lp-ink)', fontWeight: 500 }}>{item.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--lp-muted)', fontWeight: 600 }}>{item.pct}%</span>
                          </div>
                          <div className="lp-bento-progress">
                            <div className="lp-bento-progress-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Video */}
                <div className="lp-bento-card" style={{ padding: '28px 24px' }}>
                  <div className="lp-icon lp-icon-sage" style={{ marginBottom: 16, width: 48, height: 48, borderRadius: 14 }}>{Icon.play}</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 6, letterSpacing: '-0.01em' }}>Video Marketing</p>
                  <p style={{ fontSize: 12.5, color: 'var(--lp-muted)', lineHeight: 1.6 }}>Script to screen in minutes</p>
                </div>

                {/* Analytics */}
                <div className="lp-bento-card" style={{ padding: '28px 24px' }}>
                  <div className="lp-icon lp-icon-ink" style={{ marginBottom: 16, width: 48, height: 48, borderRadius: 14 }}>{Icon.chart}</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 14, letterSpacing: '-0.01em' }}>Analytics</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 44 }}>
                    {[35, 58, 42, 75, 50, 92, 68].map((h, j) => (
                      <div key={j} className="lp-bento-bar" style={{ height: h + '%', background: j === 5 ? 'var(--lp-terra)' : j === 3 ? 'rgba(196,93,62,0.3)' : 'var(--lp-sand)', borderRadius: 4 }} />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="lp-bento-card" style={{ padding: '28px 24px' }}>
                  <div className="lp-icon lp-icon-terra" style={{ marginBottom: 16, width: 48, height: 48, borderRadius: 14 }}>{Icon.pen}</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 6, letterSpacing: '-0.01em' }}>Content Creation</p>
                  <p style={{ fontSize: 12.5, color: 'var(--lp-muted)', lineHeight: 1.6 }}>Blog, copy, captions at scale</p>
                </div>

                {/* Advisor */}
                <div className="lp-bento-card lp-bento-advisor">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div className="lp-icon lp-icon-sage" style={{ width: 48, height: 48, borderRadius: 14 }}>{Icon.bulb}</div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-ink)', letterSpacing: '-0.01em' }}>The Advisor</p>
                      <p style={{ fontSize: 11, color: 'var(--lp-sage)', fontWeight: 600, letterSpacing: '0.02em' }}>Your daily marketing brief</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="lp-bento-insight">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lp-sage)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
                      <span style={{ fontSize: 12.5, color: 'var(--lp-ink)', fontWeight: 500 }}>ROAS up 23% on Meta</span>
                    </div>
                    <div className="lp-bento-insight">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lp-terra)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <span style={{ fontSize: 12.5, color: 'var(--lp-ink)', fontWeight: 500 }}>Shift budget from TikTok</span>
                    </div>
                  </div>
                </div>

                {/* Bottom row — compact cards */}
                <div className="lp-bento-card lp-bento-compact md:col-span-2">
                  <div className="lp-icon lp-icon-ink" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}>{Icon.mail}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lp-ink)', letterSpacing: '-0.01em' }}>Email & SMS</p>
                    <p style={{ fontSize: 12, color: 'var(--lp-muted)', marginTop: 2 }}>Drip sequences & blasts</p>
                  </div>
                </div>
                <div className="lp-bento-card lp-bento-compact md:col-span-2">
                  <div className="lp-icon lp-icon-terra" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}>{Icon.target}</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lp-ink)', letterSpacing: '-0.01em' }}>Paid Advertising</p>
                    <p style={{ fontSize: 12, color: 'var(--lp-muted)', marginTop: 2 }}>Google, Meta, TikTok</p>
                  </div>
                </div>
              </div>

              {/* Footer with decorative lines */}
              <div className="lp-bento-footer">
                <span>...and {BENTO_REMAINING} more modules inside</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 4: How it works ── */}
        <section data-scroll-card="right">
          <div className="lp-section-card lp-sc-cream lp-hiw-section">
            <div className="max-w-5xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
              {/* Centered heading group */}
              <div className="lp-hiw-heading-group">
                <div className="lp-card-tab" style={{ marginLeft: 'auto', marginRight: 'auto' }}>How it works</div>
                <h2 className="lp-serif" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20, color: 'var(--lp-ink)' }}>
                  From connected<br className="hidden md:block" />
                  <span style={{ color: 'var(--lp-muted)' }}>to fully autonomous</span>
                </h2>
                <p className="lp-hiw-subtitle">
                  Seven steps from setup to autopilot. Go at your own pace — you're always in control.
                </p>
                <div className="lp-hiw-divider" />
              </div>

              {/* Phase labels */}
              <div className="hidden md:flex items-center justify-center gap-4" style={{ marginTop: 40, marginBottom: 8 }}>
                <span className="lp-hiw-phase lp-hiw-phase-setup">Setup</span>
                <span className="lp-hiw-phase lp-hiw-phase-grow">Growth</span>
                <span className="lp-hiw-phase lp-hiw-phase-auto">Autonomy</span>
              </div>

              {/* Timeline layout */}
              <div className="lp-hiw-grid">
                {JOURNEY.map((step, i) => {
                  const num = String(i + 1).padStart(2, '0');
                  const isLeft = i % 2 === 0;
                  return (
                    <div key={i} className="contents">
                      {/* Desktop: alternating left/right with timeline */}
                      {isLeft ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0' }}>
                            <div className="lp-hiw-step" style={{ maxWidth: 420 }}>
                              <div className="lp-hiw-mobile-node">
                                <div className="lp-hiw-node"><span>{num}</span></div>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lp-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Step {num}</span>
                              </div>
                              <div className="lp-hiw-step-icon" style={{ background: `linear-gradient(135deg, ${step.iconBg}, transparent)`, border: `1px solid ${step.iconBorder}` }}>
                                {step.icon}
                              </div>
                              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>{step.title}</h3>
                              <p style={{ fontSize: 13.5, color: 'var(--lp-muted)', lineHeight: 1.7 }}>{step.desc}</p>
                              <style>{`.lp-hiw-step:nth-of-type(${i + 1})::before { background: linear-gradient(90deg, ${step.accentColor}, transparent); }`}</style>
                            </div>
                          </div>
                          <div className="lp-hiw-timeline" style={{ padding: '12px 0' }}>
                            <div className="lp-hiw-node" style={{ marginTop: 28 }}><span>{num}</span></div>
                          </div>
                          <div className="lp-hiw-spacer" />
                        </>
                      ) : (
                        <>
                          <div className="lp-hiw-spacer" />
                          <div className="lp-hiw-timeline" style={{ padding: '12px 0' }}>
                            <div className="lp-hiw-node" style={{ marginTop: 28 }}><span>{num}</span></div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 0' }}>
                            <div className="lp-hiw-step" style={{ maxWidth: 420 }}>
                              <div className="lp-hiw-mobile-node">
                                <div className="lp-hiw-node"><span>{num}</span></div>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lp-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Step {num}</span>
                              </div>
                              <div className="lp-hiw-step-icon" style={{ background: `linear-gradient(135deg, ${step.iconBg}, transparent)`, border: `1px solid ${step.iconBorder}` }}>
                                {step.icon}
                              </div>
                              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--lp-ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>{step.title}</h3>
                              <p style={{ fontSize: 13.5, color: 'var(--lp-muted)', lineHeight: 1.7 }}>{step.desc}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Autopilot finale card */}
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div className="lp-hiw-finale">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, rgba(196,93,62,0.2), rgba(196,93,62,0.08))', border: '1px solid rgba(196,93,62,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lp-terra)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="lp-serif" style={{ fontSize: 20, color: '#fff', fontWeight: 400 }}>Autopilot Mode</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lp-terra)', letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 100, background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)' }}>STEP 07</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Flip the switch. Overload runs your entire marketing 24/7. You just check in weekly.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, marginTop: 20 }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(196,93,62,0.3), transparent)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lp-terra)', letterSpacing: '0.02em' }}>The best part of Overload</span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, rgba(196,93,62,0.3), transparent)' }} />
                  </div>
                </div>
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

              <div style={{ width: 80, height: 80, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 48px', boxShadow: '0 16px 48px rgba(196,93,62,0.25)', overflow: 'hidden' }}>
                <img src="/logo.png" alt="Overload" style={{ width: 80, height: 80 }} />
              </div>

              <style>{`
                @keyframes marquee-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @keyframes marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
              `}</style>
              <div className="max-w-4xl mx-auto space-y-4 overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
                {[
                  { items: INTEGRATIONS.slice(0, 6), direction: 'left', speed: '25s' },
                  { items: INTEGRATIONS.slice(6, 12), direction: 'right', speed: '30s' },
                  { items: INTEGRATIONS.slice(12, 18), direction: 'left', speed: '22s' },
                ].map((row, ri) => (
                  <div key={ri} className="flex" style={{ animation: `marquee-${row.direction} ${row.speed} linear infinite`, width: 'max-content' }}>
                    {[...row.items, ...row.items].map((int, i) => (
                      <div key={i} className="flex flex-col items-center gap-2.5 py-5 px-2 rounded-2xl mx-2 flex-shrink-0 transition-all duration-300 cursor-default"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', width: 120 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = ''; }}
                      >
                        <img src={`/brands/${int.slug}.svg`} alt={int.name} style={{ width: 28, height: 28 }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{int.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CARD 6: Pricing ── DARK */}
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
              <div style={{ height: 40 }} />
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
            <img src="/favicon.png" alt="Overload" style={{ width: 36, height: 36, borderRadius: 8 }} />
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

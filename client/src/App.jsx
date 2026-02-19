import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { MODULE_REGISTRY, CATEGORIES, getModulesByCategory } from './config/modules';
import { ThemeContext, useTheme } from './context/ThemeContext';

export { useTheme };

const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('./modules/home/HomePage'));
const VideoMarketingPage = lazy(() => import('./modules/video-marketing/VideoMarketingPage'));
const ContentPage = lazy(() => import('./modules/content/ContentPage'));
const CreativePage = lazy(() => import('./modules/creative/CreativePage'));
const AdsPage = lazy(() => import('./modules/ads/AdsPage'));
const AnalyticsPage = lazy(() => import('./modules/analytics/AnalyticsPage'));
const EmailSmsPage = lazy(() => import('./modules/email-sms/EmailSmsPage'));
const SocialPage = lazy(() => import('./modules/social/SocialPage'));
const SeoPage = lazy(() => import('./modules/seo/SeoPage'));
const FunnelsPage = lazy(() => import('./modules/funnels/FunnelsPage'));
const CrmPage = lazy(() => import('./modules/crm/CrmPage'));
const InfluencersPage = lazy(() => import('./modules/influencers/InfluencersPage'));
const ReviewsPage = lazy(() => import('./modules/reviews/ReviewsPage'));
const CompetitorsPage = lazy(() => import('./modules/competitors/CompetitorsPage'));
const AffiliatesPage = lazy(() => import('./modules/affiliates/AffiliatesPage'));
const BrandStrategyPage = lazy(() => import('./modules/brand-strategy/BrandStrategyPage'));
const CalendarPage = lazy(() => import('./modules/calendar/CalendarPage'));
const WebsiteBuilderPage = lazy(() => import('./modules/website-builder/WebsiteBuilderPage'));
const ChatbotPage = lazy(() => import('./modules/chatbot/ChatbotPage'));
const ProductFeedsPage = lazy(() => import('./modules/product-feeds/ProductFeedsPage'));
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage'));
const AbTestingPage = lazy(() => import('./modules/ab-testing/AbTestingPage'));
const BudgetOptimizerPage = lazy(() => import('./modules/budget-optimizer/BudgetOptimizerPage'));
const AudienceBuilderPage = lazy(() => import('./modules/audience-builder/AudienceBuilderPage'));
const IntegrationsPage = lazy(() => import('./modules/integrations/IntegrationsPage'));
const ApiManagerPage = lazy(() => import('./modules/api-manager/ApiManagerPage'));
const WebhooksPage = lazy(() => import('./modules/webhooks/WebhooksPage'));
const WorkflowBuilderPage = lazy(() => import('./modules/workflow-builder/WorkflowBuilderPage'));
const SchedulerPage = lazy(() => import('./modules/scheduler/SchedulerPage'));
const AutopilotPage = lazy(() => import('./modules/autopilot/AutopilotPage'));
const BrandProfilePage = lazy(() => import('./modules/brand-profile/BrandProfilePage'));
const TeamPage = lazy(() => import('./modules/team/TeamPage'));
const BillingPage = lazy(() => import('./modules/billing/BillingPage'));
const PrPressPage = lazy(() => import('./modules/pr-press/PrPressPage'));
const CheckoutOptimizerPage = lazy(() => import('./modules/checkout-optimizer/CheckoutOptimizerPage'));
const ReferralLoyaltyPage = lazy(() => import('./modules/referral-loyalty/ReferralLoyaltyPage'));
const ProfitDashboardPage = lazy(() => import('./modules/profit-dashboard/ProfitDashboardPage'));
const GoalTrackerPage = lazy(() => import('./modules/goal-tracker/GoalTrackerPage'));
const EcommerceHubPage = lazy(() => import('./modules/ecommerce-hub/EcommerceHubPage'));
const CustomerIntelligencePage = lazy(() => import('./modules/customer-intelligence/CustomerIntelligencePage'));
const SupportCenterPage = lazy(() => import('./modules/support-center/SupportCenterPage'));
const KnowledgeBasePage = lazy(() => import('./modules/knowledge-base/KnowledgeBasePage'));
const TheAdvisorPage = lazy(() => import('./modules/the-advisor/TheAdvisorPage'));
const ClientManagerPage = lazy(() => import('./modules/client-manager/ClientManagerPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center h-full gap-3">
      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#00d4ff', boxShadow: '0 0 10px #00d4ff', animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#9b59b6', boxShadow: '0 0 10px #9b59b6', animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#00ff88', boxShadow: '0 0 10px #00ff88', animationDelay: '300ms' }} />
    </div>
  );
}

/* Starfield background */
function Starfield() {
  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 30 + 20,
      delay: Math.random() * 20,
      opacity: Math.random() * 0.5 + 0.2,
    })), []);

  return (
    <div className="starfield">
      {stars.map(s => (
        <div key={s.id} className="star" style={{
          left: `${s.left}%`, bottom: '-2px',
          width: `${s.size}px`, height: `${s.size}px`,
          animationDuration: `${s.duration}s`,
          animationDelay: `${s.delay}s`,
          opacity: s.opacity,
        }} />
      ))}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(true);
  const [dark, setDark] = useState(false);
  const [pageKey, setPageKey] = useState(location.pathname);
  const isLanding = location.pathname === '/';
  const current = MODULE_REGISTRY.find(m =>
    m.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(m.path)
  );
  const toggle = () => setDark(d => !d);

  /* Collapsible sidebar sections — only the active section is expanded by default */
  const activeCat = current ? current.category : null;
  const [expandedSections, setExpandedSections] = useState({});

  /* Auto-expand the section containing the active module */
  useEffect(() => {
    if (activeCat) {
      setExpandedSections(prev => ({ ...prev, [activeCat]: true }));
    }
  }, [activeCat]);

  const toggleSection = (catId) => {
    setExpandedSections(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  useEffect(() => { setPageKey(location.pathname); }, [location.pathname]);

  /* Landing page body overrides — white bg, allow scroll, reset font size */
  useEffect(() => {
    if (isLanding) {
      document.documentElement.style.fontSize = '16px';
      document.body.style.overflow = 'auto';
      document.body.style.background = '#FAF8F4';
    } else {
      document.documentElement.style.fontSize = '18px';
      document.body.style.overflow = 'hidden';
      document.body.style.background = '';
    }
  }, [isLanding]);

  /* Landing page — no sidebar, no header, full-screen */
  if (isLanding) {
    return (
      <ThemeContext.Provider value={{ dark, toggle }}>
        <Suspense fallback={<Loader />}>
          <LandingPage />
        </Suspense>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div data-theme={dark ? 'dark' : 'light'} className={`flex h-screen overflow-hidden ${dark ? 'bg-[#050505] text-gray-200' : 'bg-[#f5f5f7] text-gray-800'}`}>

        {/* Ambient BG layers */}
        {dark && (
          <>
            <div className="dot-matrix-bg" />
            <Starfield />
            <div className="scan-line" />
            {/* Neon ambient blurs */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute top-[-10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]"
                style={{ background: 'radial-gradient(circle, #00d4ff, transparent 65%)', filter: 'blur(120px)' }} />
              <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.035]"
                style={{ background: 'radial-gradient(circle, #9b59b6, transparent 65%)', filter: 'blur(120px)' }} />
              <div className="absolute top-[50%] left-[60%] w-[400px] h-[400px] rounded-full opacity-[0.025]"
                style={{ background: 'radial-gradient(circle, #00ff88, transparent 65%)', filter: 'blur(100px)' }} />
            </div>
          </>
        )}

        {/* LEFT NAV */}
        <nav className={`${navOpen ? 'w-64' : 'w-[52px]'} transition-all duration-300 flex flex-col flex-shrink-0 relative z-20`}>
          <div className={`absolute inset-0 ${dark ? 'bg-[#050508]/90 backdrop-blur-xl border-r border-cyan-500/[0.06]' : 'bg-white/95 backdrop-blur-xl border-r border-gray-200'}`} />

          {/* Logo */}
          <div className="relative flex items-center gap-2.5 px-3 h-14 flex-shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'animate-glow-pulse' : ''}`}
              style={dark
                ? { background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(155,89,182,0.15))', border: '1px solid rgba(0,212,255,0.2)' }
                : { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }
              }>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke={dark ? '#00d4ff' : '#ffffff'}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            {navOpen && (
              <div>
                <span className={`text-sm font-bold tracking-tight ${dark ? 'text-glow' : ''}`} style={{ color: dark ? '#00d4ff' : '#4338ca' }}>OVERLOAD</span>
                <p className={`text-[8px] font-bold tracking-[0.2em] ${dark ? 'text-gray-600' : 'text-gray-500'}`}>MARKETING OS</p>
              </div>
            )}
          </div>

          <div className={`relative mx-3 ${dark ? 'hud-line' : 'h-px bg-gray-200'}`} />

          {/* Module links */}
          <div className="relative flex-1 overflow-y-auto py-2 px-2 space-y-0.5 no-scrollbar">
            {/* Home */}
            <NavLink to="/dashboard" className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] font-medium transition-all duration-200 group ${
              location.pathname === '/dashboard'
                ? dark ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/15' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] border border-transparent' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
            }`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                location.pathname === '/dashboard' ? dark ? 'bg-cyan-500/15' : 'bg-indigo-100' : dark ? 'bg-white/[0.03] group-hover:bg-white/[0.05]' : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                <svg className="w-3 h-3" fill="none" stroke={location.pathname === '/dashboard' && dark ? '#00d4ff' : 'currentColor'} viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              {navOpen && <span>Command Center</span>}
            </NavLink>

            {CATEGORIES.map(cat => {
              const mods = getModulesByCategory(cat.id);
              if (mods.length === 0) return null;
              const isExpanded = !!expandedSections[cat.id];
              const hasActiveMod = mods.some(m => location.pathname.startsWith(m.path));
              return (
                <div key={cat.id}>
                  {cat.id === 'settings' && (
                    <div className={`mx-2 my-2 ${dark ? 'hud-line' : 'h-px bg-gray-200'}`} />
                  )}
                  {/* Section header — clickable toggle */}
                  <button onClick={() => toggleSection(cat.id)}
                    className={`w-full flex items-center gap-1.5 py-1.5 px-1 rounded-md transition-colors ${dark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}>
                    {navOpen ? (
                      <>
                        <svg className={`w-3 h-3 sidebar-section-arrow ${isExpanded ? 'expanded' : ''} flex-shrink-0`}
                          fill="none" stroke={hasActiveMod ? '#f5a623' : (dark ? '#4b5563' : '#9ca3af')} viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        <span className={`text-[9px] font-bold tracking-[0.2em] uppercase flex-1 text-left ${hasActiveMod ? 'text-amber-600' : dark ? 'text-gray-600' : 'text-gray-400'}`}>{cat.label}</span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${dark ? 'bg-white/[0.04] text-gray-600' : 'bg-gray-100 text-gray-400'}`}>{mods.length}</span>
                      </>
                    ) : (
                      <div className={`mx-1 ${dark ? 'hud-line opacity-30' : 'h-px bg-gray-200'} w-full`} />
                    )}
                  </button>
                  {/* Collapsible items */}
                  <div className={`sidebar-section-items ${(!isExpanded && navOpen) ? 'collapsed' : ''}`}
                    style={{ maxHeight: (isExpanded || !navOpen) ? `${mods.length * 48}px` : '0' }}>
                  {mods.map(mod => {
                    const isActive = location.pathname.startsWith(mod.path);
                    const isAutopilot = mod.special === 'autopilot';
                    const isAdvisor = mod.special === 'advisor';
                    const isSpecial = isAutopilot || isAdvisor;
                    const specialColor = isAutopilot ? '#f59e0b' : '#d4a017';
                    return (
                      <NavLink key={mod.id} to={mod.path}
                        className={`flex items-center gap-2 px-2 py-2 rounded-md text-[13px] font-medium transition-all duration-200 group relative ${
                          isSpecial
                            ? isActive
                              ? dark ? 'text-amber-200 border border-amber-500/20' : 'text-amber-800 border border-amber-400/40'
                              : dark ? 'text-amber-400/80 hover:text-amber-300 border border-amber-500/10 hover:border-amber-500/20' : 'text-amber-700 hover:text-amber-800 border border-amber-300/40 hover:border-amber-400/50 hover:bg-amber-50'
                            : isActive
                              ? dark ? 'text-white border' : 'text-gray-900 border'
                              : dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] border border-transparent' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                        }`}
                        style={isActive ? {
                          borderColor: isSpecial ? (dark ? `${specialColor}33` : `${specialColor}59`) : (dark ? `${mod.color}25` : `${mod.color}35`),
                          background: dark ? `${mod.color}${isSpecial ? '12' : '08'}` : `${mod.color}08`,
                          ...(isSpecial && dark ? { boxShadow: `0 0 15px ${specialColor}14, inset 0 0 15px ${specialColor}08` } : {}),
                        } : isSpecial ? {
                          background: dark ? `${specialColor}0a` : `${specialColor}08`,
                        } : {}}
                      >
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 rounded-r" style={{ background: mod.color, boxShadow: dark ? `0 0 6px ${mod.color}` : 'none' }} />}
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                          isSpecial ? '' : !isActive ? dark ? 'bg-white/[0.03] group-hover:bg-white/[0.05]' : 'bg-gray-100 group-hover:bg-gray-200' : ''
                        }`}
                          style={isActive || isSpecial ? { background: dark ? `${mod.color}20` : `${mod.color}15` } : {}}
                        >
                          <svg className="w-3 h-3" fill={isAdvisor ? mod.color : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                            style={isActive || isSpecial ? { color: mod.color } : {}}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                          </svg>
                        </div>
                        {navOpen && <span className="truncate">{mod.name}</span>}
                        {isActive && navOpen && (
                          <div className="ml-auto module-dot flex-shrink-0" style={{ background: mod.color, color: mod.color, boxShadow: dark ? `0 0 8px ${mod.color}, 0 0 20px ${mod.color}40` : 'none' }} />
                        )}
                        {isSpecial && !isActive && navOpen && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: specialColor, boxShadow: dark ? `0 0 6px ${specialColor}, 0 0 12px ${specialColor}4d` : `0 0 4px ${specialColor}80` }} />
                        )}
                      </NavLink>
                    );
                  })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom controls */}
          <div className="relative px-2 py-2 space-y-1">
            <button onClick={toggle}
              className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-xs ${dark ? 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/[0.04]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              {dark ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
              {navOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={() => setNavOpen(!navOpen)}
              className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-xs ${dark ? 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/[0.04]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${navOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {navOpen && <span>Collapse</span>}
            </button>
          </div>
        </nav>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* HUD Header with corner brackets */}
          <header className={`h-12 flex items-center px-5 flex-shrink-0 relative ${dark ? 'border-b border-cyan-500/[0.06]' : 'border-b border-gray-200'}`}>
            <div className={`absolute inset-0 ${dark ? 'bg-[#050508]/70 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-lg'}`} />

            {/* Left bracket */}
            {dark && (
              <>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40" style={{ filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.3))' }} />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/40" style={{ filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.3))' }} />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/40" style={{ filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.3))' }} />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40" style={{ filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.3))' }} />
              </>
            )}

            <div className={`relative flex items-center gap-2 text-xs ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
              <span className={`font-bold tracking-widest ${dark ? 'text-glow' : ''}`} style={{ color: dark ? '#00d4ff' : '#4338ca', fontSize: '10px' }}>OVERLOAD</span>
              {current && (
                <>
                  <span style={{ color: dark ? 'rgba(0,212,255,0.3)' : '#cbd5e1' }}>//</span>
                  <span className="font-bold" style={{ color: dark ? '#e2e8f0' : '#1e293b', fontSize: '10px', letterSpacing: '0.1em' }}>{current.name.toUpperCase()}</span>
                </>
              )}
            </div>

            <div className="relative ml-auto flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{
                  background: dark ? '#00ff88' : '#22c55e',
                  boxShadow: dark ? '0 0 8px #00ff88, 0 0 20px rgba(0,255,136,0.3)' : 'none',
                  animation: dark ? 'dot-pulse 2s ease-in-out infinite' : 'none',
                }} />
                <span className="font-bold tracking-widest" style={{ fontSize: '9px', color: dark ? '#00ff88' : '#16a34a', textShadow: dark ? '0 0 10px rgba(0,255,136,0.4)' : 'none' }}>SYSTEMS ONLINE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="hud-label">{MODULE_REGISTRY.length} MODULES</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 h-3 rounded-sm" style={{
                      background: i < 4
                        ? (dark ? 'rgba(0,255,136,0.5)' : 'rgba(34,197,94,0.5)')
                        : (dark ? 'rgba(0,212,255,0.15)' : 'rgba(99,102,241,0.15)'),
                      boxShadow: i < 4 && dark ? '0 0 4px rgba(0,255,136,0.3)' : 'none',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* Page content with transition */}
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<Loader />}>
              <div key={pageKey} className="page-enter">
                <Routes>
                  <Route path="/dashboard" element={<HomePage />} />
                  <Route path="/video-marketing/*" element={<VideoMarketingPage />} />
                  <Route path="/content/*" element={<ContentPage />} />
                  <Route path="/creative/*" element={<CreativePage />} />
                  <Route path="/ads/*" element={<AdsPage />} />
                  <Route path="/analytics/*" element={<AnalyticsPage />} />
                  <Route path="/email-sms/*" element={<EmailSmsPage />} />
                  <Route path="/social/*" element={<SocialPage />} />
                  <Route path="/seo/*" element={<SeoPage />} />
                  <Route path="/funnels/*" element={<FunnelsPage />} />
                  <Route path="/crm/*" element={<CrmPage />} />
                  <Route path="/influencers/*" element={<InfluencersPage />} />
                  <Route path="/reviews/*" element={<ReviewsPage />} />
                  <Route path="/competitors/*" element={<CompetitorsPage />} />
                  <Route path="/affiliates/*" element={<AffiliatesPage />} />
                  <Route path="/brand-strategy/*" element={<BrandStrategyPage />} />
                  <Route path="/calendar/*" element={<CalendarPage />} />
                  <Route path="/website-builder/*" element={<WebsiteBuilderPage />} />
                  <Route path="/chatbot/*" element={<ChatbotPage />} />
                  <Route path="/product-feeds/*" element={<ProductFeedsPage />} />
                  <Route path="/reports/*" element={<ReportsPage />} />
                  <Route path="/ab-testing/*" element={<AbTestingPage />} />
                  <Route path="/budget-optimizer/*" element={<BudgetOptimizerPage />} />
                  <Route path="/audience-builder/*" element={<AudienceBuilderPage />} />
                  <Route path="/integrations/*" element={<IntegrationsPage />} />
                  <Route path="/api-manager/*" element={<ApiManagerPage />} />
                  <Route path="/webhooks/*" element={<WebhooksPage />} />
                  <Route path="/workflow-builder/*" element={<WorkflowBuilderPage />} />
                  <Route path="/scheduler/*" element={<SchedulerPage />} />
                  <Route path="/autopilot/*" element={<AutopilotPage />} />
                  <Route path="/brand-profile/*" element={<BrandProfilePage />} />
                  <Route path="/team/*" element={<TeamPage />} />
                  <Route path="/billing/*" element={<BillingPage />} />
                  <Route path="/pr-press/*" element={<PrPressPage />} />
                  <Route path="/checkout-optimizer/*" element={<CheckoutOptimizerPage />} />
                  <Route path="/referral-loyalty/*" element={<ReferralLoyaltyPage />} />
                  <Route path="/profit-dashboard/*" element={<ProfitDashboardPage />} />
                  <Route path="/goal-tracker/*" element={<GoalTrackerPage />} />
                  <Route path="/ecommerce-hub/*" element={<EcommerceHubPage />} />
                  <Route path="/customer-intelligence/*" element={<CustomerIntelligencePage />} />
                  <Route path="/support-center/*" element={<SupportCenterPage />} />
                  <Route path="/knowledge-base/*" element={<KnowledgeBasePage />} />
                  <Route path="/the-advisor/*" element={<TheAdvisorPage />} />
                  <Route path="/client-manager/*" element={<ClientManagerPage />} />
                </Routes>
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
}

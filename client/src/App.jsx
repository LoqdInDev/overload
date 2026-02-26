import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MODULE_REGISTRY, CATEGORIES, getModulesByCategory } from './config/modules';
import { ThemeContext, useTheme } from './context/ThemeContext';
import { BrandProvider } from './context/BrandContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ModuleErrorBoundary from './components/shared/ModuleErrorBoundary';
import CommandPalette from './components/shared/CommandPalette';
import { useRecentModules } from './hooks/useRecentModules';

export { useTheme };

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
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
const CalendarPage = lazy(() => import('./modules/calendar/CalendarPage'));
const WebsiteBuilderPage = lazy(() => import('./modules/website-builder/WebsiteBuilderPage'));
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
const CustomerAiPage = lazy(() => import('./modules/customer-ai/CustomerAiPage'));
const BrandHubPage = lazy(() => import('./modules/brand-hub/BrandHubPage'));
const TeamPage = lazy(() => import('./modules/team/TeamPage'));
const PrPressPage = lazy(() => import('./modules/pr-press/PrPressPage'));
const ReferralLoyaltyPage = lazy(() => import('./modules/referral-loyalty/ReferralLoyaltyPage'));
const GoalTrackerPage = lazy(() => import('./modules/goal-tracker/GoalTrackerPage'));
const EcommerceHubPage = lazy(() => import('./modules/ecommerce-hub/EcommerceHubPage'));
const KnowledgeBasePage = lazy(() => import('./modules/knowledge-base/KnowledgeBasePage'));
const TheAdvisorPage = lazy(() => import('./modules/the-advisor/TheAdvisorPage'));
const ClientManagerPage = lazy(() => import('./modules/client-manager/ClientManagerPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center h-full gap-2.5">
      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C45D3E', animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#5E8E6E', animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C45D3E', animationDelay: '300ms' }} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function M({ component: Comp, name }) {
  return (
    <ModuleErrorBoundary moduleName={name}>
      <Comp />
    </ModuleErrorBoundary>
  );
}

export default function App() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [pageKey, setPageKey] = useState(location.pathname);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const isLogin = location.pathname === '/login';
  const current = MODULE_REGISTRY.find(m =>
    m.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(m.path)
  );
  const toggle = () => setDark(d => !d);

  /* Collapsible sidebar sections */
  const activeCat = current ? current.category : null;
  const [expandedSections, setExpandedSections] = useState({ create: true });
  const [suppressActive, setSuppressActive] = useState(false);

  useEffect(() => {
    if (activeCat) setExpandedSections({ [activeCat]: true });
  }, [activeCat]);

  useEffect(() => {
    setSuppressActive(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSection = (catId) => {
    setExpandedSections(prev => prev[catId] ? {} : { [catId]: true });
    setSuppressActive(catId !== activeCat);
  };

  useEffect(() => { setPageKey(location.pathname); }, [location.pathname]);

  /* Command palette keyboard shortcut */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Landing page body overrides */
  useEffect(() => {
    if (isLanding || isLogin) {
      document.documentElement.style.fontSize = '16px';
      document.body.style.overflow = 'auto';
      document.body.style.background = dark ? '#1A1816' : '#FBF7F0';
    } else {
      document.documentElement.style.fontSize = '16px';
      document.body.style.overflow = 'hidden';
      document.body.style.background = '';
    }
  }, [isLanding, isLogin, dark]);

  /* Landing page — no sidebar, no header */
  if (isLanding) {
    return (
      <AuthProvider>
        <ThemeContext.Provider value={{ dark, toggle }}>
          <Suspense fallback={<Loader />}>
            <LandingPage />
          </Suspense>
        </ThemeContext.Provider>
      </AuthProvider>
    );
  }

  /* Login page — no sidebar, no header */
  if (isLogin) {
    return (
      <AuthProvider>
        <ThemeContext.Provider value={{ dark, toggle }}>
          <Suspense fallback={<Loader />}>
            <LoginPage />
          </Suspense>
        </ThemeContext.Provider>
      </AuthProvider>
    );
  }

  /* ── Warm Editorial Palette ── */
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const muted = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)';

  return (
    <AuthProvider>
    <ThemeContext.Provider value={{ dark, toggle }}>
    <ToastProvider>
    <BrandProvider>
    <ProtectedRoute>
      <div data-theme={dark ? 'dark' : 'light'}
        className="flex h-screen overflow-hidden"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          background: dark ? '#1A1816' : '#FBF7F0',
          color: ink,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-xl focus:text-[12px] focus:font-semibold"
          style={{ background: terra, color: '#FFFFFF' }}
        >
          Skip to main content
        </a>

        {/* Command Palette */}
        <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

        {/* Subtle warm ambient glow */}
        {!dark && (
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-5%] right-[20%] w-[70vw] max-w-[500px] h-[70vw] max-h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(196,93,62,0.025) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div className="absolute bottom-[-5%] left-[30%] w-[60vw] max-w-[400px] h-[60vw] max-h-[400px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(94,142,110,0.025) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          </div>
        )}

        {/* MOBILE OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* LEFT NAV */}
        <SidebarNav
          navOpen={navOpen} setNavOpen={setNavOpen}
          mobileMenuOpen={mobileMenuOpen}
          dark={dark} toggle={toggle}
          terra={terra} ink={ink} muted={muted}
          location={location}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          suppressActive={suppressActive}
        />

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10" id="main-content">
          {/* Header */}
          <header className="h-12 flex items-center px-5 flex-shrink-0 relative"
            style={{ borderBottom: `1px solid ${brd}` }}>
            <div className="absolute inset-0"
              style={{
                background: dark ? 'rgba(26,24,22,0.92)' : 'rgba(251,247,240,0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }} />

            <div className="relative flex items-center gap-2 text-xs">
              <button onClick={() => setMobileMenuOpen(o => !o)}
                className="md:hidden mr-1 p-1.5 rounded-lg transition-all duration-200"
                style={{ color: muted }}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  }
                </svg>
              </button>
              {location.pathname !== '/dashboard' && (
                <button onClick={() => navigate(-1)}
                  className="hidden sm:block mr-1 p-1.5 rounded-lg transition-all duration-200"
                  style={{ color: muted }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)'; e.currentTarget.style.color = terra; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                  aria-label="Go back">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </button>
              )}
              <span className="font-bold tracking-widest" style={{ color: terra, fontSize: '10px' }}>OVERLOAD</span>
              {current && (
                <>
                  <span style={{ color: dark ? 'rgba(255,255,255,0.12)' : '#EDE5DA' }}>/</span>
                  <span className="font-bold" style={{ color: ink, fontSize: '10px', letterSpacing: '0.08em' }}>
                    {current.name.toUpperCase()}
                  </span>
                </>
              )}
            </div>

            <div className="relative ml-auto flex items-center gap-3">
              <button
                onClick={() => setCmdPaletteOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200"
                style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)', color: muted }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
                aria-label="Open command palette"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span className="text-[10px] font-medium">
                  <kbd className="font-mono">Ctrl</kbd>+<kbd className="font-mono">K</kbd>
                </span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-[6px] h-[6px] rounded-full" style={{ background: sage }} />
                <span className="hidden sm:inline font-semibold tracking-wider" style={{ fontSize: '9px', color: sage }}>
                  SYSTEMS ONLINE
                </span>
              </div>
              <span className="hidden lg:inline text-[9px] font-medium tracking-wider" style={{ color: muted }}>
                {MODULE_REGISTRY.length} MODULES
              </span>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <Suspense fallback={<Loader />}>
                <div key={pageKey} className="page-enter">
                  <Routes>
                    <Route path="/dashboard" element={<M component={HomePage} name="Command Center" />} />
                    <Route path="/video-marketing/*" element={<M component={VideoMarketingPage} name="Video Marketing" />} />
                    <Route path="/content/*" element={<M component={ContentPage} name="AI Content" />} />
                    <Route path="/creative/*" element={<M component={CreativePage} name="Creative" />} />
                    <Route path="/ads/*" element={<M component={AdsPage} name="Ads" />} />
                    <Route path="/analytics/*" element={<M component={AnalyticsPage} name="Analytics" />} />
                    <Route path="/email-sms/*" element={<M component={EmailSmsPage} name="Email & SMS" />} />
                    <Route path="/social/*" element={<M component={SocialPage} name="Social" />} />
                    <Route path="/seo/*" element={<M component={SeoPage} name="SEO" />} />
                    <Route path="/funnels/*" element={<M component={FunnelsPage} name="Funnels" />} />
                    <Route path="/crm/*" element={<M component={CrmPage} name="CRM" />} />
                    <Route path="/influencers/*" element={<M component={InfluencersPage} name="Influencers" />} />
                    <Route path="/reviews/*" element={<M component={ReviewsPage} name="Reviews" />} />
                    <Route path="/competitors/*" element={<M component={CompetitorsPage} name="Competitors" />} />
                    <Route path="/affiliates/*" element={<M component={AffiliatesPage} name="Affiliates" />} />
                    <Route path="/brand-strategy/*" element={<Navigate to="/brand-hub" replace />} />
                    <Route path="/calendar/*" element={<M component={CalendarPage} name="Calendar" />} />
                    <Route path="/website-builder/*" element={<M component={WebsiteBuilderPage} name="Website Builder" />} />
                    <Route path="/chatbot/*" element={<Navigate to="/customer-ai" replace />} />
                    <Route path="/product-feeds/*" element={<M component={ProductFeedsPage} name="Product Feeds" />} />
                    <Route path="/reports/*" element={<M component={ReportsPage} name="Reports" />} />
                    <Route path="/ab-testing/*" element={<M component={AbTestingPage} name="A/B Testing" />} />
                    <Route path="/budget-optimizer/*" element={<M component={BudgetOptimizerPage} name="Budget Optimizer" />} />
                    <Route path="/audience-builder/*" element={<M component={AudienceBuilderPage} name="Audience Builder" />} />
                    <Route path="/integrations/*" element={<M component={IntegrationsPage} name="Integrations" />} />
                    <Route path="/api-manager/*" element={<M component={ApiManagerPage} name="API Manager" />} />
                    <Route path="/webhooks/*" element={<M component={WebhooksPage} name="Webhooks" />} />
                    <Route path="/workflow-builder/*" element={<M component={WorkflowBuilderPage} name="Workflow Builder" />} />
                    <Route path="/scheduler/*" element={<M component={SchedulerPage} name="Scheduler" />} />
                    <Route path="/autopilot/*" element={<M component={AutopilotPage} name="Autopilot" />} />
                    <Route path="/brand-profile/*" element={<Navigate to="/brand-hub" replace />} />
                    <Route path="/customer-ai/*" element={<M component={CustomerAiPage} name="Customer AI" />} />
                    <Route path="/brand-hub/*" element={<M component={BrandHubPage} name="Brand Hub" />} />
                    <Route path="/team/*" element={<M component={TeamPage} name="Team" />} />
                    <Route path="/pr-press/*" element={<M component={PrPressPage} name="PR & Press" />} />
                    <Route path="/referral-loyalty/*" element={<M component={ReferralLoyaltyPage} name="Referral & Loyalty" />} />
                    <Route path="/goal-tracker/*" element={<M component={GoalTrackerPage} name="Goal Tracker" />} />
                    <Route path="/ecommerce-hub/*" element={<M component={EcommerceHubPage} name="E-commerce Hub" />} />
                    <Route path="/customer-intelligence/*" element={<Navigate to="/crm" replace />} />
                    <Route path="/support-center/*" element={<Navigate to="/customer-ai" replace />} />
                    <Route path="/knowledge-base/*" element={<M component={KnowledgeBasePage} name="Knowledge Base" />} />
                    <Route path="/the-advisor/*" element={<M component={TheAdvisorPage} name="The Advisor" />} />
                    <Route path="/client-manager/*" element={<M component={ClientManagerPage} name="Client Manager" />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ProtectedRoute>
    </BrandProvider>
    </ToastProvider>
    </ThemeContext.Provider>
    </AuthProvider>
  );
}

/* ═══════════════════════════════════════
   SIDEBAR COMPONENT
   ═══════════════════════════════════════ */
function SidebarNav({ navOpen, setNavOpen, mobileMenuOpen, dark, toggle, terra, ink, muted, location, expandedSections, toggleSection, suppressActive }) {
  const { user, logout } = useAuth();
  const recents = useRecentModules();

  const handleSidebarKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const focusable = e.currentTarget.querySelectorAll('a[href], button:not([disabled])');
    const arr = Array.from(focusable);
    const idx = arr.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') arr[(idx + 1) % arr.length]?.focus();
    else if (e.key === 'ArrowUp') arr[(idx - 1 + arr.length) % arr.length]?.focus();
    else if (e.key === 'Home') arr[0]?.focus();
    else if (e.key === 'End') arr[arr.length - 1]?.focus();
  };

  return (
    <nav aria-label="Main navigation" onKeyDown={handleSidebarKeyDown}
      className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        fixed md:relative inset-y-0 left-0 z-40 md:z-20
        ${navOpen ? 'w-[260px]' : 'md:w-[56px] w-[260px]'}
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col flex-shrink-0
      `}>
      <div className="absolute inset-0"
        style={{ background: dark ? '#1E1B18' : '#FDFBF8', borderRight: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.06)'}` }} />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-4 h-[60px] flex-shrink-0">
        <div className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${terra}, #A84D33)`, boxShadow: '0 2px 8px rgba(196,93,62,0.25)' }}>
          <span className="text-white text-[13px] font-black tracking-tight">O</span>
        </div>
        {navOpen && (
          <div className="flex flex-col">
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 400, color: ink, letterSpacing: '-0.01em' }}>Overload</span>
            <span className="text-[9px] font-semibold tracking-[0.14em] uppercase" style={{ color: muted, marginTop: -2 }}>Marketing OS</span>
          </div>
        )}
      </div>

      <div className="relative mx-4 h-px" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#EDE5DA' }} />

      {/* Navigation body */}
      <div className="relative flex-1 min-h-0 overflow-y-auto pt-4 pb-2 px-3 no-scrollbar">
        {/* Command Center */}
        <NavLink to="/dashboard"
          className={`flex items-center gap-3 rounded-xl transition-all duration-200 group ${navOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center'}`}
          style={{
            color: location.pathname === '/dashboard' ? (dark ? '#F5EDE6' : '#2C2825') : muted,
            fontWeight: location.pathname === '/dashboard' ? 600 : 500,
            background: location.pathname === '/dashboard' ? (dark ? 'rgba(196,93,62,0.12)' : 'rgba(196,93,62,0.07)') : undefined,
          }}
          onMouseEnter={e => { if (location.pathname !== '/dashboard') { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'; e.currentTarget.style.color = ink; } }}
          onMouseLeave={e => { if (location.pathname !== '/dashboard') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; } }}
        >
          <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: location.pathname === '/dashboard' ? (dark ? 'rgba(196,93,62,0.2)' : 'rgba(196,93,62,0.1)') : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)') }}>
            <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke={location.pathname === '/dashboard' ? terra : 'currentColor'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          {navOpen && <span className="text-[12.5px]">Command Center</span>}
        </NavLink>

        {/* Recent modules */}
        {recents.length > 0 && navOpen && (
          <div className="mt-3 mb-1">
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase px-3" style={{ color: dark ? '#3A3632' : '#C8C3BC' }}>Recent</span>
            <div className="mt-1 space-y-0.5">
              {recents.slice(0, 3).map(mod => (
                <NavLink key={mod.id} to={mod.path}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11.5px] transition-all duration-200"
                  style={{ color: location.pathname.startsWith(mod.path) ? ink : muted, fontWeight: location.pathname.startsWith(mod.path) ? 500 : 400 }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.025)'; e.currentTarget.style.color = ink; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = location.pathname.startsWith(mod.path) ? ink : muted; }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: mod.color }} />
                  <span className="truncate">{mod.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Category sections */}
        <div className="mt-4 space-y-1">
          {CATEGORIES.map(cat => {
            const mods = getModulesByCategory(cat.id);
            if (mods.length === 0) return null;
            const isExpanded = !!expandedSections[cat.id];
            const hasActiveMod = !suppressActive && mods.some(m => location.pathname.startsWith(m.path));
            const isLit = hasActiveMod || isExpanded;
            return (
              <div key={cat.id}>
                {cat.id === 'settings' && <div className="mx-2 my-4 h-px" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#EDE5DA' }} />}
                <button onClick={() => toggleSection(cat.id)} aria-expanded={isExpanded} aria-controls={`cat-${cat.id}-items`}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${navOpen ? 'px-3 py-2' : 'p-2.5 justify-center'}`}
                  style={{ background: isLit ? (dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)') : undefined }}
                  onMouseEnter={e => { if (!isLit) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)'; }}
                  onMouseLeave={e => { if (!isLit) e.currentTarget.style.background = 'transparent'; }}
                >
                  {navOpen ? (
                    <>
                      <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ background: isLit ? `${cat.color}${dark ? '18' : '10'}` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)') }}>
                        <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke={isLit ? cat.color : muted}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                        </svg>
                      </div>
                      <span className="flex-1 text-left text-[12.5px] font-medium truncate" style={{ color: isLit ? ink : muted }}>{cat.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded-md" style={{ color: dark ? '#4A4540' : '#B5B0A8', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.03)' }}>{mods.length}</span>
                        <svg className={`w-3 h-3 sidebar-section-arrow ${isExpanded ? 'expanded' : ''} flex-shrink-0`} fill="none" stroke={dark ? '#4A4540' : '#C8C3BC'} viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
                      style={{ background: isLit ? `${cat.color}${dark ? '18' : '10'}` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)') }}>
                      <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke={isLit ? cat.color : muted}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                      </svg>
                    </div>
                  )}
                </button>
                <div id={`cat-${cat.id}-items`} role="region" className={`sidebar-section-items ${(!isExpanded && navOpen) ? 'collapsed' : ''}`}
                  style={{ maxHeight: (isExpanded || !navOpen) ? `${mods.length * 38}px` : '0' }}>
                  {mods.map(mod => {
                    const isActive = !suppressActive && location.pathname.startsWith(mod.path);
                    const isAutopilot = mod.special === 'autopilot';
                    const isAdvisor = mod.special === 'advisor';
                    const isSpecial = isAutopilot || isAdvisor;
                    return (
                      <NavLink key={mod.id} to={mod.path} tabIndex={isExpanded || !navOpen ? 0 : -1}
                        className={`flex items-center gap-2.5 ${navOpen ? 'ml-[42px] px-2.5' : 'px-2 justify-center'} py-[6px] rounded-lg text-[12px] transition-all duration-200 group`}
                        style={{
                          background: isActive ? (dark ? `${mod.color}14` : `${mod.color}0a`) : undefined,
                          color: isActive ? (dark ? '#F5EDE6' : '#2C2825') : isSpecial ? (dark ? '#D97B5A' : terra) : muted,
                          fontWeight: isActive ? 600 : 400,
                        }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.025)'; e.currentTarget.style.color = ink; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isSpecial ? (dark ? '#D97B5A' : terra) : muted; } }}
                      >
                        <svg className="w-[14px] h-[14px] flex-shrink-0 transition-colors" fill={isAdvisor ? mod.color : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                          style={(isActive || isSpecial) ? { color: mod.color } : {}}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                        </svg>
                        {navOpen && <span className="truncate">{mod.name}</span>}
                        {isActive && navOpen && <div className="ml-auto w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: mod.color }} />}
                        {isSpecial && !isActive && navOpen && <div className="ml-auto w-[5px] h-[5px] rounded-full flex-shrink-0 animate-pulse" style={{ background: mod.color, opacity: 0.6 }} />}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative px-3 py-3 space-y-0.5" style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.06)'}` }}>
        {user && navOpen && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${terra}, #A84D33)` }}>
              {(user.displayName || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium truncate" style={{ color: ink }}>{user.displayName || user.email}</div>
              {user.displayName && <div className="text-[9px] truncate" style={{ color: muted }}>{user.email}</div>}
            </div>
          </div>
        )}
        <button onClick={toggle}
          className={`w-full flex items-center ${navOpen ? 'justify-start px-3' : 'justify-center'} gap-2.5 py-2 rounded-xl transition-all duration-200 text-[11.5px] font-medium`}
          style={{ color: muted }}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'; e.currentTarget.style.color = ink; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
        >
          {dark
            ? <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
            : <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
          }
          {navOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={logout}
          className={`w-full flex items-center ${navOpen ? 'justify-start px-3' : 'justify-center'} gap-2.5 py-2 rounded-xl transition-all duration-200 text-[11.5px] font-medium`}
          style={{ color: muted }}
          aria-label="Sign out"
          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'; e.currentTarget.style.color = '#C45D3E'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          {navOpen && <span>Sign Out</span>}
        </button>
        <button onClick={() => setNavOpen(!navOpen)}
          className={`hidden md:flex w-full items-center ${navOpen ? 'justify-start px-3' : 'justify-center'} gap-2.5 py-2 rounded-xl transition-all duration-200 text-[11.5px] font-medium`}
          style={{ color: muted }}
          aria-label={navOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={navOpen}
          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'; e.currentTarget.style.color = ink; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
        >
          <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${navOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {navOpen && <span>Collapse</span>}
        </button>
      </div>
    </nav>
  );
}

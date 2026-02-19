import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    <div className="flex items-center justify-center h-full gap-2.5">
      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C45D3E', animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#5E8E6E', animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#C45D3E', animationDelay: '300ms' }} />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(true);
  const [dark, setDark] = useState(false);
  const [pageKey, setPageKey] = useState(location.pathname);
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const current = MODULE_REGISTRY.find(m =>
    m.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(m.path)
  );
  const toggle = () => setDark(d => !d);

  /* Collapsible sidebar sections */
  const activeCat = current ? current.category : null;
  const [expandedSections, setExpandedSections] = useState({ create: true });
  const [suppressActive, setSuppressActive] = useState(false);

  useEffect(() => {
    if (activeCat) {
      setExpandedSections({ [activeCat]: true });
    }
  }, [activeCat]);

  useEffect(() => {
    setSuppressActive(false);
  }, [location.pathname]);

  const toggleSection = (catId) => {
    setExpandedSections(prev => prev[catId] ? {} : { [catId]: true });
    setSuppressActive(catId !== activeCat);
  };

  useEffect(() => { setPageKey(location.pathname); }, [location.pathname]);

  /* Landing page body overrides */
  useEffect(() => {
    if (isLanding) {
      document.documentElement.style.fontSize = '16px';
      document.body.style.overflow = 'auto';
      document.body.style.background = '#FBF7F0';
    } else {
      document.documentElement.style.fontSize = '16px';
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

  /* ── Warm Editorial Palette ── */
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const muted = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)';

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div data-theme={dark ? 'dark' : 'light'}
        className="flex h-screen overflow-hidden"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          background: dark ? '#1A1816' : '#FBF7F0',
          color: ink,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Subtle warm ambient glow */}
        {!dark && (
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-5%] right-[20%] w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(196,93,62,0.025) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div className="absolute bottom-[-5%] left-[30%] w-[400px] h-[400px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(94,142,110,0.025) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          </div>
        )}

        {/* ═══════ LEFT NAV ═══════ */}
        <nav className={`${navOpen ? 'w-64' : 'w-[52px]'} transition-all duration-300 flex flex-col flex-shrink-0 relative z-20`}>
          <div className="absolute inset-0"
            style={{
              background: dark ? '#201D1B' : '#FFFFFF',
              borderRight: `1px solid ${brd}`,
            }} />

          {/* Logo — matches LP exactly */}
          <div className="relative flex items-center gap-3 px-3.5 h-14 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: terra }}>
              <span className="text-white text-sm font-black">O</span>
            </div>
            {navOpen && (
              <div>
                <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, color: ink }}>
                  Overload
                </span>
                <p className="text-[8px] font-semibold tracking-[0.16em] uppercase" style={{ color: muted }}>
                  Marketing OS
                </p>
              </div>
            )}
          </div>

          <div className="relative mx-3.5 h-px" style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#EDE5DA' }} />

          {/* Navigation */}
          <div className="relative flex-1 min-h-0 overflow-y-auto py-2.5 px-2.5 no-scrollbar">
            {/* Command Center */}
            <NavLink to="/dashboard"
              className={`flex items-center gap-2.5 rounded-lg transition-all duration-200 group ${navOpen ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'}`}
              style={{
                color: location.pathname === '/dashboard' ? terra : muted,
                fontWeight: location.pathname === '/dashboard' ? 600 : undefined,
                background: location.pathname === '/dashboard'
                  ? (dark ? 'rgba(196,93,62,0.08)' : 'rgba(196,93,62,0.05)')
                  : undefined,
                borderLeft: location.pathname === '/dashboard'
                  ? `2px solid ${terra}` : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (location.pathname !== '/dashboard') {
                  e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)';
                  e.currentTarget.style.color = ink;
                }
              }}
              onMouseLeave={e => {
                if (location.pathname !== '/dashboard') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = muted;
                }
              }}
            >
              <svg className="w-[16px] h-[16px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              {navOpen && <span className="text-[12px] uppercase tracking-wider">Command Center</span>}
            </NavLink>

            <div className="mt-3 space-y-0.5">
              {CATEGORIES.map(cat => {
                const mods = getModulesByCategory(cat.id);
                if (mods.length === 0) return null;
                const isExpanded = !!expandedSections[cat.id];
                const hasActiveMod = !suppressActive && mods.some(m => location.pathname.startsWith(m.path));
                const isLit = hasActiveMod || isExpanded;
                return (
                  <div key={cat.id}>
                    {cat.id === 'settings' && (
                      <div className="mx-1 my-3 h-px" style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#EDE5DA' }} />
                    )}

                    {/* Category header */}
                    <button onClick={() => toggleSection(cat.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${navOpen ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'}`}
                      style={{
                        borderLeft: isLit ? `2px solid ${cat.color}` : '2px solid transparent',
                        background: isLit ? (dark ? `${cat.color}08` : `${cat.color}04`) : undefined,
                      }}
                      onMouseEnter={e => {
                        if (!isLit) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)';
                      }}
                      onMouseLeave={e => {
                        if (!isLit) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {navOpen ? (
                        <>
                          <svg className="w-[16px] h-[16px] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                            stroke={isLit ? cat.color : muted}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                          </svg>
                          <span className="flex-1 text-left truncate uppercase tracking-wider"
                            style={{ color: isLit ? ink : muted }}>
                            {cat.label}
                          </span>
                          <span className="text-[10px] tabular-nums font-medium" style={{ color: dark ? '#3D3A37' : '#C8C3BC' }}>{mods.length}</span>
                          <svg className={`w-3 h-3 sidebar-section-arrow ${isExpanded ? 'expanded' : ''} flex-shrink-0`}
                            fill="none" stroke={dark ? '#3D3A37' : '#C8C3BC'} viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </>
                      ) : (
                        <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                          stroke={isLit ? cat.color : muted}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                        </svg>
                      )}
                    </button>

                    {/* Collapsible module items */}
                    <div className={`sidebar-section-items ${(!isExpanded && navOpen) ? 'collapsed' : ''}`}
                      style={{ maxHeight: (isExpanded || !navOpen) ? `${mods.length * 40}px` : '0' }}>
                      {mods.map(mod => {
                        const isActive = !suppressActive && location.pathname.startsWith(mod.path);
                        const isAutopilot = mod.special === 'autopilot';
                        const isAdvisor = mod.special === 'advisor';
                        const isSpecial = isAutopilot || isAdvisor;
                        return (
                          <NavLink key={mod.id} to={mod.path}
                            className={`flex items-center gap-2.5 ${navOpen ? 'ml-3 pl-4 pr-2.5' : 'px-2 justify-center'} py-[7px] rounded-md text-[11.5px] transition-all duration-200 group`}
                            style={{
                              borderLeft: isActive ? `2px solid ${mod.color}` : '2px solid transparent',
                              background: isActive ? (dark ? `${mod.color}0c` : `${mod.color}06`) : undefined,
                              color: isActive ? ink
                                : isSpecial ? (dark ? '#D97B5A' : '#B45309')
                                : muted,
                              fontWeight: isActive ? 600 : undefined,
                            }}
                            onMouseEnter={e => {
                              if (!isActive) {
                                e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.02)' : 'rgba(44,40,37,0.02)';
                                e.currentTarget.style.color = ink;
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isActive) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = isSpecial ? (dark ? '#D97B5A' : '#B45309') : muted;
                              }
                            }}
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0 transition-colors" fill={isAdvisor ? mod.color : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                              style={(isActive || isSpecial) ? { color: mod.color } : {}}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                            </svg>
                            {navOpen && <span className="truncate">{mod.name}</span>}
                            {isActive && navOpen && (
                              <div className="ml-auto w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: mod.color }} />
                            )}
                            {isSpecial && !isActive && navOpen && (
                              <div className="ml-auto w-[5px] h-[5px] rounded-full flex-shrink-0 animate-pulse" style={{ background: mod.color, opacity: 0.5 }} />
                            )}
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
          <div className="relative px-2.5 py-2.5 space-y-0.5" style={{ borderTop: `1px solid ${brd}` }}>
            <button onClick={toggle}
              className={`w-full flex items-center ${navOpen ? 'justify-start px-3' : 'justify-center'} gap-2.5 py-2 rounded-lg transition-all text-[11px] font-medium`}
              style={{ color: muted }}
              onMouseEnter={e => {
                e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)';
                e.currentTarget.style.color = ink;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = muted;
              }}
            >
              {dark ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
              {navOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={() => setNavOpen(!navOpen)}
              className={`w-full flex items-center ${navOpen ? 'justify-start px-3' : 'justify-center'} gap-2.5 py-2 rounded-lg transition-all text-[11px] font-medium`}
              style={{ color: muted }}
              onMouseEnter={e => {
                e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)';
                e.currentTarget.style.color = ink;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = muted;
              }}
            >
              <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${navOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {navOpen && <span>Collapse</span>}
            </button>
          </div>
        </nav>

        {/* ═══════ MAIN ═══════ */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Clean warm header */}
          <header className="h-12 flex items-center px-5 flex-shrink-0 relative"
            style={{ borderBottom: `1px solid ${brd}` }}>
            <div className="absolute inset-0"
              style={{
                background: dark ? 'rgba(26,24,22,0.92)' : 'rgba(251,247,240,0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }} />

            <div className="relative flex items-center gap-2 text-xs">
              {location.pathname !== '/dashboard' && (
                <button onClick={() => navigate(-1)}
                  className="mr-1 p-1.5 rounded-lg transition-all duration-200"
                  style={{ color: muted }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)'; e.currentTarget.style.color = terra; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                  title="Go back">
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

            <div className="relative ml-auto flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-[6px] h-[6px] rounded-full" style={{ background: sage }} />
                <span className="font-semibold tracking-wider" style={{ fontSize: '9px', color: sage }}>
                  SYSTEMS ONLINE
                </span>
              </div>
              <span className="text-[9px] font-medium tracking-wider" style={{ color: muted }}>
                {MODULE_REGISTRY.length} MODULES
              </span>
            </div>
          </header>

          {/* Page content */}
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

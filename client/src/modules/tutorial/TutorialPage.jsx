import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../context/ThemeContext';

// ─── Chapter Data ──────────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    subtitle: 'Your Command Center',
    color: '#C45D3E',
    icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    intro: 'Overload is your AI-powered marketing command center. Everything starts from the dashboard — your real-time overview of campaigns, content, and performance across every channel.',
    steps: [
      {
        title: 'The Command Center',
        text: 'When you log in, you land on the Command Center — your mission control. It shows a live operations feed of all AI actions, pending approvals, module status across all 41 tools, and daily KPIs. Think of it as the nervous system of your entire marketing stack.',
        path: '/dashboard',
        cta: 'Open Command Center',
      },
      {
        title: 'Navigating the Sidebar',
        text: 'The left sidebar organizes all 41 modules into categories: Create, Advertise, Analyze, Manage, Connect, Automate, and Settings. Click any module to open it. The sidebar collapses on smaller screens — use the hamburger menu to toggle it. Your 3 most-used modules appear at the top for quick access. At the top of the sidebar, you\'ll see the Workspace Switcher — use it to switch between workspaces if you manage multiple brands or clients.',
      },
      {
        title: 'Dark Mode & Theme',
        text: 'Toggle between light and dark themes using the sun/moon icon in the top-right corner of the header. Overload remembers your preference. The warm cream-to-dark palette is designed for extended use without eye strain.',
      },
      {
        title: 'Notifications',
        text: 'The bell icon in the header shows real-time notifications — AI completions, approval requests, failed actions, and rule triggers. Click to open the notification panel, and mark items as read individually or all at once.',
      },
    ],
    tip: 'Pro tip: The Command Center updates in real-time. Leave it open in a tab to monitor your marketing operations throughout the day.',
  },
  {
    id: 'brand-content',
    title: 'Brand & Content',
    subtitle: 'Create On-Brand Content',
    color: '#f97316',
    icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
    intro: 'Every piece of content Overload generates is shaped by your Brand Profile. Set it up once, and every AI module — from blog posts to ad copy to email campaigns — speaks in your voice.',
    steps: [
      {
        title: 'Set Up Your Brand Profile',
        text: 'Head to Brand Hub and fill in your brand name, tagline, voice description, target audience, and key differentiators. Upload your logo and brand colors. The AI uses all of this as context when generating any content. The more detail you provide, the better the output.',
        path: '/brand-hub',
        cta: 'Open Brand Hub',
      },
      {
        title: 'Create Your First Content',
        text: 'Open the Content Creator module. Choose a content type — blog post, social caption, ad copy, email, or landing page. Describe what you want in plain English, select tone and length, and hit Generate. The AI produces a fully-formed draft using your brand profile.',
        path: '/content',
        cta: 'Open Content Creator',
      },
      {
        title: 'Visual Content with Creative Studio',
        text: 'For visual assets — social media graphics, ad banners, carousel images — use the Creative Studio. It generates image concepts with copy overlays, sized for each platform. You can regenerate, edit copy, and export directly.',
        path: '/creative',
        cta: 'Open Creative Studio',
      },
      {
        title: 'AI Tools Tab',
        text: 'Every module has an "AI Tools" tab at the top. These are pre-built AI templates specific to that module — for Content, that means "Blog Post Generator", "Product Description Writer", "Social Caption Generator", etc. Select a template, fill in the brief, and generate.',
      },
    ],
    tip: 'Pro tip: The more detailed your Brand Hub profile, the less editing you\'ll need on AI-generated content. Spend 10 minutes here to save hours later.',
  },
  {
    id: 'advertising',
    title: 'Advertising & Campaigns',
    subtitle: 'Run Ads Across Every Platform',
    color: '#10b981',
    icon: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46',
    intro: 'Overload manages advertising across Google, Meta, TikTok, Pinterest, and Snapchat — all from one interface. Create campaigns, optimize budgets, and track ROAS without switching between ad platforms.',
    steps: [
      {
        title: 'Ads Manager',
        text: 'The Ads module is your unified ad dashboard. Create campaigns for Google Search, Display, Meta (Facebook + Instagram), TikTok, and more. Set budgets, define audiences, write ad copy (AI-assisted), and launch — all without leaving Overload. Performance metrics sync in real-time.',
        path: '/ads',
        cta: 'Open Ads Manager',
      },
      {
        title: 'Funnel Builder',
        text: 'Design complete marketing funnels — from awareness ads through retargeting to conversion. The Funnel Builder visualizes each stage, lets you attach campaigns and content, and tracks drop-off rates. AI suggests optimizations at every stage.',
        path: '/funnels',
        cta: 'Open Funnel Builder',
      },
      {
        title: 'A/B Testing',
        text: 'Run split tests on ad copy, landing pages, email subject lines, and more. The A/B Testing module sets up variants, tracks statistical significance, and auto-picks winners. In Autopilot mode, it can run tests continuously and deploy winners automatically.',
        path: '/ab-testing',
        cta: 'Open A/B Testing',
      },
      {
        title: 'Budget Optimizer',
        text: 'Stop guessing how to allocate budget. The Budget Optimizer analyzes ROAS across all your campaigns and channels, then recommends (or automatically shifts) budget toward the highest performers. Set daily, weekly, or monthly caps for safety.',
        path: '/budget-optimizer',
        cta: 'Open Budget Optimizer',
      },
    ],
    tip: 'Pro tip: Connect your ad platform accounts in Integrations first. Overload pulls in historical data to make smarter recommendations from day one.',
  },
  {
    id: 'analytics-seo',
    title: 'Analytics & SEO',
    subtitle: 'Measure Everything',
    color: '#f43f5e',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    intro: 'Data drives everything in Overload. The Analytics and SEO modules give you deep visibility into what\'s working, what\'s not, and where to focus next — with AI-powered recommendations.',
    steps: [
      {
        title: 'Analytics Dashboard',
        text: 'The Analytics module aggregates data from all connected platforms into a unified dashboard. See traffic, conversions, revenue, engagement, and attribution — broken down by channel, campaign, and time period. AI highlights anomalies and trends automatically.',
        path: '/analytics',
        cta: 'Open Analytics',
      },
      {
        title: 'SEO Suite',
        text: 'Research keywords, analyze competitors\' rankings, generate optimized meta tags, audit your site structure, and track position changes over time. The SEO module includes a keyword research tool, meta tag generator, site auditor, and rank tracker.',
        path: '/seo',
        cta: 'Open SEO Suite',
      },
      {
        title: 'Competitor Intelligence',
        text: 'Track what your competitors are doing — their ad spend, content strategy, keyword rankings, and social performance. The Competitors module monitors changes and alerts you to opportunities. AI generates battle cards and differentiation strategies.',
        path: '/competitors',
        cta: 'Open Competitors',
      },
      {
        title: 'Reports & Goal Tracking',
        text: 'Build custom reports combining data from any module. Schedule automatic weekly or monthly reports. The Goal Tracker lets you set KPIs (revenue, traffic, leads) and tracks progress with visual dashboards and forecasting.',
        path: '/reports',
        cta: 'Open Reports',
      },
    ],
    tip: 'Pro tip: Set up Goal Tracker first with your key KPIs. The AI Advisor uses these goals to prioritize its daily recommendations.',
  },
  {
    id: 'automation',
    title: 'Automation Modes',
    subtitle: 'Manual → Copilot → Autopilot',
    color: '#D4A017',
    icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
    intro: 'The heart of Overload is its 3-mode automation system. Every automatable module can operate in Manual, Copilot, or Autopilot mode — giving you full control over how much AI autonomy you\'re comfortable with.',
    steps: [
      {
        title: 'Manual Mode',
        text: 'The default. You do everything yourself — the AI tools are available but only run when you explicitly ask. Every action requires your input. This is ideal when you\'re learning the platform or working on sensitive campaigns.',
      },
      {
        title: 'Copilot Mode',
        text: 'The AI proactively generates suggestions — draft blog posts, ad copy improvements, budget adjustments, send-time recommendations — but nothing happens until you approve. Suggestions appear in the module\'s Copilot panel and in the Approval Queue. Think of it as having an AI assistant that prepares work for your review.',
        path: '/approvals',
        cta: 'Open Approval Queue',
      },
      {
        title: 'Autopilot Mode',
        text: 'Full AI autonomy. The AI takes action automatically based on rules you\'ve configured — publishing content, adjusting budgets, responding to reviews, sending campaigns. You can monitor everything in the Activity Log and set safety limits in Automation Settings. A manual override is always one click away.',
        path: '/autopilot',
        cta: 'Open Autopilot Hub',
      },
      {
        title: 'Automation Rules',
        text: 'Define the rules that govern Autopilot behavior. Three trigger types: Schedule (run every Monday at 9am), Event (when a new review comes in), and Threshold (when ROAS drops below 2x). Each rule specifies an action and whether it requires approval before executing.',
        path: '/automation-rules',
        cta: 'Open Automation Rules',
      },
      {
        title: 'The Advisor',
        text: 'Your AI marketing strategist. Every morning, The Advisor analyzes all your data, identifies issues and opportunities, and presents a prioritized briefing. It might catch a bleeding campaign, suggest a content topic trending in your niche, or recommend shifting budget to a high-performing channel.',
        path: '/the-advisor',
        cta: 'Open The Advisor',
      },
    ],
    tip: 'Pro tip: Start with Manual mode while learning. Switch individual modules to Copilot as you get comfortable, then graduate high-trust tasks (like scheduled social posts) to Autopilot.',
  },
  {
    id: 'integrations',
    title: 'Integrations & APIs',
    subtitle: 'Connect Your Stack',
    color: '#6366f1',
    icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
    intro: 'Overload becomes exponentially more powerful when connected to your existing tools. Integrations pull in live data, enable cross-platform automation, and let Overload take actions in external platforms.',
    steps: [
      {
        title: 'Connect Your First Platform',
        text: 'Go to Integrations and browse available platforms — Shopify, Google Ads, Meta Ads, Klaviyo, Stripe, HubSpot, Mailchimp, and more. Most integrations use API keys: click "Enter Key", paste your key, and you\'re connected. Data syncs immediately.',
        path: '/integrations',
        cta: 'Open Integrations',
      },
      {
        title: 'What Data Syncs',
        text: 'Each integration syncs different data. E-commerce platforms (Shopify, BigCommerce) sync orders, revenue, and product data. Ad platforms sync campaign performance, spend, and ROAS. Email tools sync subscriber counts and campaign metrics. All this data feeds into Analytics and The Advisor.',
      },
      {
        title: 'API Manager',
        text: 'For advanced users, the API Manager lets you create and manage custom API connections. Generate API keys for external tools to push data into Overload, or configure custom webhooks to trigger actions in other systems when events occur in Overload.',
        path: '/api-manager',
        cta: 'Open API Manager',
      },
      {
        title: 'Webhooks & Zapier',
        text: 'Webhooks send real-time notifications to external URLs when events occur. Zapier integration lets you connect Overload to 5,000+ apps without code. Set up triggers like "when Overload publishes a blog post, add it to my Notion database" or "when a campaign fails, message me on Slack".',
        path: '/webhooks',
        cta: 'Open Webhooks',
      },
    ],
    tip: 'Pro tip: Connect Shopify/Stripe first for revenue data, then your ad platforms. This lets the AI calculate true ROAS from day one.',
  },
  {
    id: 'team-settings',
    title: 'Team & Settings',
    subtitle: 'Configure Your Workspace',
    color: '#64748b',
    icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z',
    icon2: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    intro: 'Manage your workspaces, team members, configure automation safety limits, and customize how Overload works for your business.',
    steps: [
      {
        title: 'Workspaces',
        text: 'Workspaces are the foundation of how Overload organizes your data. Each workspace is a completely isolated environment — its own brand profile, contacts, campaigns, content, analytics, and integrations. If you run multiple businesses, manage clients as an agency, or simply want to keep projects separate, create a workspace for each one. Use the Workspace Switcher at the top of the sidebar to jump between them instantly. All your data stays completely isolated between workspaces.',
        path: '/workspace-settings',
        cta: 'Open Workspace Settings',
      },
      {
        title: 'Workspace Members & Roles',
        text: 'Invite team members to any workspace with role-based access. Owners have full control — they can rename the workspace, manage members, and delete the workspace. Editors can create and modify content, campaigns, and settings. Viewers have read-only access to dashboards and reports. Invite members by email from Workspace Settings and change roles anytime.',
        path: '/workspace-settings',
        cta: 'Manage Members',
      },
      {
        title: 'Team Management',
        text: 'Beyond workspace roles, the Team module lets you manage your broader team structure — track assignments, manage invites, and coordinate across your organization.',
        path: '/team',
        cta: 'Open Team',
      },
      {
        title: 'Client Manager',
        text: 'If you manage marketing for multiple clients (agency use), combine Workspaces with the Client Manager for the ultimate setup. Create a workspace per client for fully isolated data, then use the Client Manager within each workspace to organize projects, track deliverables, and manage client-specific details.',
        path: '/client-manager',
        cta: 'Open Client Manager',
      },
      {
        title: 'Automation Settings',
        text: 'Configure global safety limits — maximum actions per day, maximum per hour, budget caps, minimum confidence thresholds. You can pause all automation instantly with one button (and resume later, restoring previous modes). Set notification preferences for different event types.',
        path: '/automation-settings',
        cta: 'Open Automation Settings',
      },
      {
        title: 'Scheduler & Calendar',
        text: 'The Scheduler lets you queue content and campaigns for future publish dates. The Calendar gives you a visual timeline of everything scheduled across all channels. Drag-and-drop to reschedule. Color-coded by module for easy scanning.',
        path: '/calendar',
        cta: 'Open Calendar',
      },
    ],
    tip: 'Pro tip: If you manage multiple brands or clients, create separate workspaces for each before setting up Brand Hub and Integrations. This keeps all data completely isolated from the start.',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TutorialPage() {
  usePageTitle('Tutorial');
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [activeChapter, setActiveChapter] = useState(0);
  const contentRef = useRef(null);

  // Scroll to top of content when chapter changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeChapter]);

  // Theme tokens
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const t2 = dark ? '#94908A' : '#7A756F';
  const t3 = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const surface = dark ? 'rgba(255,255,255,0.02)' : '#fff';
  const surfaceHover = dark ? 'rgba(255,255,255,0.05)' : 'rgba(44,40,37,0.02)';
  const fraunces = "'Fraunces', Georgia, serif";
  const dmSans = "'DM Sans', system-ui, sans-serif";

  const chapter = CHAPTERS[activeChapter];

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: `linear-gradient(135deg, #C45D3E20, #5E8E6E20)`,
            }}>
              <svg className="w-5 h-5" style={{ color: '#C45D3E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontFamily: fraunces, fontStyle: 'italic', fontSize: 24, fontWeight: 400, color: ink, letterSpacing: '-0.02em' }}>
                Tutorial
              </h1>
              <p style={{ fontSize: 12, color: t3, fontFamily: dmSans }}>
                Learn how to use every feature of Overload
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row px-4 sm:px-6 lg:px-10 pb-6">
        <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-0 lg:gap-6">

          {/* ── Chapter nav (desktop sidebar) ── */}
          <div className="hidden lg:flex flex-col gap-1 w-[240px] flex-shrink-0 pt-4 overflow-y-auto no-scrollbar">
            {CHAPTERS.map((ch, i) => {
              const isActive = i === activeChapter;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(i)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: isActive ? `${ch.color}12` : 'transparent',
                    border: `1px solid ${isActive ? `${ch.color}25` : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = surfaceHover; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    background: isActive ? `${ch.color}20` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'),
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: isActive ? ch.color : t3, fontFamily: dmSans }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 12.5, fontWeight: isActive ? 600 : 500, color: isActive ? ink : t2, fontFamily: dmSans }} className="truncate">
                      {ch.title}
                    </p>
                    <p style={{ fontSize: 10, color: isActive ? ch.color : t3, fontFamily: dmSans }} className="truncate">
                      {ch.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Completion hint */}
            <div className="mt-4 px-3 py-3 rounded-xl" style={{ background: dark ? 'rgba(94,142,110,0.08)' : 'rgba(94,142,110,0.06)', border: `1px solid ${dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)'}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#5E8E6E', fontFamily: dmSans, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Quick Start Path
              </p>
              <p style={{ fontSize: 11, color: t2, lineHeight: 1.5, fontFamily: dmSans }}>
                Workspace → Brand Hub → Integrations → Content Creator → Autopilot
              </p>
            </div>
          </div>

          {/* ── Mobile chapter pills ── */}
          <div className="lg:hidden flex-shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar pb-3 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
            {CHAPTERS.map((ch, i) => {
              const isActive = i === activeChapter;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(i)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
                  style={{
                    background: isActive ? `${ch.color}18` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'),
                    border: `1px solid ${isActive ? `${ch.color}30` : brd}`,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? ch.color : t3 }}>{i + 1}</span>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500, color: isActive ? ink : t2, whiteSpace: 'nowrap' }}>{ch.title}</span>
                </button>
              );
            })}
          </div>

          {/* ── Content area ── */}
          <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto no-scrollbar pt-4">
            <div className="animate-fade-in" key={chapter.id}>

              {/* Chapter hero */}
              <div className="rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative overflow-hidden" style={{
                background: `linear-gradient(135deg, ${chapter.color}10, ${chapter.color}05)`,
                border: `1px solid ${chapter.color}18`,
              }}>
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.04]" style={{ background: chapter.color }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-[0.03]" style={{ background: chapter.color }} />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span style={{ fontSize: 10, fontWeight: 700, color: chapter.color, fontFamily: dmSans, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Chapter {activeChapter + 1} of {CHAPTERS.length}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                      background: `${chapter.color}15`,
                      border: `1px solid ${chapter.color}25`,
                    }}>
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: chapter.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={chapter.icon} />
                        {chapter.icon2 && <path strokeLinecap="round" strokeLinejoin="round" d={chapter.icon2} />}
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h2 style={{ fontFamily: fraunces, fontStyle: 'italic', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 400, color: ink, lineHeight: 1.2, marginBottom: 4 }}>
                        {chapter.title}
                      </h2>
                      <p style={{ fontSize: 13, color: chapter.color, fontWeight: 600, fontFamily: dmSans, marginBottom: 12 }}>
                        {chapter.subtitle}
                      </p>
                      <p style={{ fontSize: 14, color: t2, lineHeight: 1.7, fontFamily: dmSans, maxWidth: 560 }}>
                        {chapter.intro}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {chapter.steps.map((step, i) => (
                  <div key={i} className="rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200" style={{
                    background: surface,
                    border: `1px solid ${brd}`,
                  }}>
                    <div className="flex gap-3 sm:gap-4">
                      {/* Step number */}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                        background: `${chapter.color}12`,
                        border: `1.5px solid ${chapter.color}30`,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: chapter.color, fontFamily: dmSans }}>
                          {i + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: ink, fontFamily: dmSans, marginBottom: 6 }}>
                          {step.title}
                        </h3>
                        <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, fontFamily: dmSans, marginBottom: step.path ? 14 : 0 }}>
                          {step.text}
                        </p>

                        {step.path && (
                          <button
                            onClick={() => navigate(step.path)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all duration-200"
                            style={{
                              background: `linear-gradient(135deg, ${chapter.color}, ${chapter.color}dd)`,
                              boxShadow: `0 2px 8px -2px ${chapter.color}40`,
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: dmSans,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 14px -2px ${chapter.color}50`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 2px 8px -2px ${chapter.color}40`; }}
                          >
                            {step.cta}
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip callout */}
              {chapter.tip && (
                <div className="rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 flex gap-3" style={{
                  background: dark ? 'rgba(212,160,23,0.06)' : 'rgba(212,160,23,0.05)',
                  border: `1px solid ${dark ? 'rgba(212,160,23,0.15)' : 'rgba(212,160,23,0.12)'}`,
                }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                    background: 'rgba(212,160,23,0.15)',
                  }}>
                    <svg className="w-3.5 h-3.5" style={{ color: '#D4A017' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 13, color: dark ? '#D4A017' : '#9B7B10', lineHeight: 1.65, fontFamily: dmSans, fontWeight: 500 }}>
                    {chapter.tip}
                  </p>
                </div>
              )}

              {/* Chapter navigation */}
              <div className="flex items-center justify-between gap-2 pt-2 pb-4" style={{ borderTop: `1px solid ${brd}` }}>
                {activeChapter > 0 ? (
                  <button
                    onClick={() => setActiveChapter(activeChapter - 1)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all min-w-0 max-w-[45%]"
                    style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)', fontSize: 12, fontWeight: 600, color: t2, fontFamily: dmSans }}
                    onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    <span className="truncate">{CHAPTERS[activeChapter - 1].title}</span>
                  </button>
                ) : <div />}

                {activeChapter < CHAPTERS.length - 1 ? (
                  <button
                    onClick={() => setActiveChapter(activeChapter + 1)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all min-w-0 max-w-[45%] ml-auto"
                    style={{ background: `${CHAPTERS[activeChapter + 1].color}12`, border: `1px solid ${CHAPTERS[activeChapter + 1].color}20`, fontSize: 12, fontWeight: 600, color: CHAPTERS[activeChapter + 1].color, fontFamily: dmSans }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${CHAPTERS[activeChapter + 1].color}20`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${CHAPTERS[activeChapter + 1].color}12`; }}
                  >
                    <span className="truncate">{CHAPTERS[activeChapter + 1].title}</span>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-white transition-all ml-auto"
                    style={{ background: 'linear-gradient(135deg, #5E8E6E, #5E8E6Edd)', boxShadow: '0 2px 8px rgba(94,142,110,0.3)', fontSize: 12, fontWeight: 700, fontFamily: dmSans }}
                  >
                    <span className="truncate">Start Using Overload</span>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { MODULE_REGISTRY, CATEGORIES } from '../../config/modules';

// ─── Knowledge Base ──────────────────────────────────────────────────────────

const TOPICS = [
  {
    keywords: ['get started', 'getting started', 'begin', 'new', 'first', 'start', 'how to use', 'help me start'],
    response: "Welcome to Overload! Here's how to get started:",
    steps: [
      'Set up your **Brand Hub** with your brand voice, colors, and target audience',
      'Connect your platforms in **Integrations** (Shopify, Google Ads, Meta, etc.)',
      'Create your first content with **AI Content** or **Creative & Design**',
      'Explore **The Advisor** for daily AI marketing recommendations',
    ],
    links: [
      { label: 'Brand Hub', path: '/brand-hub' },
      { label: 'Tutorial', path: '/tutorial' },
    ],
  },
  {
    keywords: ['autopilot', 'automatic', 'auto pilot', 'autonomous', 'ai run', 'hands free'],
    response: "**Autopilot Mode** lets AI run your marketing automatically. Here's how it works:",
    steps: [
      '**Manual** — You control everything. AI tools only run when you ask.',
      '**Copilot** — AI suggests actions, but you approve each one before it executes.',
      '**Autopilot** — AI takes action automatically based on rules you set.',
    ],
    extra: 'Start with Manual, graduate modules to Copilot, then Autopilot for trusted tasks. Set safety limits in Automation Settings first!',
    links: [
      { label: 'Autopilot Hub', path: '/autopilot' },
      { label: 'Automation Settings', path: '/automation-settings' },
    ],
  },
  {
    keywords: ['copilot', 'suggestions', 'approve', 'approval', 'pending'],
    response: "**Copilot Mode** gives you AI suggestions that require your approval before executing.",
    steps: [
      'Enable Copilot on any module from its settings',
      'AI generates draft content, budget changes, or campaign tweaks',
      'Review everything in the **Approval Queue**',
      'Approve, edit, or reject each suggestion',
    ],
    links: [
      { label: 'Approval Queue', path: '/approvals' },
      { label: 'Automation Rules', path: '/automation-rules' },
    ],
  },
  {
    keywords: ['integration', 'connect', 'shopify', 'google ads', 'meta', 'api', 'webhook', 'zapier', 'platform'],
    response: "Connect your marketing platforms to unlock Overload's full power:",
    steps: [
      'Go to **Integrations Hub** and browse available platforms',
      'Click a platform and enter your API key — data syncs immediately',
      'Use **API Manager** for custom connections',
      'Set up **Webhooks** for cross-platform automation',
    ],
    links: [
      { label: 'Integrations', path: '/integrations' },
      { label: 'API Manager', path: '/api-manager' },
      { label: 'Webhooks', path: '/webhooks' },
    ],
  },
  {
    keywords: ['content', 'blog', 'write', 'copy', 'caption', 'article', 'post'],
    response: "Overload's AI content tools can write anything for your brand:",
    steps: [
      '**AI Content** — Blog posts, ad copy, product descriptions, email sequences',
      '**Creative & Design** — Visual assets, social graphics, banners',
      '**Social Media** — Captions, hashtags, and scheduled posts',
      'All content uses your Brand Hub profile for consistent voice',
    ],
    links: [
      { label: 'AI Content', path: '/content' },
      { label: 'Creative Studio', path: '/creative' },
      { label: 'Social Media', path: '/social' },
    ],
  },
  {
    keywords: ['ads', 'advertis', 'campaign', 'google ads', 'meta ads', 'tiktok', 'roas', 'budget', 'spend'],
    response: "Run ads across every major platform from one place:",
    steps: [
      '**Paid Advertising** — Create Google, Meta, and TikTok campaigns',
      '**Budget Optimizer** — AI auto-allocates budget to top performers',
      '**A/B Testing** — Split test creatives and copy automatically',
      '**Funnel Builder** — Build full conversion funnels',
    ],
    links: [
      { label: 'Ads Manager', path: '/ads' },
      { label: 'Budget Optimizer', path: '/budget-optimizer' },
      { label: 'A/B Testing', path: '/ab-testing' },
    ],
  },
  {
    keywords: ['analytics', 'data', 'report', 'metrics', 'performance', 'stats', 'tracking', 'dashboard'],
    response: "Track everything with Overload's analytics tools:",
    steps: [
      '**Analytics** — Unified dashboard across all channels',
      '**Goal Tracker** — Set KPIs and track progress',
      '**Client Reports** — White-label reports with PDF export',
      '**Competitor Intel** — Monitor what competitors are doing',
    ],
    links: [
      { label: 'Analytics', path: '/analytics' },
      { label: 'Goal Tracker', path: '/goal-tracker' },
      { label: 'Reports', path: '/reports' },
    ],
  },
  {
    keywords: ['seo', 'keyword', 'search engine', 'rank', 'serp', 'meta tag', 'organic'],
    response: "Boost your organic presence with the SEO Suite:",
    steps: [
      'Research keywords and analyze competition',
      'Generate optimized meta tags and content',
      'Run site audits to find technical issues',
      'Track your rankings over time',
    ],
    links: [
      { label: 'SEO Suite', path: '/seo' },
      { label: 'Competitor Intel', path: '/competitors' },
    ],
  },
  {
    keywords: ['email', 'sms', 'drip', 'newsletter', 'campaign', 'sequence'],
    response: "Email & SMS marketing made easy with AI:",
    steps: [
      'Build email campaigns with AI-generated copy',
      'Set up drip sequences and automated workflows',
      'Send SMS blasts for time-sensitive offers',
      'A/B test subject lines automatically',
    ],
    links: [
      { label: 'Email & SMS', path: '/email-sms' },
      { label: 'Scheduler', path: '/scheduler' },
    ],
  },
  {
    keywords: ['team', 'invite', 'member', 'permission', 'role', 'client', 'agency'],
    response: "Manage your team and clients:",
    steps: [
      '**Team & Permissions** — Invite members with Admin, Editor, or Viewer roles',
      '**Client Manager** — Organize multiple brands (for agencies)',
      'Set per-module access permissions',
      'Track team activity in the **Activity Log**',
    ],
    links: [
      { label: 'Team', path: '/team' },
      { label: 'Client Manager', path: '/client-manager' },
      { label: 'Activity Log', path: '/activity' },
    ],
  },
  {
    keywords: ['video', 'reel', 'ugc', 'script', 'storyboard'],
    response: "Create video content with AI:",
    steps: [
      'Generate video scripts, hooks, and angles',
      'Build storyboards and UGC briefs',
      'AI-powered video ad creation pipeline',
      'Export for TikTok, Reels, YouTube Shorts',
    ],
    links: [
      { label: 'Video Marketing', path: '/video-marketing' },
    ],
  },
  {
    keywords: ['schedule', 'calendar', 'plan', 'when', 'timing', 'queue'],
    response: "Plan and schedule your marketing activities:",
    steps: [
      '**Scheduler** — Queue content and campaigns at optimal times',
      '**Marketing Calendar** — Visual timeline of everything scheduled',
      'Drag-and-drop to reschedule',
      'AI suggests the best send times',
    ],
    links: [
      { label: 'Scheduler', path: '/scheduler' },
      { label: 'Calendar', path: '/calendar' },
    ],
  },
  {
    keywords: ['advisor', 'briefing', 'recommend', 'suggestion', 'priority', 'morning'],
    response: "**The Advisor** is your AI marketing strategist:",
    steps: [
      "Every day, it analyzes all your data across modules",
      'Identifies issues, opportunities, and trends',
      'Presents a prioritized action list',
      'Catches bleeding campaigns and suggests budget shifts',
    ],
    links: [
      { label: 'The Advisor', path: '/the-advisor' },
    ],
  },
  {
    keywords: ['dark mode', 'theme', 'light mode', 'appearance', 'color'],
    response: "You can switch between light and dark themes:",
    steps: [
      'Click the **sun/moon icon** in the top-right header',
      'Overload remembers your preference',
      'The warm palette is designed for comfortable extended use',
    ],
    links: [],
  },
  {
    keywords: ['command', 'search', 'ctrl k', 'find', 'navigate', 'shortcut'],
    response: "Use the **Command Palette** for quick navigation:",
    steps: [
      'Press **Ctrl+K** (or Cmd+K on Mac) to open it',
      'Type any module name to jump there instantly',
      'Search across all 41 modules',
      'Works from any page in the dashboard',
    ],
    links: [],
  },
];

const SUGGESTIONS = [
  'How do I get started?',
  'What is Autopilot?',
  'How do I run ads?',
  'Show me analytics tools',
  'How do integrations work?',
  'Tell me about the Advisor',
  'How to create content?',
  'Email marketing tips',
];

// ─── Message Matching ────────────────────────────────────────────────────────

function matchTopic(input) {
  const lower = input.toLowerCase().trim();

  // Check pre-built topics first
  for (const topic of TOPICS) {
    for (const kw of topic.keywords) {
      if (lower.includes(kw)) return { type: 'topic', data: topic };
    }
  }

  // Try matching a module by name or description
  const moduleMatches = MODULE_REGISTRY.filter(m =>
    lower.includes(m.name.toLowerCase()) ||
    m.name.toLowerCase().split(/\s+/).some(w => w.length > 3 && lower.includes(w.toLowerCase())) ||
    m.description.toLowerCase().split(/\s+/).some(w => w.length > 4 && lower.includes(w.toLowerCase()))
  );

  if (moduleMatches.length > 0) {
    return { type: 'modules', data: moduleMatches.slice(0, 4) };
  }

  // Try matching a category
  const catMatch = CATEGORIES.find(c =>
    lower.includes(c.label.toLowerCase()) || lower.includes(c.id)
  );
  if (catMatch) {
    const mods = MODULE_REGISTRY.filter(m => m.category === catMatch.id);
    return { type: 'category', data: { category: catMatch, modules: mods } };
  }

  return null;
}

function getRandomSuggestions(exclude, count = 3) {
  const filtered = SUGGESTIONS.filter(s => s !== exclude);
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatBot() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  // Theme tokens
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const t2 = dark ? '#94908A' : '#7A756F';
  const t3 = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.07)' : 'rgba(44,40,37,0.08)';
  const bg = dark ? '#1A1816' : '#FFFFFF';
  const bgPanel = dark ? '#1E1C1A' : '#FBF7F0';
  const bgInput = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)';
  const bgBotMsg = dark ? 'rgba(196,93,62,0.08)' : 'rgba(196,93,62,0.06)';
  const bgUserMsg = dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)';
  const fraunces = "'Fraunces', Georgia, serif";
  const dmSans = "'DM Sans', system-ui, sans-serif";

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSend = useCallback((text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');

    // Add user message
    const userMsg = { role: 'user', text: msg };

    // Match and build bot response
    const match = matchTopic(msg);
    let botMsg;

    if (match?.type === 'topic') {
      const t = match.data;
      botMsg = {
        role: 'bot',
        text: t.response,
        steps: t.steps,
        extra: t.extra,
        links: t.links,
        suggestions: getRandomSuggestions(msg),
      };
    } else if (match?.type === 'modules') {
      const mods = match.data;
      botMsg = {
        role: 'bot',
        text: mods.length === 1
          ? `**${mods[0].name}** — ${mods[0].description}`
          : `I found ${mods.length} relevant modules:`,
        links: mods.map(m => ({ label: m.name, path: m.path })),
        suggestions: getRandomSuggestions(msg),
      };
    } else if (match?.type === 'category') {
      const { category, modules } = match.data;
      botMsg = {
        role: 'bot',
        text: `Here are all **${category.label}** modules (${modules.length}):`,
        links: modules.map(m => ({ label: m.name, path: m.path })),
        suggestions: getRandomSuggestions(msg),
      };
    } else {
      botMsg = {
        role: 'bot',
        text: "I'm not sure about that, but I can help you with:",
        steps: [
          'Navigating to any of the **41 modules**',
          'Explaining **Autopilot**, **Copilot**, and **Manual** modes',
          'Setting up **integrations** and **brand profile**',
          'Finding the right tool for your marketing task',
        ],
        extra: 'Try asking "How do I get started?" or "What is Autopilot?"',
        suggestions: getRandomSuggestions(msg, 4),
      };
    }

    setMessages(prev => [...prev, userMsg, botMsg]);
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setOpen(false);
  };

  // ─── Render helpers ─────────────────────

  const renderMarkdown = (text) => {
    // Simple bold markdown
    return text.split(/(\*\*.*?\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700, color: ink }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderBotMessage = (msg, idx) => (
    <div key={idx} className="flex gap-2.5 animate-fade-in" style={{ animationDuration: '300ms' }}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
        background: `linear-gradient(135deg, ${terra}20, ${sage}20)`,
      }}>
        <svg className="w-3.5 h-3.5" style={{ color: terra }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl rounded-tl-sm px-3.5 py-2.5" style={{ background: bgBotMsg }}>
          <p style={{ fontSize: 13, color: t2, lineHeight: 1.65, fontFamily: dmSans }}>
            {renderMarkdown(msg.text)}
          </p>

          {msg.steps && (
            <ul className="mt-2 space-y-1.5">
              {msg.steps.map((step, si) => (
                <li key={si} className="flex gap-2" style={{ fontSize: 12.5, color: t2, lineHeight: 1.55, fontFamily: dmSans }}>
                  <span style={{ color: terra, fontWeight: 700, flexShrink: 0 }}>{si + 1}.</span>
                  <span>{renderMarkdown(step)}</span>
                </li>
              ))}
            </ul>
          )}

          {msg.extra && (
            <p className="mt-2" style={{ fontSize: 12, color: t3, lineHeight: 1.55, fontFamily: dmSans, fontStyle: 'italic' }}>
              {renderMarkdown(msg.extra)}
            </p>
          )}

          {msg.links && msg.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {msg.links.map((link, li) => (
                <button
                  key={li}
                  onClick={() => handleNavClick(link.path)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all duration-200"
                  style={{
                    background: `${terra}12`,
                    border: `1px solid ${terra}20`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: terra,
                    fontFamily: dmSans,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${terra}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${terra}12`; }}
                >
                  {link.label}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Suggestion chips */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {msg.suggestions.map((s, si) => (
              <button
                key={si}
                onClick={() => handleSend(s)}
                className="px-2.5 py-1 rounded-full transition-all duration-200"
                style={{
                  background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                  border: `1px solid ${brd}`,
                  fontSize: 11,
                  color: t2,
                  fontFamily: dmSans,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderUserMessage = (msg, idx) => (
    <div key={idx} className="flex justify-end animate-fade-in" style={{ animationDuration: '200ms' }}>
      <div className="rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]" style={{ background: bgUserMsg }}>
        <p style={{ fontSize: 13, color: ink, lineHeight: 1.55, fontFamily: dmSans }}>
          {msg.text}
        </p>
      </div>
    </div>
  );

  // ─── Portal ─────────────────────────────

  return createPortal(
    <div ref={panelRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[55]" style={{ fontFamily: dmSans }}>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="absolute bottom-16 right-0 w-[calc(100vw-40px)] sm:w-[360px] rounded-2xl overflow-hidden animate-fade-in flex flex-col"
          style={{
            background: bgPanel,
            border: `1px solid ${brd}`,
            boxShadow: dark
              ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)'
              : '0 20px 60px rgba(44,40,37,0.15), 0 0 0 1px rgba(44,40,37,0.04)',
            maxHeight: 'min(520px, calc(100vh - 120px))',
            animationDuration: '250ms',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${brd}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${terra}, ${sage})`,
              }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink, fontFamily: dmSans }}>Overload Assistant</p>
                <p style={{ fontSize: 10, color: sage, fontWeight: 600 }}>Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(44,40,37,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
            >
              <svg className="w-4 h-4" style={{ color: t3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4" style={{ minHeight: 200 }}>
            {/* Welcome message (always shown) */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                    background: `linear-gradient(135deg, ${terra}20, ${sage}20)`,
                  }}>
                    <svg className="w-3.5 h-3.5" style={{ color: terra }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="rounded-xl rounded-tl-sm px-3.5 py-2.5" style={{ background: bgBotMsg }}>
                      <p style={{ fontSize: 13, color: t2, lineHeight: 1.65, fontFamily: dmSans }}>
                        Hey! I'm the <strong style={{ fontWeight: 700, color: ink }}>Overload Assistant</strong>. I can help you navigate the dashboard, explain features, and find the right tools. What would you like to know?
                      </p>
                    </div>

                    {/* Initial suggestion chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {['How do I get started?', 'What is Autopilot?', 'Show me analytics tools', 'How do integrations work?'].map((s, si) => (
                        <button
                          key={si}
                          onClick={() => handleSend(s)}
                          className="px-2.5 py-1 rounded-full transition-all duration-200"
                          style={{
                            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                            border: `1px solid ${brd}`,
                            fontSize: 11,
                            color: t2,
                            fontFamily: dmSans,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.07)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation */}
            {messages.map((msg, idx) =>
              msg.role === 'bot' ? renderBotMessage(msg, idx) : renderUserMessage(msg, idx)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-3 pb-3 pt-1">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{
              background: bgInput,
              border: `1px solid ${brd}`,
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 13, color: ink, fontFamily: dmSans }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: input.trim() ? `linear-gradient(135deg, ${terra}, ${terra}dd)` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'),
                  opacity: input.trim() ? 1 : 0.4,
                }}
              >
                <svg className="w-3.5 h-3.5" style={{ color: input.trim() ? '#fff' : t3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: open
            ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)')
            : `linear-gradient(135deg, ${terra}, #D4735A)`,
          boxShadow: open
            ? 'none'
            : `0 6px 24px ${terra}40, 0 2px 8px ${terra}30`,
          transform: open ? 'scale(0.9)' : 'scale(1)',
        }}
        onMouseEnter={e => {
          if (!open) e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = open ? 'scale(0.9)' : 'scale(1)';
        }}
      >
        {open ? (
          <svg className="w-5 h-5" style={{ color: t2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>
    </div>,
    document.body
  );
}

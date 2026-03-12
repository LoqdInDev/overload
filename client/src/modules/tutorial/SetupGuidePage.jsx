import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../context/ThemeContext';

// ─── Mode comparison definitions ────────────────────────────────────────────────

const MODE_DEFS = [
  { key: 'manual', label: 'Manual', color: '#64748b' },
  { key: 'copilot', label: 'Copilot', color: '#D4A017' },
  { key: 'autopilot', label: 'Autopilot', color: '#22c55e' },
];

// ─── Chapter Data ───────────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    id: 'account-workspace',
    title: 'Account & Workspace',
    subtitle: 'Your Foundation',
    color: '#C45D3E',
    icon: 'M18 18.72a9.094 9.094 0 003.741-2.958A9 9 0 0012 3a9 9 0 00-9.741 11.762A9.094 9.094 0 006 18.72m12 0a9 9 0 01-12 0m12 0a8.966 8.966 0 00-6-2.292 8.966 8.966 0 00-6 2.292M15 9.75a3 3 0 11-6 0 3 3 0 016 0z',
    intro: 'Everything starts with your account and workspace. This is where you define who you are, set up your team, and understand the three automation modes that power the entire platform.',
    steps: [
      {
        title: 'Create Your Account',
        text: 'Head to the Sign Up page and create your account with email + password or Google sign-in. Use a strong password (8+ characters). Once you\'re in, you\'ll land on the Command Center — your mission control dashboard.',
        path: '/login',
        cta: 'Go to Login',
      },
      {
        title: 'Create & Name Your Workspace',
        text: 'A workspace is an isolated environment for one brand or client. All data — content, campaigns, analytics, integrations — lives inside its workspace. Go to Workspace Settings, click "Create Workspace", and give it a descriptive name (e.g. your brand name). If you manage multiple brands or clients, create a separate workspace for each.',
        path: '/workspace-settings',
        cta: 'Open Workspace Settings',
      },
      {
        title: 'Invite Your Team',
        text: 'Go to the Team page and invite team members by email. Assign roles: Owners have full control, Editors can create and modify content, Viewers have read-only access. You can change roles or remove members at any time.',
        path: '/team',
        cta: 'Open Team',
      },
      {
        title: 'Understand Automation Modes',
        text: 'Every module in Overload can operate in one of three modes. This is the core concept that makes the platform flexible — choose the level of AI autonomy you\'re comfortable with for each module.',
        modes: {
          manual: 'You control everything. AI tools are available on-demand — click "Generate" to get drafts, but nothing happens automatically. Best for getting started and understanding each module.',
          copilot: 'AI proactively generates suggestions and drafts based on your rules. Everything lands in the Approval Queue for your review. Nothing publishes until you approve it. Best balance of speed and control.',
          autopilot: 'AI acts autonomously within the safety limits you configure. Content gets generated, posts get scheduled, campaigns get optimized — all automatically. Monitor results via Activity Log. Best for proven workflows you trust.',
        },
      },
    ],
    tip: 'Pro tip: Start every module in Manual or Copilot mode. Once you\'re comfortable with the AI output quality, upgrade individual modules to Autopilot.',
  },
  {
    id: 'brand-foundation',
    title: 'Brand Foundation',
    subtitle: 'Teach the AI Your Brand',
    color: '#f97316',
    icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
    intro: 'Your Brand Hub is the single source of truth that powers every AI generation across Overload. The more complete your brand profile, the better every piece of content, ad, email, and social post will be — without constant editing.',
    steps: [
      {
        title: 'Fill Your Brand Profile',
        text: 'Open Brand Hub and complete the Profile tab. Fill in your brand name, tagline, industry, and website. Then add your mission, vision, and values. Be specific — "We help small e-commerce brands scale to $1M ARR through data-driven marketing" is far better than "We help businesses grow." The AI uses every word here as context.',
        path: '/brand-hub',
        cta: 'Open Brand Hub',
      },
      {
        title: 'Set Voice & Personality',
        text: 'In Brand Hub, select your voice tone from the available options (Professional, Casual, Friendly, Bold, etc.) and write a voice personality description. This controls how the AI writes for you across all modules. Example: "Confident but approachable. We use data to back up claims but never sound robotic. We speak like a trusted advisor, not a sales pitch."',
        path: '/brand-hub',
        cta: 'Set Voice Tone',
      },
      {
        title: 'Upload Brand Assets',
        text: 'Switch to the Media tab in Brand Hub. Upload your logo, brand imagery, product photos, and any visual assets the AI should reference. Set your primary and secondary brand colors in the Profile tab. These colors and assets are used when generating creative visuals, social graphics, and ad banners.',
        path: '/brand-hub',
        cta: 'Upload Assets',
      },
      {
        title: 'Add Audience & Competitors',
        text: 'Still in Brand Hub, fill in your target audience description, key brand keywords, and competitor names. The AI uses your audience info to match tone and messaging, and competitor data to differentiate your content. Example audience: "Marketing managers at DTC brands, aged 28-45, focused on scaling paid social and email."',
        path: '/brand-hub',
        cta: 'Complete Profile',
      },
    ],
    tip: 'Pro tip: Spend 10-15 minutes making your Brand Hub profile thorough. This one-time investment saves hours of editing on every piece of AI-generated content going forward.',
  },
  {
    id: 'connect-platforms',
    title: 'Connect Your Platforms',
    subtitle: 'Link Your Accounts',
    color: '#6366f1',
    icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757',
    intro: 'Connecting your platforms is what turns Overload from a content tool into a full marketing operating system. Once connected, the AI can pull real data, publish content, track performance, and optimize campaigns across all your channels.',
    steps: [
      {
        title: 'Navigate to Integrations Hub',
        text: 'Open the Integrations Hub from the sidebar. You\'ll see two tabs: "Connected" (your active integrations) and "Available" (all platforms you can connect). Platforms are grouped by category — Ads, Social, E-commerce, Email/SMS, CRM, and more.',
        path: '/integrations',
        cta: 'Open Integrations',
      },
      {
        title: 'Connect Social Media Accounts',
        text: 'Click "Connect" on each social platform you use — Instagram (via Meta), Twitter/X, LinkedIn, TikTok, Pinterest. Most use OAuth: click Connect, authorize in the popup, done. Once connected, you can publish posts, track engagement, and schedule content directly from Overload.',
        path: '/integrations',
        cta: 'Connect Social',
      },
      {
        title: 'Connect Ad Platforms',
        text: 'Connect Google Ads, Meta Ads, Pinterest Ads, or Snapchat Ads. These require OAuth authorization. Once connected, the Ads Manager and Budget Optimizer modules can pull campaign data, suggest optimizations, and (in autopilot mode) adjust bids and budgets automatically.',
        path: '/integrations',
        cta: 'Connect Ads',
      },
      {
        title: 'Connect E-Commerce',
        text: 'If you sell products, connect Shopify, BigCommerce, or Amazon. For Shopify, you\'ll authorize via OAuth. This enables product feed sync, order tracking, inventory forecasting, and revenue-aware campaign optimization in the E-commerce Hub.',
        path: '/integrations',
        cta: 'Connect E-Commerce',
      },
      {
        title: 'Connect Email & CRM',
        text: 'Connect Mailchimp, Klaviyo, or HubSpot to sync contacts, send campaigns from the Email & SMS module, and track CRM data. Most require an API key — click "Connect", enter your key, and test the connection.',
        path: '/integrations',
        cta: 'Connect Email/CRM',
      },
      {
        title: 'Finding API Keys & Credentials',
        text: 'For platforms that need API keys (not OAuth): go to that platform\'s developer settings, generate an API key or access token, and paste it into Overload. Each platform card in Integrations has a help link showing you exactly where to find your credentials. All keys are encrypted with AES-256 before storage.',
      },
    ],
    tip: 'Pro tip: Connect your revenue sources first (Shopify/Stripe + ad platforms). This lets the AI calculate true ROAS from day one, making budget optimization and campaign suggestions much more accurate.',
  },
  {
    id: 'content-creative',
    title: 'Content & Creative',
    subtitle: 'Create Marketing Assets',
    color: '#06b6d4',
    icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
    intro: 'Now that your brand is set up and platforms are connected, it\'s time to start creating. Overload has five content modules — each works in all three automation modes.',
    steps: [
      {
        title: 'AI Content Creator',
        text: 'Generate blog posts, ad copy, product descriptions, landing page text, and more. Choose a content type, describe what you want in plain English, and hit Generate. The AI uses your Brand Hub profile to match your voice. Use the AI Tools tab for pre-built templates like "Blog Post Generator" or "Product Description Writer."',
        path: '/content',
        cta: 'Open Content Creator',
        modes: {
          manual: 'Click Generate to create content on-demand. Edit the output, then save or export when ready.',
          copilot: 'AI suggests content ideas based on your calendar, trends, and past performance. Drafts appear in Approval Queue for your review.',
          autopilot: 'AI generates and publishes content on a schedule you define in Automation Rules. Blog posts go live, descriptions get updated — all hands-free.',
        },
      },
      {
        title: 'Creative & Design Studio',
        text: 'Generate social media graphics, ad banners, carousel images, and visual content. Use the guided prompt builder with chips for style, mood, and composition, or type your own prompt. Export in platform-specific sizes. The AI uses your brand colors and assets from Brand Hub.',
        path: '/creative',
        cta: 'Open Creative Studio',
        modes: {
          manual: 'Design visuals on-demand. Use the prompt builder or type freely. Download and use wherever you need.',
          copilot: 'AI suggests visual concepts for upcoming campaigns and posts. Concepts land in your queue for approval before use.',
          autopilot: 'AI automatically generates visuals for scheduled social posts and campaigns, matching your brand guidelines.',
        },
      },
      {
        title: 'Video Marketing',
        text: 'Create UGC-style marketing videos in the Studio tab. Upload a product image, choose a video archetype (testimonial, unboxing, tutorial, etc.), customize scenes with visual prompts and voiceover scripts, then generate. Each scene becomes a video clip with AI-generated visuals and optional lip-sync.',
        path: '/video-marketing',
        cta: 'Open Video Studio',
        modes: {
          manual: 'Build videos scene-by-scene with full creative control. Edit every visual prompt and VO line before generating.',
          copilot: 'AI suggests video concepts and scripts based on your products and brand. You review and edit scenes before generation.',
          autopilot: 'AI creates and renders videos on schedule for your content calendar. Great for consistent social video content.',
        },
      },
      {
        title: 'Email & SMS Campaigns',
        text: 'Draft email and SMS campaigns with AI-generated subject lines, body copy, and CTAs. If you\'ve connected Mailchimp or Klaviyo, you can send directly from Overload. Set up drip sequences, promotional blasts, or automated follow-ups.',
        path: '/email-sms',
        cta: 'Open Email & SMS',
        modes: {
          manual: 'Write campaigns manually with AI assist — click Generate for subject lines, body copy, or complete email drafts.',
          copilot: 'AI drafts campaigns based on triggers (abandoned cart, new subscriber, etc.). Review in Approval Queue before sending.',
          autopilot: 'AI sends campaigns automatically based on rules — welcome sequences, promotional emails, re-engagement flows.',
        },
      },
      {
        title: 'Social Media Management',
        text: 'Manage all your social accounts in one place. Create posts with AI-generated captions and hashtags, schedule them across platforms, and track engagement. Connect your accounts in Integrations first, then use the Social Media module to draft, schedule, and publish.',
        path: '/social',
        cta: 'Open Social Media',
        modes: {
          manual: 'Create and schedule posts manually. Use AI to generate captions and hashtags, but you choose when and where to publish.',
          copilot: 'AI suggests daily posts based on your content calendar and trending topics. Approve or edit each post before it goes live.',
          autopilot: 'AI generates and schedules posts across all connected platforms. Posts follow your brand voice and optimal posting times.',
        },
      },
    ],
    tip: 'Pro tip: Start with the Content Creator to test AI output quality. If the tone matches your brand, you can confidently enable Copilot or Autopilot on other content modules.',
  },
  {
    id: 'advertising-growth',
    title: 'Advertising & Growth',
    subtitle: 'Scale Your Reach',
    color: '#10b981',
    icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
    intro: 'With content flowing, it\'s time to amplify it. Overload\'s advertising modules manage campaigns across all major ad platforms, optimize budgets, run experiments, and find influencers — with the same Manual/Copilot/Autopilot flexibility.',
    steps: [
      {
        title: 'Paid Advertising',
        text: 'Create and manage ad campaigns across Google, Meta, TikTok, Pinterest, and Snapchat — all from one interface. Set up campaign objectives, targeting, budgets, and creative assets. The AI can generate ad copy and suggest audience segments based on your brand profile and CRM data.',
        path: '/ads',
        cta: 'Open Ads Manager',
        modes: {
          manual: 'Build campaigns manually with AI-assisted copywriting. You set every parameter and launch when ready.',
          copilot: 'AI suggests new campaigns, audience adjustments, and creative variations. Review each suggestion before applying.',
          autopilot: 'AI creates campaigns, adjusts bids, rotates creative, and reallocates budget to top performers automatically.',
        },
      },
      {
        title: 'Funnel Builder',
        text: 'Build landing pages and conversion funnels. Choose from templates or start from scratch. The AI generates headlines, copy, and CTAs optimized for conversion. Connect funnels to your ad campaigns for end-to-end tracking from click to conversion.',
        path: '/funnels',
        cta: 'Open Funnel Builder',
        modes: {
          manual: 'Design funnels step by step. Use AI to generate page copy, but you control the layout and flow.',
          copilot: 'AI suggests funnel improvements — headline tests, CTA changes, layout optimizations. Apply suggestions after review.',
          autopilot: 'AI continuously optimizes funnel elements based on conversion data. Headlines, CTAs, and layouts evolve automatically.',
        },
      },
      {
        title: 'A/B Testing',
        text: 'Run split tests on anything — email subject lines, ad creative, landing page headlines, social post formats. Set up variants, define success metrics, and let the test run. The AI will declare a winner with statistical significance and recommend next steps.',
        path: '/ab-testing',
        cta: 'Open A/B Testing',
      },
      {
        title: 'Budget Optimizer',
        text: 'Set your total marketing budget and let the AI recommend allocation across channels based on historical performance and ROAS. Connect your ad platforms first for real data. Set guardrails like minimum/maximum spend per channel.',
        path: '/budget-optimizer',
        cta: 'Open Budget Optimizer',
        modes: {
          manual: 'View AI budget recommendations and apply them manually to each platform.',
          copilot: 'AI suggests budget shifts weekly based on performance. Review and approve each reallocation.',
          autopilot: 'AI automatically reallocates budget across channels to maximize ROAS within your safety limits.',
        },
      },
      {
        title: 'Influencer & Affiliate Setup',
        text: 'Use the Influencer Finder to search for creators by niche, audience size, and engagement rate. The Affiliate Manager tracks referral partnerships, commissions, and link performance. Both modules help you scale word-of-mouth and partnership-driven growth.',
        path: '/influencers',
        cta: 'Open Influencer Finder',
      },
    ],
    tip: 'Pro tip: Connect your ad platforms and let the Budget Optimizer run in Copilot mode for 2 weeks. Review its suggestions to build confidence, then switch to Autopilot for continuous optimization.',
  },
  {
    id: 'analytics-optimization',
    title: 'Analytics & Optimization',
    subtitle: 'Measure & Improve',
    color: '#f43f5e',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    intro: 'Data drives decisions. Overload\'s analytics modules pull data from all your connected platforms into unified dashboards, track SEO performance, monitor competitors, manage customer relationships, and generate reports — so you always know what\'s working.',
    steps: [
      {
        title: 'Analytics Dashboard',
        text: 'The Analytics module shows unified performance metrics across all connected platforms — traffic, conversions, revenue, engagement, and more. Customize your dashboard with the widgets that matter most. Data refreshes automatically from connected integrations.',
        path: '/analytics',
        cta: 'Open Analytics',
        modes: {
          manual: 'View dashboards and pull reports manually. Export data when needed.',
          copilot: 'AI highlights anomalies, trends, and opportunities in your data. Get proactive alerts about performance changes.',
          autopilot: 'AI generates daily/weekly performance summaries and automatically flags issues requiring attention.',
        },
      },
      {
        title: 'SEO Suite',
        text: 'Run site audits, track keyword rankings, analyze backlinks, and get on-page optimization suggestions. Connect Google Search Console for real ranking data. The AI generates meta descriptions, title tags, and content briefs optimized for your target keywords.',
        path: '/seo',
        cta: 'Open SEO Suite',
        modes: {
          manual: 'Run audits and keyword research on-demand. Implement suggestions yourself.',
          copilot: 'AI monitors rankings and suggests optimizations weekly. Review and apply each recommendation.',
          autopilot: 'AI automatically updates meta tags, generates SEO-optimized content briefs, and monitors rankings continuously.',
        },
      },
      {
        title: 'Competitor Intel',
        text: 'Add your competitors to track their online presence, content strategy, and advertising activity. The AI analyzes their positioning, identifies gaps you can exploit, and suggests differentiation strategies. Add competitors by name or domain in the Competitor Intel module.',
        path: '/competitors',
        cta: 'Open Competitor Intel',
      },
      {
        title: 'CRM & Customer Data',
        text: 'Import your contacts into the CRM module. Track leads through your pipeline, segment audiences, and sync with connected platforms (HubSpot, Mailchimp). The Audience Builder creates targeted segments based on behavior, demographics, and purchase history for use across campaigns.',
        path: '/crm',
        cta: 'Open CRM',
      },
      {
        title: 'Reviews & Reputation',
        text: 'Monitor reviews across platforms and respond quickly. The AI can draft professional responses to both positive and negative reviews, maintaining your brand voice. Track overall sentiment trends over time.',
        path: '/reviews',
        cta: 'Open Reviews',
        modes: {
          manual: 'Read reviews and write responses manually. Use AI to draft response suggestions when needed.',
          copilot: 'AI drafts responses to new reviews automatically. Review and personalize each response before posting.',
          autopilot: 'AI responds to reviews automatically within your brand guidelines. Flags negative reviews for human review.',
        },
      },
      {
        title: 'Reports',
        text: 'Generate comprehensive marketing reports combining data from all connected platforms. Choose report templates (weekly summary, campaign performance, SEO audit, etc.) or create custom reports. Schedule recurring reports for automated delivery.',
        path: '/reports',
        cta: 'Open Reports',
      },
    ],
    tip: 'Pro tip: Set up Competitor Intel early — even before running campaigns. Understanding what competitors are doing helps the AI generate more differentiated content and ad strategies.',
  },
  {
    id: 'automation-config',
    title: 'Automation Configuration',
    subtitle: 'Set the Rules',
    color: '#8b5cf6',
    icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z',
    icon2: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    intro: 'This is where you unlock the full power of Overload. Configure global safety limits, set per-module automation modes, create rules that trigger AI actions, and build multi-step workflows. This chapter is the difference between a tool and an autonomous marketing engine.',
    steps: [
      {
        title: 'Configure Global Safety Limits',
        text: 'Open Automation Settings. Set your guardrails: maximum actions per hour (default 10), maximum per day (default 50), monthly budget limit, and confidence threshold (default 70%). These limits apply across ALL modules in autopilot mode. You can also set your risk level — Conservative (most actions need approval), Balanced (high-impact actions need approval), or Aggressive (minimal approvals).',
        path: '/automation-settings',
        cta: 'Open Automation Settings',
      },
      {
        title: 'Set Per-Module Automation Modes',
        text: 'Each of the 36 modules can run in its own mode independently. Go to Automation Settings and set each module to Manual, Copilot, or Autopilot. Start conservative — set content modules to Copilot and everything else to Manual. Upgrade to Autopilot only after you trust the output quality.',
        path: '/automation-settings',
        cta: 'Set Module Modes',
        modes: {
          manual: 'Module does nothing automatically. All AI features are on-demand only.',
          copilot: 'Module generates suggestions that land in the Approval Queue. Nothing executes until you approve.',
          autopilot: 'Module acts autonomously within safety limits. Actions are logged in the Activity Log for monitoring.',
        },
      },
      {
        title: 'Create Automation Rules',
        text: 'Rules are the triggers that make automation work. Open Automation Rules and create your first rule. Each rule has a trigger (schedule, event, or threshold), a target module, and an action (generate content, schedule post, send campaign, adjust budget, etc.). Example: "Every Monday at 9am, generate 5 social posts for the week."',
        path: '/automation-rules',
        cta: 'Create Rules',
      },
      {
        title: 'The Approval Queue',
        text: 'When modules are in Copilot mode, all AI-generated suggestions land in the Approval Queue. Open it from the sidebar (look for the badge count). Review each suggestion — approve, edit & approve, or reject. Approved items execute immediately. This is your safety net between AI generation and real-world action.',
        path: '/approvals',
        cta: 'Open Approvals',
      },
      {
        title: 'Workflow Builder',
        text: 'For complex multi-step automations, use the Workflow Builder. Chain actions together: "Generate blog post → Create social graphics → Schedule across platforms → Send email newsletter." Workflows can mix modules and include conditional logic. Great for repeatable campaign launches.',
        path: '/workflow-builder',
        cta: 'Open Workflow Builder',
      },
      {
        title: 'The Advisor',
        text: 'The Advisor is your AI strategy consultant. It analyzes your entire workspace — content performance, campaign results, audience data, competitor intel — and provides strategic recommendations. Ask it anything: "What should I focus on this week?" or "How can I improve my email open rates?" It has full context of your brand and data.',
        path: '/the-advisor',
        cta: 'Open The Advisor',
      },
    ],
    tip: 'Pro tip: Start with 2-3 simple rules in Copilot mode (e.g., "Generate 3 social posts every Monday"). Review the output for a week. If quality is consistently good, flip those rules to Autopilot.',
  },
  {
    id: 'go-live',
    title: 'Go Live Checklist',
    subtitle: 'Launch With Confidence',
    color: '#5E8E6E',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z',
    intro: 'You\'ve set up your workspace, brand, integrations, content tools, and automation. Here\'s your final checklist to make sure everything is ready before you go live.',
    steps: [
      {
        title: 'Verify All Integrations',
        text: 'Go to Integrations Hub and check that all your connected platforms show a green "Connected" status. Click "Test Connection" on each one to verify they\'re working. If any show errors, reconnect them. Pay special attention to your primary revenue source (Shopify/Stripe) and main ad platform.',
        path: '/integrations',
        cta: 'Check Integrations',
      },
      {
        title: 'Confirm Brand Profile Is Complete',
        text: 'Open Brand Hub and make sure all fields are filled: brand name, tagline, industry, website, voice tone, voice personality, target audience, keywords, and competitors. Upload at least your logo and set brand colors. An incomplete profile means lower-quality AI output across every module.',
        path: '/brand-hub',
        cta: 'Review Brand Hub',
      },
      {
        title: 'Test AI Content Generation',
        text: 'Open the Content Creator and generate one piece of content — a blog intro, a social caption, or an ad headline. Read the output. Does it sound like your brand? If not, go back to Brand Hub and refine your voice description and brand keywords until the AI nails your tone.',
        path: '/content',
        cta: 'Test Content',
      },
      {
        title: 'Test a Social Post Draft',
        text: 'Go to Social Media, create a post with AI-generated copy, and schedule it as a draft (don\'t publish yet). Preview it. Check formatting, hashtags, and tone. If everything looks good, you know the pipeline works end-to-end from AI generation through to platform publishing.',
        path: '/social',
        cta: 'Create Test Post',
      },
      {
        title: 'Set Final Automation Modes',
        text: 'Go to Automation Settings and review each module\'s mode. Our recommendation for starting out: Set your top 3-5 most-used modules to Copilot mode and everything else to Manual. This gives you AI assistance where you need it most while keeping full control everywhere else.',
        path: '/automation-settings',
        cta: 'Review Modes',
      },
      {
        title: 'Enable Your First Autopilot Module',
        text: 'Once you\'re confident in the AI output quality, pick ONE module to set to Autopilot — we suggest starting with Content Creator or Social Media. Create a simple automation rule (e.g., "Generate 1 social post daily"). Monitor the Activity Log for the first few days. If results are good, expand from there.',
        path: '/automation-settings',
        cta: 'Enable Autopilot',
      },
    ],
    tip: 'Pro tip: Don\'t rush to Autopilot on everything. The best approach is progressive trust — start manual, move to copilot, and only autopilot modules where you\'ve validated the AI output quality. You can always change modes instantly.',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function SetupGuidePage() {
  usePageTitle('Setup Guide');
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [activeChapter, setActiveChapter] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeChapter]);

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
              background: `linear-gradient(135deg, #10b98120, #5E8E6E20)`,
            }}>
              <svg className="w-5 h-5" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-6.463 0 2.232 2.232 0 01-2.318.536 24.19 24.19 0 00-.017.042c-.127.297-.2.613-.2.94a3.003 3.003 0 003 3c.327 0 .643-.073.94-.2l.042-.017a2.232 2.232 0 01.536-2.318 4.494 4.494 0 00-6.463z" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontFamily: fraunces, fontStyle: 'italic', fontSize: 24, fontWeight: 400, color: ink, letterSpacing: '-0.02em' }}>
                Setup Guide
              </h1>
              <p style={{ fontSize: 12, color: t3, fontFamily: dmSans }}>
                Set up Overload from A to Z
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

            {/* Setup path hint */}
            <div className="mt-4 px-3 py-3 rounded-xl" style={{ background: dark ? 'rgba(94,142,110,0.08)' : 'rgba(94,142,110,0.06)', border: `1px solid ${dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)'}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#5E8E6E', fontFamily: dmSans, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Setup Path
              </p>
              <p style={{ fontSize: 11, color: t2, lineHeight: 1.5, fontFamily: dmSans }}>
                Account → Brand Hub → Integrations → Content → Automation → Go Live
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
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.04]" style={{ background: chapter.color }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-[0.03]" style={{ background: chapter.color }} />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span style={{ fontSize: 10, fontWeight: 700, color: chapter.color, fontFamily: dmSans, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Step {activeChapter + 1} of {CHAPTERS.length}
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
                        <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, fontFamily: dmSans, marginBottom: (step.path || step.modes) ? 14 : 0 }}>
                          {step.text}
                        </p>

                        {/* Mode comparison cards */}
                        {step.modes && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                            {MODE_DEFS.map(mode => (
                              <div key={mode.key} className="rounded-xl p-3" style={{
                                background: dark ? `${mode.color}10` : `${mode.color}08`,
                                border: `1px solid ${dark ? `${mode.color}20` : `${mode.color}18`}`,
                              }}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ background: mode.color }} />
                                  <span style={{ fontSize: 11, fontWeight: 700, color: mode.color, fontFamily: dmSans, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mode.label}</span>
                                </div>
                                <p style={{ fontSize: 11.5, color: t2, lineHeight: 1.5, fontFamily: dmSans }}>
                                  {step.modes[mode.key]}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

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
                    <span className="truncate">You're All Set!</span>
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

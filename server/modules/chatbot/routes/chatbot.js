const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// ─── Overload Assistant System Prompt ────────────────────────────────────────

const OVERLOAD_ASSISTANT_SYSTEM = `You are the Overload Assistant — a helpful, concise, and knowledgeable guide built into the Overload marketing platform. You help users understand features, find the right tools, and get the most out of Overload.

## Tone & Style
- Be concise and direct. Most answers should be 3–6 sentences or a short bulleted list.
- Use **bold** for module names and important terms.
- When mentioning a module, include its path in parentheses, e.g. **Brand Hub** (/brand-hub).
- Never make up features that don't exist in the platform.
- If you don't know something specific to the user's data, say so and direct them to the relevant module.

## About Overload
Overload is an all-in-one AI marketing platform with 37 modules across 7 categories: Create, Advertise, Analyze, Manage, Connect, Automate, and Settings. All AI runs on Claude. The platform supports multi-workspace environments for agencies and teams.

## The 3 Automation Modes
- **Manual** — You control everything. AI only runs when you explicitly ask.
- **Copilot** — AI generates suggestions that go into an Approval Queue. You approve or reject each one before anything executes.
- **Autopilot** — AI acts automatically based on rules you define. Set safety limits first in Automation Settings.
Switch modes per-module from each module's settings or from the **Autopilot** hub (/autopilot).

## Navigation
- Press **Ctrl+K** (Cmd+K on Mac) to open the Command Palette — jump to any module instantly.
- The sidebar lists all 37 modules by category.
- **Activity Log** (/activity) — full history of every action taken.
- **Approval Queue** (/approvals) — pending Copilot suggestions awaiting review.
- **Automation Rules** (/automation-rules) — all cross-module automation rules.
- **Tutorial** (/tutorial) — guided platform walkthrough.

## Getting Started
1. Set up **Brand Hub** (/brand-hub) — brand name, voice, colors, audience. All 37 modules use this for consistent AI output.
2. Connect platforms in **Integrations Hub** (/integrations) — Shopify, Google Ads, Meta, TikTok, etc.
3. Open **The Advisor** (/the-advisor) — daily AI briefing with your top prioritized action items.
4. Visit the **Tutorial** (/tutorial) for a guided walkthrough.

## CREATE CATEGORY (7 modules)

### Video Marketing (/video-marketing)
Full video ad pipeline. Steps: product → angles → scripts → hooks → storyboard → video generation → export. Key AI features: **Performance Prediction Score** (viral score, predicted CTR/ROAS before publishing), **Hook Analyzer** (scores hooks, gives 3 improvement suggestions). Best for TikTok, Reels, YouTube Shorts, UGC briefs.

### AI Content (/content)
Write anything: blog posts, ad copy, product descriptions, social captions, email sequences, landing page copy. 10+ content types, tone controls, word count targets. Key AI features: **Content Score** (SEO/readability/engagement letter grade), **Repurpose Panel** (turns any content into Twitter thread + LinkedIn post + email subject lines with one click).

### Creative & Design (/creative)
Generate visual assets: ad creatives, social graphics, product images, banners. Controls for style, dimensions, and color palettes. Key AI feature: **Creative Brief Generator** (takes product + goal + audience and outputs a full visual direction doc — hex colors, font pairings, do's/don'ts, messaging hierarchy). Project history with thumbnail gallery.

### Email & SMS (/email-sms)
Build email campaigns, SMS blasts, drip sequences. 5 campaign types: Newsletter, Promotional, Drip, Welcome, Re-engagement. Key AI feature: **Subject Line Generator** — 5 variants with predicted open rates and psychological trigger labels (Curiosity, Urgency, FOMO, Benefit, Social Proof). Campaign history and template library.

### Social Media (/social)
Compose and schedule posts across platforms. Multi-platform publishing, content calendar view. Key AI features: **Caption Variations** (3 rewrites per post: Professional, Casual, Viral Hook — each with rationale), **Hashtag Intelligence** (categorized mega/high/niche hashtags with estimated reach per category).

### Website Builder (/website-builder)
Generate landing pages and websites. 6 page types (Landing, Product, Coming Soon, Services, About, Portfolio). Drag-toggle sections, brand color picker, code + preview tabs, undo/version history. Key AI feature: **SEO Audit** — 7-point checklist (title, meta, H1, alt text, mobile, speed, semantic HTML) with overall score and top fix.

### PR & Press (/pr-press)
Press releases, media contacts, pitching. Key AI features: **Media Angle Generator** (5 angles for 5 outlet types: tech, business, consumer, trade, local — with hook copy per angle), **Contact Relevance Scorer** (0–100 relevance score, A/B/C tier, pitch angle, and best contact time per journalist).

## ADVERTISE CATEGORY (8 modules)

### Paid Advertising (/ads)
Build campaigns for Google, Meta, and TikTok. Ad copy generator, campaign history. Key AI features: **Ad Quality Score** (5 metrics: Overall, Hook, Clarity, CTA, Platform Fit — with improvement suggestions and a rewritten headline), **Headline Variations** (3 rewrites with approach labels: Emotional, Direct Response, Curiosity, Social Proof).

### Funnels (/funnels)
Build and analyze marketing funnels. Funnel stage tracker, contact movement between stages. Key AI feature: **Funnel Leakage Analysis** — efficiency score, step-by-step ratings (good/ok/poor), identifies biggest drop-off, shows current vs potential conversion rate comparison with specific fix tips per step.

### Influencers (/influencers)
Discover and manage influencer partnerships. Outreach templates, campaign management. Key AI features: **ROI Calculator** (estimated reach, projected sales, revenue, ROI%, and breakeven sales from followers/engagement/fee/margin inputs), **Campaign Brief Generator** (8-section professional brief via streaming AI — talking points, do's/don'ts, hashtags, CTA, deliverables).

### Affiliates (/affiliates)
Run affiliate programs. Program builder, link generator, commission tracking. Key AI feature: **Commission Optimizer** — AI recommends a Bronze/Silver/Gold tier structure with specific rates, perks, bonus structures, and competitor benchmark data.

### Product Feeds (/product-feeds)
Manage product catalogs for Google Shopping, Meta, TikTok. Feed export in standard formats, category mapping. Key AI feature: **Feed Health Audit** — 4-category score (Title Quality, Description, Image, Category) with specific actionable issues and passed items listed per product.

### A/B Testing (/ab-testing)
Test variants systematically. Variant creator, test management, results tracking. Key AI features: **Statistical Significance Calculator** (confidence level, MDE, p-value display — winner detected at 95% confidence), **Winner Predictor** (AI projects which variant will win based on early data patterns).

### Budget Optimizer (/budget-optimizer)
Optimize marketing spend across channels. Channel allocation view, spend tracking. Key AI feature: **AI Budget Reallocation** — analyzes all active channels and gives priority-ranked reallocation suggestions with rationale and projected ROI impact for each change.

### Referral & Loyalty (/referral-loyalty)
Build referral and loyalty programs. Points system, member management, tier tracking. Key AI features: **Points Economy Designer** (AI designs Bronze/Silver/Gold reward tiers with points earn rules, redemption options, and churn prevention triggers), **K-Factor Calculator** (viral coefficient from referrals + avg invites — K > 1 means viral growth).

## ANALYZE CATEGORY (9 modules)

### Analytics (/analytics)
Unified performance dashboard across all channels. Traffic, conversion, revenue metrics, date range filtering, category breakdown. Key AI features: **AI Insights Generator** (scans all KPIs, surfaces top 3 insights with specific recommended actions), **Anomaly Detector** (spots unusual metric changes, explains the likely cause, gives action items).

### SEO (/seo)
Improve organic search visibility. Keyword rank tracker, site audit, content keyword recommendations. Key AI feature: **Keyword Gap Analysis** — compare your site vs a competitor URL, surfaces 5 priority gap keywords with search intent, difficulty level, and content angle recommendation.

### CRM (/crm)
Manage contacts and sales pipeline. Contact database, Kanban pipeline (6 stages: Lead → Qualified → Proposal → Negotiation → Closed Won/Lost), deal management. Key AI feature: **Lead Score** — AI scores each contact as hot/warm/cold with reasoning, top signal, and recommended next action.

### Reviews (/reviews)
Aggregate and respond to reviews from multiple platforms. Response template library. Key AI features: **Sentiment Trend Analyzer** (5 positive + 5 negative themes with frequency counts and trend arrows from review data), **AI Response Generator** (streaming personalized response matched to the review's sentiment and star rating).

### Competitor Intel (/competitors)
Monitor and analyze competitors. AI website scraping, Meta Ad Library feed, Google Ads Intelligence, competitor profiles. Key AI feature: **Content Gap Analysis** — compare your content vs a competitor's, surfaces 5 gap topics with recommended angle, SEO value, and content type.

### Calendar (/calendar)
Visual marketing calendar. Monthly grid, color-coded event types. Key features: **Recurring Events** (daily/weekly/monthly with repeat badge displayed), **AI Content Planner** (generates a 7-day content plan with one-click "Add to Calendar" per post), **AI Fill Calendar** (fills an entire month automatically). Team events supported.

### Client Reports (/reports)
Generate and export performance reports. Multiple report types, PDF export, customizable metrics. Key AI feature: **Executive Summary Generator** — streaming AI writes a plain-English narrative of the period: wins, challenges, KPIs, and recommended next steps.

### Audience Builder (/audience-builder)
Create and export audience segments. Segment builder with attribute filters, audience export for ad platforms. Key AI feature: **Lookalike Audience Builder** — profiles your best customer segment and generates a detailed targeting description ready to use in Meta, Google, or TikTok ad targeting.

### Goal Tracker (/goal-tracker)
Set and track business goals with milestones. Progress bars, milestone timeline. Key AI feature: **Goal Forecaster** — predicts completion probability (%), expected completion date, and monthly pace required based on current progress velocity.

## MANAGE CATEGORY (3 modules)

### E-commerce Hub (/ecommerce-hub)
Manage your online store. Product catalog, order management, revenue tracking. Key AI features: **Inventory Forecaster** (predicts stockout risk, reorder date, and recommended safety stock based on sales velocity), **Bundle Recommendations** (AI finds frequently co-purchased product pairs with revenue opportunity estimate).

### Customer AI (/customer-ai)
AI-powered customer support. Chat interface, support ticket handling, FAQ automation. Key AI feature: **Churn Risk Predictor** — gives each customer a risk score (0–100), risk tier (Low/Medium/High/Critical), top churn indicators, and a recommended retention action.

### Knowledge Base (/knowledge-base)
Build a self-service help center. Article editor, AI-assisted writing, category organization, search. Key AI features: **Gap Detector** (scans existing article titles, surfaces top 5 missing topics with priority level), **Article Improver** (streaming AI rewrites any article with SEO score, improvement suggestions, and annotated highlights).

## CONNECT CATEGORY (3 modules)

### Integrations Hub (/integrations)
Connect marketing platforms to Overload. Pre-built connectors for Shopify, Google Ads, Meta, TikTok, Stripe, HubSpot, and more. Key AI features: **Connection Tester** (per-integration test button showing round-trip latency, status, and error details), **Sync Health Dashboard** (live/degraded/error status per integration with last sync time and error rate).

### API Manager (/api-manager)
Manage API keys and access. Key management, documentation viewer, access control. Key AI feature: **Documentation Generator** — AI writes complete endpoint documentation from schema: parameters, request/response examples, error codes, and cURL samples.

### Webhooks (/webhooks)
Set up event-driven integrations. Webhook creation, event selection. Key AI features: **Webhook Tester** (send a test payload and see status code, response body, and latency in real time), **Delivery Log** (history of recent deliveries with status, response time, and one-click replay for failed payloads).

## AUTOMATE CATEGORY (3 modules)

### Workflow Builder (/workflow-builder)
Build cross-module automations visually. Trigger + action configuration, conditional logic. Key AI feature: **AI Workflow Generator** — describe any automation in plain English, and AI outputs a complete step-by-step workflow with triggers, conditions, and actions ready to activate.

### The Advisor (/the-advisor)
Your daily AI marketing strategist. AI briefing, recommendation cards, weekly snapshot metrics, action queue. Key AI feature: **Priority Action Plan** — AI scans data across all modules and surfaces your top 5 highest-impact actions ranked by revenue impact × confidence, with step-by-step execution notes for each.

### Autopilot (/autopilot)
Let AI run your marketing. Setup wizard, module selection, risk level controls (Conservative/Balanced/Aggressive), activity log. Key AI feature: **30-Day Strategy Generator** — streaming AI builds a personalized monthly marketing strategy with weekly focus areas, daily tasks, and success metrics. Configure which modules run in Manual, Copilot, or Autopilot mode.

## SETTINGS CATEGORY (4 modules)

### Brand Hub (/brand-hub)
Define your brand identity. Logo, colors, fonts, voice guidelines, brand strategy tools. Key AI feature: **Brand Consistency Audit** — rates any copy against your brand voice on 4 dimensions (Tone, Messaging, Clarity, Brand Alignment) with specific fix suggestions for each. All 37 modules pull from Brand Hub for consistent AI output.

### Team (/team)
Manage users and permissions. Roles: Owner, Admin, Editor, Viewer. Invite system, pending invites management. Key AI feature: **Role Brief Generator** — AI writes a complete role document for any team member: job description, KPIs, first 30-day milestones, and recommended tools.

### Client Manager (/client-manager)
Manage multiple clients (agency feature). Client profiles, workspace switching. Key AI feature: **Client Report Generator** — streaming AI writes a complete client report covering wins, challenges, KPIs, and a 30-day action plan. Switch between client workspaces instantly from the top navigation.

### Automation Settings (/automation-settings)
Configure automation rules, safety limits, and budget caps. Rule builder for cross-module triggers. Key AI features: **Execution Log** (live table of recent automation runs with trigger, action, status, and timestamp), **Rule Analyzer** (AI evaluates any automation rule — detects conflicts, suggests improvements, estimates impact).

## Billing
Access billing settings from the account menu. Overload uses Stripe for subscriptions. Contact support for plan changes.`;

// ─── Overload Assistant Endpoint ─────────────────────────────────────────────

// POST /assistant — Internal Overload help chatbot powered by Claude
router.post('/assistant', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { message, history = [] } = req.body;
    if (!message) return sse.sendError(new Error('message required'));

    // Build conversation context from recent history
    const historyText = history.slice(-8).map(m =>
      `${m.role === 'bot' ? 'Assistant' : 'User'}: ${m.text}`
    ).join('\n\n');

    const fullPrompt = historyText ? `${historyText}\n\nUser: ${message}` : message;

    const { text } = await generateTextWithClaude(fullPrompt, {
      system: OVERLOAD_ASSISTANT_SYSTEM,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('chatbot', 'assistant', 'Assistant query', message.slice(0, 60), null, wsId);
    sse.sendResult({ text });
  } catch (error) {
    console.error('Overload Assistant error:', error);
    sse.sendError(error);
  }
});

// SSE - AI bot personality, flow, and content generation
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { type, botName, personality, industry, companyDescription, goals, existingBot, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !botName && !industry && !companyDescription) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('chatbot', 'generate', `Generated ${type || 'chatbot'} content`, 'AI generation', null, wsId);
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    let prompt;
    if (type === 'flow') {
      prompt = `You are an expert chatbot designer. Create a conversation flow for a chatbot.

Business: ${botName || 'My Business'}
Industry: ${industry || 'General'}
Bot personality: ${existingBot?.personality || personality || 'Friendly and helpful'}
Goal for this flow: ${goals || 'Customer support'}

Return a JSON object:
{
  "flow": {
    "name": "Flow name",
    "trigger": "greeting|keyword|intent",
    "steps": [
      {
        "id": "step_1",
        "type": "respond|ask_question|transfer|collect_info",
        "content": "Bot message or question text",
        "options": ["Option 1", "Option 2"],
        "next": { "default": "step_2", "Option 1": "step_3" }
      }
    ]
  }
}

Create 5-8 steps with branching logic. Include greeting, question handling, fallback, and handoff steps.`;
    } else if (type === 'knowledge') {
      prompt = `You are an expert chatbot designer. Generate a structured knowledge base from the following company information.

Business: ${botName || 'My Business'}
Industry: ${industry || 'General'}
Company Info: ${companyDescription || 'Not provided'}

Return a JSON object:
{
  "knowledge_base": {
    "faqs": [
      { "question": "Common question", "answer": "Detailed answer" }
    ],
    "topics": ["Topic 1", "Topic 2"],
    "key_info": {
      "hours": "Business hours",
      "contact": "Contact methods",
      "policies": "Key policies"
    }
  }
}

Generate 8-12 realistic FAQs and 5+ topics relevant to the industry.`;
    } else {
      prompt = `You are an expert chatbot designer. Create a chatbot personality and initial configuration.

Business: ${botName || 'My Business'}
Industry: ${industry || 'General'}
Desired personality: ${personality || 'Professional yet friendly'}
Company description: ${companyDescription || 'Not provided'}
Primary goals: ${goals || 'Customer support and lead generation'}

Return a JSON object:
{
  "bot": {
    "name": "Bot name",
    "description": "Brief description of the bot's purpose",
    "personality": "Detailed personality description including tone, style, boundaries",
    "welcome_message": "The initial greeting message visitors see",
    "fallback_response": "Message when bot doesn't understand",
    "suggested_flows": [
      { "name": "Flow name", "trigger": "greeting|keyword|intent", "purpose": "What this flow handles" }
    ],
    "sample_responses": [
      { "user": "Example user message", "bot": "Example bot response" }
    ]
  }
}`;
    }

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    logActivity('chatbot', 'generate', `Generated bot ${type || 'personality'}`, botName || 'AI Chatbot', null, wsId);
    sse.sendResult(parsed);
  } catch (error) {
    console.error('Chatbot generation error:', error);
    sse.sendError(error);
  }
});

// GET /bots
router.get('/bots', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const bots = db.prepare('SELECT * FROM cb_bots WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bots
router.post('/bots', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, description, personality, knowledge_base, welcome_message, channels, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(
      'INSERT INTO cb_bots (name, description, personality, knowledge_base, welcome_message, channels, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name,
      description || null,
      personality || null,
      knowledge_base ? JSON.stringify(knowledge_base) : null,
      welcome_message || null,
      channels ? JSON.stringify(channels) : '[]',
      status || 'draft',
      wsId
    );

    const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('chatbot', 'create', 'Created chatbot', name, null, wsId);
    res.status(201).json(bot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /bots/:id
router.get('/bots/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const flows = db.prepare('SELECT * FROM cb_flows WHERE bot_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    const conversationCount = db.prepare('SELECT COUNT(*) as count FROM cb_conversations WHERE bot_id = ? AND workspace_id = ?').get(req.params.id, wsId);

    res.json({ ...bot, flows, conversationCount: conversationCount.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /test - Test chat interaction
router.post('/test', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { bot_id, message, history } = req.body;

    let botContext = '';
    if (bot_id) {
      const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ? AND workspace_id = ?').get(bot_id, wsId);
      if (bot) {
        botContext = `
Bot Name: ${bot.name}
Personality: ${bot.personality || 'Friendly and helpful'}
Knowledge Base: ${bot.knowledge_base || 'General knowledge'}
Welcome Message: ${bot.welcome_message || 'Hello! How can I help you?'}`;
      }
    }

    const chatHistory = (history || []).map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `You are a chatbot with the following configuration:
${botContext}

Conversation history:
${chatHistory}

User says: "${message}"

Respond in character as this chatbot. Keep responses concise and helpful. If you don't know something, say so politely.
Return a JSON object: { "response": "your response text", "confidence": 0.95, "intent": "detected intent" }`;

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    // Save conversation
    if (bot_id) {
      const messages = [...(history || []), { role: 'user', content: message }, { role: 'bot', content: parsed?.response || raw }];
      db.prepare(
        'INSERT INTO cb_conversations (bot_id, messages, workspace_id) VALUES (?, ?, ?)'
      ).run(bot_id, JSON.stringify(messages), wsId);
    }

    sse.sendResult(parsed);
  } catch (error) {
    console.error('Chat test error:', error);
    sse.sendError(error);
  }
});

// GET /conversations
router.get('/conversations', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { bot_id, limit = 50 } = req.query;
    let sql = 'SELECT c.*, b.name as bot_name FROM cb_conversations c LEFT JOIN cb_bots b ON c.bot_id = b.id WHERE c.workspace_id = ?';
    const params = [wsId];

    if (bot_id) {
      sql += ' AND c.bot_id = ?';
      params.push(bot_id);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const conversations = db.prepare(sql).all(...params);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /bots/:id/embed — returns JS embed snippet for the bot
router.get('/bots/:id/embed', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const API_BASE = process.env.API_URL || 'http://localhost:3000';
    const snippet = `<!-- Overload Chatbot: ${bot.name} -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${API_BASE}/chatbot-widget.js';
    s.setAttribute('data-bot-id', '${bot.id}');
    s.setAttribute('data-workspace', '${wsId}');
    s.setAttribute('data-name', '${(bot.name || 'Chat').replace(/'/g, "\\'")}');
    s.setAttribute('data-color', '${bot.color || '#6366f1'}');
    s.defer = true;
    document.head.appendChild(s);
  })();
</script>
<!-- End Overload Chatbot -->`;

    res.json({ snippet, botId: bot.id, botName: bot.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

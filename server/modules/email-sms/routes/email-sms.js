const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const pm = require('../../../services/platformManager');
const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

// POST /generate - SSE: generate email or SMS content
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { type, campaignType, topic, audience, tone, goal, template, customPrompt, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !topic && !campaignType) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('email-sms', 'generate', `Generated ${type || 'email'} content`, 'AI generation', null, wsId);
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    let prompt;

    if (type === 'sms') {
      prompt = `You are an elite SMS marketing copywriter who crafts messages that drive immediate action. Generate a compelling SMS campaign.

Campaign Type: ${campaignType || 'Flash Sale'}
Topic/Product: ${topic || 'general promotion'}
Target Audience: ${audience || 'general'}
Tone: ${tone || 'urgent'}
Goal: ${goal || 'drive conversions'}
${template ? `Template Reference: ${template}` : ''}
${customPrompt ? `Additional Instructions: ${customPrompt}` : ''}

Rules:
- Keep each message under 160 characters
- Include a clear call-to-action with a placeholder link [LINK]
- Use urgency triggers where appropriate
- Include opt-out language where needed: "Reply STOP to unsubscribe"

Generate 3 SMS variants with different angles. For each variant provide:
1. The SMS text (under 160 chars)
2. Character count
3. Best send time recommendation
4. Expected CTR estimate (low/medium/high)

Format the output cleanly with each variant clearly separated by "---".`;
    } else if (type === 'subject-lines') {
      prompt = `You are a world-class email subject line specialist. Your subject lines consistently achieve 40%+ open rates.

Topic/Campaign: ${topic || 'general campaign'}
Audience: ${audience || 'general subscribers'}
Tone: ${tone || 'professional'}
Goal: ${goal || 'maximize opens'}
${customPrompt ? `Additional Context: ${customPrompt}` : ''}

Generate 10 subject lines with:
1. The subject line text (40-60 characters ideal)
2. Preview text companion (80-100 characters)
3. Open rate prediction (1-10 score)
4. Why it works (brief explanation)
5. Best for: (segment type)

Include a mix of:
- Curiosity-driven
- Benefit-focused
- Urgency-based
- Personalization-ready (with [NAME] placeholder)
- Question-based
- Number/data-driven

Format each clearly with labels.`;
    } else if (type === 'ab-variants') {
      prompt = `You are an A/B testing expert for email marketing. Generate testing variants for maximum optimization.

Original Campaign Topic: ${topic || 'marketing campaign'}
Audience: ${audience || 'general'}
Tone: ${tone || 'professional'}
Goal: ${goal || 'maximize conversions'}
${customPrompt ? `Base Content: ${customPrompt}` : ''}

Generate a complete A/B test plan with 3 variants:

For each variant provide:
- Subject Line (Version A, B, C)
- Preview Text
- Opening Hook (first 2-3 sentences)
- CTA Button Text
- CTA Placement recommendation
- Hypothesis (what we're testing)
- Expected winner reasoning

Also include:
- Recommended test split percentages
- Minimum sample size recommendation
- Recommended test duration
- Key metrics to track
- Statistical significance threshold

Format cleanly with clear section headers.`;
    } else {
      // Standard email generation
      const campaignPrompts = {
        'welcome-sequence': `Create a 3-email welcome sequence that:
- Email 1: Warm welcome, sets expectations, delivers promised lead magnet
- Email 2: Brand story, social proof, core value proposition
- Email 3: First offer, testimonials, clear CTA`,
        'abandoned-cart': `Create a 3-email abandoned cart recovery sequence:
- Email 1 (1hr): Gentle reminder with product image and details
- Email 2 (24hr): Social proof, reviews, urgency element
- Email 3 (48hr): Final discount offer, scarcity, last chance`,
        'product-launch': `Create a product launch email with:
- Compelling announcement headline
- Product benefits (not just features)
- Social proof / early reviews
- Launch-exclusive offer
- Clear CTA with urgency`,
        'newsletter': `Create an engaging newsletter email with:
- Catchy headline that hooks the reader
- 3-4 content sections with brief summaries
- One featured article with deeper coverage
- Quick tips or industry news sidebar
- Clear CTAs for each section`,
        'reengagement': `Create a re-engagement email sequence:
- Email 1: "We miss you" with personalized recap
- Email 2: Exclusive comeback offer
- Email 3: Final "last chance" before list cleanup`,
        'winback': `Create a win-back campaign:
- Acknowledge the lapse in engagement
- Highlight what's new since they left
- Offer a compelling incentive to return
- Make it easy with a single clear CTA`,
      };

      const campaignInstructions = campaignPrompts[campaignType] || campaignPrompts['product-launch'];

      prompt = `You are an expert email marketing copywriter who creates campaigns that convert. Write a compelling marketing email campaign.

Campaign Type: ${campaignType || 'product-launch'}
Topic/Product: ${topic || 'general promotion'}
Target Audience: ${audience || 'general subscribers'}
Tone: ${tone || 'professional'}
Goal: ${goal || 'drive conversions'}
${template ? `Template Style: ${template}` : ''}
${customPrompt ? `Additional Instructions: ${customPrompt}` : ''}

${campaignInstructions}

For each email provide:
SUBJECT: [compelling subject line, 40-60 chars]
PREVIEW: [preview text, 80-100 chars]
BODY:
[Complete email body with:
- Personalized greeting with [NAME] placeholder
- Engaging opening hook
- Body content with clear value proposition
- Social proof elements
- Strong CTA button text
- P.S. line for extra persuasion
- Professional signature block]

METRICS PREDICTION:
- Expected open rate: X%
- Expected click rate: X%
- Best send time: [day and time]
- Best send day: [day of week]

Format the output cleanly and professionally.`;
    }

    // Inject brand context into prompt
    const brandBlock = buildBrandSystemPrompt(getBrandContext(wsId));
    if (brandBlock) prompt += brandBlock;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 6144,
      temperature: 0.85,
    });

    // Save campaign to database
    const result = db.prepare(
      'INSERT INTO es_campaigns (name, type, campaign_type, body, tone, audience, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      topic || `${type} campaign`,
      type === 'sms' ? 'sms' : 'email',
      campaignType || 'general',
      text,
      tone || 'professional',
      audience || null,
      JSON.stringify({ goal, template, customPrompt }),
      wsId
    );

    logActivity('email-sms', 'generate', `Generated ${type} campaign: ${campaignType || 'general'}`, topic, String(result.lastInsertRowid), wsId);

    sse.sendResult({ id: result.lastInsertRowid, content: text, type, campaignType });
  } catch (error) {
    console.error('Email/SMS generation error:', error);
    sse.sendError(error);
  }
});

// GET /campaigns - list all campaigns
router.get('/campaigns', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { type, status } = req.query;
    let query = 'SELECT * FROM es_campaigns';
    const conditions = ['workspace_id = ?'];
    const params = [wsId];

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const campaigns = db.prepare(query).all(...params);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /campaigns/:id - get single campaign
router.get('/campaigns/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const campaign = db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns - create a campaign
router.post('/campaigns', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, campaign_type, subject, preview_text, body, tone, audience, status, variants, metadata, scheduled_at } = req.body;
    const result = db.prepare(
      'INSERT INTO es_campaigns (name, type, campaign_type, subject, preview_text, body, tone, audience, status, variants, metadata, scheduled_at, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, type, campaign_type || null, subject || null, preview_text || null, body || null, tone || 'professional', audience || null, status || 'draft', variants ? JSON.stringify(variants) : null, metadata ? JSON.stringify(metadata) : null, scheduled_at || null, wsId);
    const campaign = db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('email-sms', 'create', `Created ${type} campaign`, name, String(result.lastInsertRowid), wsId);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /campaigns/:id - update a campaign
router.put('/campaigns/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    const { name, subject, preview_text, body, tone, audience, status, variants, metadata, scheduled_at } = req.body;
    db.prepare(
      `UPDATE es_campaigns SET name = ?, subject = ?, preview_text = ?, body = ?, tone = ?, audience = ?, status = ?, variants = ?, metadata = ?, scheduled_at = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?`
    ).run(
      name || existing.name,
      subject !== undefined ? subject : existing.subject,
      preview_text !== undefined ? preview_text : existing.preview_text,
      body !== undefined ? body : existing.body,
      tone || existing.tone,
      audience !== undefined ? audience : existing.audience,
      status || existing.status,
      variants ? JSON.stringify(variants) : existing.variants,
      metadata ? JSON.stringify(metadata) : existing.metadata,
      scheduled_at !== undefined ? scheduled_at : existing.scheduled_at,
      req.params.id,
      wsId
    );

    const updated = db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /campaigns/:id - delete a campaign
router.delete('/campaigns/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    db.prepare('DELETE FROM es_campaigns WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('email-sms', 'delete', `Deleted ${existing.type} campaign`, existing.name, req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templates - list all templates
router.get('/templates', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { type } = req.query;
    let templates;
    if (type) {
      templates = db.prepare('SELECT * FROM es_templates WHERE type = ? AND workspace_id = ? ORDER BY created_at DESC').all(type, wsId);
    } else {
      templates = db.prepare('SELECT * FROM es_templates WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    }
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /templates - create a template
router.post('/templates', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, category, subject, content, variables } = req.body;
    const result = db.prepare(
      'INSERT INTO es_templates (name, type, category, subject, content, variables, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, type, category || null, subject || null, content || null, variables ? JSON.stringify(variables) : null, wsId);
    const template = db.prepare('SELECT * FROM es_templates WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════
// Real Platform Integration Routes
// ══════════════════════════════════════════════════════

// GET /platforms/lists - get email lists from connected providers
router.get('/platforms/lists', async (req, res) => {
  try {
    const { provider } = req.query;
    const results = {};
    const providers = provider ? [provider] : ['mailchimp', 'klaviyo'];

    for (const pid of providers) {
      if (!pm.isConnected(pid)) continue;
      try {
        results[pid] = await pm.emailLists(pid);
      } catch (e) {
        results[pid] = { error: e.message };
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/campaigns - get campaigns from connected providers
router.get('/platforms/campaigns', async (req, res) => {
  try {
    const { provider } = req.query;
    const results = {};
    const providers = provider ? [provider] : ['mailchimp', 'klaviyo'];

    for (const pid of providers) {
      if (!pm.isConnected(pid)) continue;
      try {
        results[pid] = await pm.emailCampaigns(pid);
      } catch (e) {
        results[pid] = { error: e.message };
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /platforms/send - send a campaign through a connected provider
router.post('/platforms/send', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { provider, listId, subject, fromName, fromEmail, replyTo, html, name } = req.body;
    if (!provider || !listId) return res.status(400).json({ success: false, error: 'provider and listId required' });
    if (!pm.isConnected(provider)) return res.status(400).json({ success: false, error: `${provider} not connected` });

    const data = await pm.emailSend(provider, {
      listId, subject, fromName, fromEmail, replyTo, html, name: name || subject,
    });

    logActivity('email-sms', 'send', `Sent campaign via ${provider}`, subject, null, wsId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Platform send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/connected - check which email providers are connected
router.get('/platforms/connected', (req, res) => {
  try {
    const connected = pm.getConnectedProviders()
      .filter(p => ['mailchimp', 'klaviyo'].includes(p.provider_id));
    res.json({ success: true, data: connected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const pm = require('../../../services/platformManager');
const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');
const { requirePlan } = require('../../../services/stripe');

// POST /generate - SSE: generate email or SMS content
router.post('/generate', requirePlan('manual'), async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { type, campaignType, topic, audience, tone, goal, template, customPrompt, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !topic && !campaignType) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      await logActivity('email-sms', 'generate', `Generated ${type || 'email'} content`, 'AI generation', null, wsId);
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
    const result = await db.prepare(
      'INSERT INTO es_campaigns (name, type, content, metadata, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(
      topic || `${type} campaign`,
      type === 'sms' ? 'sms' : 'email',
      text,
      JSON.stringify({ campaign_type: campaignType || 'general', tone: tone || 'professional', audience: audience || null, goal, template, customPrompt }),
      wsId
    );

    await logActivity('email-sms', 'generate', `Generated ${type} campaign: ${campaignType || 'general'}`, topic, String(result.lastInsertRowid), wsId);

    sse.sendResult({ id: result.lastInsertRowid, content: text, type, campaignType });
  } catch (error) {
    console.error('Email/SMS generation error:', error);
    sse.sendError(error);
  }
});

// GET /campaigns - list all campaigns
router.get('/campaigns', async (req, res) => {
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

    const rows = await db.prepare(query).all(...params);
    const campaigns = rows.map(c => {
      const meta = c.metadata ? JSON.parse(c.metadata) : {};
      return { ...c, campaign_type: meta.campaign_type || null, tone: meta.tone || null, audience: meta.audience || null, preview_text: meta.preview_text || null, variants: meta.variants || null };
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /campaigns/:id - get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const row = await db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!row) return res.status(404).json({ error: 'Campaign not found' });
    const meta = row.metadata ? JSON.parse(row.metadata) : {};
    const campaign = { ...row, campaign_type: meta.campaign_type || null, tone: meta.tone || null, audience: meta.audience || null, preview_text: meta.preview_text || null, variants: meta.variants || null };
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns - create a campaign
router.post('/campaigns', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, campaign_type, subject, preview_text, body, content, tone, audience, status, variants, metadata, scheduled_at } = req.body;
    const mergedMeta = JSON.stringify({
      ...(metadata || {}),
      campaign_type: campaign_type || null,
      preview_text: preview_text || null,
      tone: tone || 'professional',
      audience: audience || null,
      variants: variants || null,
    });
    const result = await db.prepare(
      'INSERT INTO es_campaigns (name, type, subject, content, status, metadata, scheduled_at, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, type, subject || null, content ?? body ?? null, status || 'draft', mergedMeta, scheduled_at || null, wsId);
    const campaign = await db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    await logActivity('email-sms', 'create', `Created ${type} campaign`, name, String(result.lastInsertRowid), wsId);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /campaigns/:id - update a campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = await db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    const { name, subject, preview_text, body, content, tone, audience, status, variants, metadata, scheduled_at } = req.body;
    const existingMeta = existing.metadata ? JSON.parse(existing.metadata) : {};
    const updatedMeta = JSON.stringify({
      ...existingMeta,
      ...(metadata || {}),
      ...(preview_text !== undefined ? { preview_text } : {}),
      ...(tone !== undefined ? { tone } : {}),
      ...(audience !== undefined ? { audience } : {}),
      ...(variants !== undefined ? { variants } : {}),
    });
    await db.prepare(
      `UPDATE es_campaigns SET name = ?, subject = ?, content = ?, status = ?, metadata = ?, scheduled_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`
    ).run(
      name || existing.name,
      subject !== undefined ? subject : existing.subject,
      content !== undefined ? content : (body !== undefined ? body : existing.content),
      status || existing.status,
      updatedMeta,
      scheduled_at !== undefined ? scheduled_at : existing.scheduled_at,
      req.params.id,
      wsId
    );

    const updated = await db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /campaigns/:id - delete a campaign
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = await db.prepare('SELECT * FROM es_campaigns WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    await db.prepare('DELETE FROM es_campaigns WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    await logActivity('email-sms', 'delete', `Deleted ${existing.type} campaign`, existing.name, req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templates - list all templates
router.get('/templates', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { type } = req.query;
    let templates;
    if (type) {
      templates = await db.prepare('SELECT * FROM es_templates WHERE type = ? AND workspace_id = ? ORDER BY created_at DESC').all(type, wsId);
    } else {
      templates = await db.prepare('SELECT * FROM es_templates WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    }
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /templates - create a template
router.post('/templates', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, category, subject, content, body } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    const result = await db.prepare(
      'INSERT INTO es_templates (name, type, category, subject, body, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, type, category || null, subject || null, body || content || null, wsId);
    const template = await db.prepare('SELECT * FROM es_templates WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
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

    // If html looks like raw text (no tags), render through MJML first
    let finalHtml = html;
    if (html && !html.includes('<html') && !html.includes('<table') && !html.includes('<mj-')) {
      try {
        const rendered = renderText(html, {});
        if (rendered.html) finalHtml = rendered.html;
      } catch { /* fallback to raw html */ }
    }

    const data = await pm.emailSend(provider, {
      listId, subject, fromName, fromEmail, replyTo, html: finalHtml, name: name || subject,
    });

    await logActivity('email-sms', 'send', `Sent campaign via ${provider}`, subject, null, wsId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Platform send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/connected - check which email providers are connected
router.get('/platforms/connected', async (req, res) => {
  try {
    const connected = pm.getConnectedProviders()
      .filter(p => ['mailchimp', 'klaviyo'].includes(p.provider_id));
    res.json({ success: true, data: connected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /generate-subject-lines — generate 5 subject line variations
router.post('/generate-subject-lines', async (req, res) => {
  const { topic, content_snippet } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  try {
    const { text } = await generateTextWithClaude(`You are an email marketing expert specializing in subject lines with high open rates.

Email topic: ${topic}
Content preview: ${content_snippet ? content_snippet.substring(0, 300) : 'N/A'}

Generate 5 subject line variations, each using a different psychological trigger. Return JSON:
{
  "subject_lines": [
    { "text": "<subject line>", "trigger": "<Curiosity|Urgency|FOMO|Benefit|Social Proof>", "predicted_open_rate": "<like 24%>", "emoji": "<optional emoji>" },
    ...
  ]
}

Make them creative, specific, and compelling. Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse subject lines' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /analyze — AI-powered email quality analysis
router.post('/analyze', async (req, res) => {
  const { content, subject, type } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    const { text } = await generateTextWithClaude(
      `You are an email deliverability and marketing expert. Analyze this ${type === 'sms' ? 'SMS' : 'email'} and return a strict JSON analysis.
${subject ? `Subject line: ${subject}\n` : ''}Content:
${content.slice(0, 3000)}

Return ONLY valid JSON with this exact structure:
{
  "overall_score": <0-100>,
  "spam_score": { "score": <0-100>, "grade": "<A|B|C|D|F>", "issues": ["..."] },
  "readability": { "score": <0-100>, "grade": "<A|B|C|D|F>", "level": "<Easy|Medium|Hard>" },
  "subject_quality": { "score": <0-100>, "grade": "<A|B|C|D|F>", "issues": ["..."], "strengths": ["..."] },
  "cta_strength": { "score": <0-100>, "grade": "<A|B|C|D|F>", "found": <true|false>, "suggestions": ["..."] },
  "improvements": ["Top improvement 1", "Top improvement 2", "Top improvement 3"]
}`, { temperature: 0.2 });

    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sequence-plan — generate a structured drip/welcome sequence plan
router.post('/sequence-plan', async (req, res) => {
  const wsId = req.workspace?.id;
  const { brief, sequence_type, count = 5 } = req.body;
  if (!brief) return res.status(400).json({ error: 'brief required' });
  try {
    const brandBlock = wsId ? buildBrandSystemPrompt(getBrandContext(wsId)) : '';
    const { text } = await generateTextWithClaude(
      `You are an expert email sequence strategist. Create a detailed ${sequence_type || 'drip'} sequence plan.
Brief: ${brief}
Number of emails: ${count}
${brandBlock || ''}

Return ONLY valid JSON:
{
  "sequence_name": "<name>",
  "goal": "<overall goal>",
  "emails": [
    {
      "step": 1,
      "title": "<email title>",
      "subject": "<suggested subject line>",
      "goal": "<what this email achieves>",
      "timing": "<e.g. Day 1, Day 3, Day 7>",
      "hook": "<compelling opening line or angle>",
      "key_points": ["point 1", "point 2", "point 3"]
    }
  ]
}`, { temperature: 0.6 });

    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// Image Upload for Email Designer
// ══════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const multer = require('multer');

const emailMediaDir = path.join(process.cwd(), 'uploads', 'email-media');
fs.mkdirSync(emailMediaDir, { recursive: true });

const emailStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, emailMediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const emailUpload = multer({
  storage: emailStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /upload-image — upload an image for email designer
router.post('/upload-image', emailUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/email-media/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.filename });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// MJML Email Rendering
// ══════════════════════════════════════════════════════

const { renderBlocks, renderText } = require('../../../services/mjmlRenderer');

// POST /render-blocks — render drag-and-drop blocks to HTML
router.post('/render-blocks', async (req, res) => {
  try {
    const { blocks, options } = req.body;
    if (!blocks || !Array.isArray(blocks)) return res.status(400).json({ error: 'blocks array required' });

    // Merge brand context into options
    const wsId = req.workspace?.id;
    let brandOptions = options || {};
    if (wsId) {
      const brand = getBrandContext(wsId);
      if (brand) {
        brandOptions = {
          brandColor: brand.colors?.[0] || brandOptions.brandColor,
          companyName: brand.name || brandOptions.companyName,
          logoUrl: brand.logoUrl || brandOptions.logoUrl,
          ...brandOptions,
        };
      }
    }

    const result = renderBlocks(blocks, brandOptions);
    res.json({ success: true, html: result.html, mjml: result.mjml, errors: result.errors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /render-text — render plain AI text to styled HTML email
router.post('/render-text', async (req, res) => {
  try {
    const { text, options } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const wsId = req.workspace?.id;
    let brandOptions = options || {};
    if (wsId) {
      const brand = getBrandContext(wsId);
      if (brand) {
        brandOptions = {
          brandColor: brand.colors?.[0] || brandOptions.brandColor,
          companyName: brand.name || brandOptions.companyName,
          logoUrl: brand.logoUrl || brandOptions.logoUrl,
          ...brandOptions,
        };
      }
    }

    const result = renderText(text, brandOptions);
    res.json({ success: true, html: result.html, errors: result.errors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

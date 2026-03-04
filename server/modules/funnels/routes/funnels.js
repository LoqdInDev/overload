const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// ══════════════════════════════════════════════════════
// AI Generation Routes
// ══════════════════════════════════════════════════════

// POST /generate — SSE: generate copy for a single funnel stage
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { type, product, audience, ctaStyle, colorScheme, stages, industry, prompt: rawPrompt } = req.body;

    // If only a raw prompt, use it directly
    if (rawPrompt && !product && !audience) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('funnels', 'generate', `Generated ${type || 'funnel'} copy`, 'raw prompt', null, wsId);
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    const stageList = (stages || []).join(' -> ') || 'Landing Page -> Order Form -> Upsell -> Thank You';

    const prompt = `You are an expert conversion funnel strategist and copywriter. Design a complete sales funnel with persuasive copy for every stage.

Funnel Type: ${type || 'Product Launch'}
Product/Service: ${product || 'Not specified'}
Industry: ${industry || 'General'}
Target Audience: ${audience || 'General audience'}
CTA Style: ${ctaStyle || 'Direct'}
Color Scheme: ${colorScheme || 'Modern'}
Funnel Stages: ${stageList}

For each funnel stage, provide:
1. Page headline and sub-headline
2. Hero section copy (2-3 sentences)
3. Key benefits section (3-5 bullet points)
4. Social proof / testimonial suggestions
5. Specific CTA button text
6. Below-the-fold content suggestions
7. Psychological triggers to use at this stage

Also provide:
- Overall funnel strategy and flow logic
- Email follow-up sequence (3 emails per stage transition)
- A/B testing suggestions for headlines and CTAs
- Conversion optimization tips for each stage
- Expected conversion benchmarks by stage`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('funnels', 'generate', `Generated ${type || 'Product Launch'} funnel`, product || 'No product', null, wsId);
    sse.sendResult({ content: text, type: type || 'Product Launch' });
  } catch (error) {
    console.error('Funnel generation error:', error);
    sse.sendError(error);
  }
});

// POST /generate-stage — SSE: generate copy for one specific stage
router.post('/generate-stage', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { funnelType, stageName, product, audience, industry, pricePoint, urgency } = req.body;
    if (!stageName) return sse.sendError(new Error('stageName required'));

    const prompt = `You are a world-class conversion copywriter. Write high-converting copy for a single funnel page.

Funnel Type: ${funnelType || 'Product Launch'}
Stage: ${stageName}
Product/Service: ${product || 'Not specified'}
Industry: ${industry || 'General'}
Target Audience: ${audience || 'General audience'}
Price Point: ${pricePoint || 'Mid-range'}
Urgency Level: ${urgency || 'Medium'}

Write complete copy for the ${stageName} page including:

**HEADLINE:** [Primary attention-grabbing headline]
**SUB-HEADLINE:** [Supporting headline that deepens the hook]

**HERO COPY:**
[2-3 sentences that speak directly to the visitor's pain or desire]

**KEY BENEFITS:**
• [Benefit 1 — outcome-focused]
• [Benefit 2 — outcome-focused]
• [Benefit 3 — outcome-focused]
• [Benefit 4 — outcome-focused]

**SOCIAL PROOF:**
[Testimonial template / trust signals appropriate for this stage]

**CTA BUTTON:** [Exact CTA text — action-oriented, specific]

**BELOW THE FOLD:**
[2-3 content suggestions to reinforce the decision]

**PSYCHOLOGICAL TRIGGERS:**
[2-3 specific triggers effective at this funnel stage]

**CONVERSION TIP:**
[One specific optimization tip for this stage]`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('funnels', 'generate-stage', `Generated ${stageName} copy`, funnelType, null, wsId);
    sse.sendResult({ content: text, stageName });
  } catch (error) {
    console.error('Stage generation error:', error);
    sse.sendError(error);
  }
});

// POST /ab-variants — SSE: generate A/B test headline/CTA variants for a stage
router.post('/ab-variants', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { stageName, currentHeadline, product, funnelType } = req.body;
    if (!stageName) return sse.sendError(new Error('stageName required'));

    const { text } = await generateTextWithClaude(`You are an expert CRO specialist. Generate A/B test variants for a funnel page.

Stage: ${stageName}
Funnel Type: ${funnelType || 'Product Launch'}
Product: ${product || 'Not specified'}
Current Headline: "${currentHeadline || 'Not provided'}"

Return JSON:
{
  "variants": [
    {
      "label": "Variant A — Curiosity",
      "headline": "<headline>",
      "sub_headline": "<sub-headline>",
      "cta": "<CTA text>",
      "approach": "Curiosity",
      "why_it_works": "<reasoning>"
    },
    {
      "label": "Variant B — Direct Benefit",
      "headline": "<headline>",
      "sub_headline": "<sub-headline>",
      "cta": "<CTA text>",
      "approach": "Direct Benefit",
      "why_it_works": "<reasoning>"
    },
    {
      "label": "Variant C — Social Proof",
      "headline": "<headline>",
      "sub_headline": "<sub-headline>",
      "cta": "<CTA text>",
      "approach": "Social Proof",
      "why_it_works": "<reasoning>"
    }
  ],
  "testing_tip": "<how to run this A/B test effectively>"
}

Only return JSON.`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 1500,
    });

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed) return sse.sendError(new Error('Failed to parse variants'));

    logActivity('funnels', 'ab-variants', `Generated A/B variants for ${stageName}`, funnelType, null, wsId);
    sse.sendResult(parsed);
  } catch (error) {
    console.error('A/B variants error:', error);
    sse.sendError(error);
  }
});

// POST /email-sequence — SSE: generate 3-email follow-up sequence for a stage transition
router.post('/email-sequence', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { fromStage, toStage, product, audience, funnelType } = req.body;
    if (!fromStage) return sse.sendError(new Error('fromStage required'));

    const { text } = await generateTextWithClaude(`You are an expert email copywriter specializing in funnel sequences. Write a 3-email follow-up sequence.

Funnel Type: ${funnelType || 'Product Launch'}
Transition: After "${fromStage}" stage${toStage ? ` → leading to "${toStage}"` : ''}
Product/Service: ${product || 'Not specified'}
Audience: ${audience || 'General audience'}

Return JSON:
{
  "sequence": [
    {
      "email_number": 1,
      "send_timing": "Immediately after opt-in",
      "subject": "<subject line>",
      "preview_text": "<preview text — 60 chars>",
      "opening": "<first 2 sentences — hook>",
      "body": "<main message — 3-4 sentences>",
      "cta_text": "<CTA button text>",
      "cta_purpose": "<what clicking achieves>",
      "ps_line": "<optional PS — adds urgency or value>"
    },
    {
      "email_number": 2,
      "send_timing": "24 hours later",
      "subject": "<subject line>",
      "preview_text": "<preview text>",
      "opening": "<hook — addresses common objection>",
      "body": "<social proof or value add — 3-4 sentences>",
      "cta_text": "<CTA>",
      "cta_purpose": "<purpose>",
      "ps_line": "<PS>"
    },
    {
      "email_number": 3,
      "send_timing": "48 hours later",
      "subject": "<urgency/scarcity subject>",
      "preview_text": "<preview text>",
      "opening": "<last chance hook>",
      "body": "<recap of value + urgency — 2-3 sentences>",
      "cta_text": "<strong CTA>",
      "cta_purpose": "<purpose>",
      "ps_line": "<deadline reminder>"
    }
  ]
}

Only return JSON.`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 2048,
    });

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed) return sse.sendError(new Error('Failed to parse email sequence'));

    logActivity('funnels', 'email-sequence', `Generated email sequence for ${fromStage}`, funnelType, null, wsId);
    sse.sendResult(parsed);
  } catch (error) {
    console.error('Email sequence error:', error);
    sse.sendError(error);
  }
});

// POST /analyze-funnel — analyze funnel efficiency
router.post('/analyze-funnel', async (req, res) => {
  const wsId = req.workspace.id;
  const { funnel_name, steps } = req.body;
  if (!steps?.length) return res.status(400).json({ error: 'steps required' });

  try {
    const { text } = await generateTextWithClaude(`You are a conversion rate optimization expert. Analyze this marketing funnel:

Funnel: ${funnel_name || 'Marketing Funnel'}
Steps: ${JSON.stringify(steps)}

Return JSON:
{
  "overall_efficiency": <number 0-100>,
  "biggest_drop_off_step": "<step name>",
  "drop_off_reason": "<likely reason for biggest drop>",
  "step_analysis": [
    { "step": "<name>", "estimated_conversion": "<like 45%>", "rating": "good|ok|poor", "tip": "<specific optimization>" }
  ],
  "top_recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "estimated_current_conversion": "<like 2.3%>",
  "potential_conversion_with_fixes": "<like 4.1%>"
}

Only return JSON.`);

    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try {
      res.json(JSON.parse(cleaned));
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse analysis' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// CRUD Routes
// ══════════════════════════════════════════════════════

// GET /funnels — list all funnels
router.get('/funnels', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const funnels = db.prepare('SELECT * FROM fn_funnels WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(funnels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /funnels — create a funnel
router.post('/funnels', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, stages, status, description, product, audience, industry } = req.body;
    const id = uuid();
    db.prepare(
      'INSERT INTO fn_funnels (id, name, type, stages, status, description, product, audience, industry, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id, name, type || null,
      stages ? JSON.stringify(stages) : null,
      status || 'draft',
      description || null,
      product || null, audience || null, industry || null,
      wsId
    );
    const funnel = db.prepare('SELECT * FROM fn_funnels WHERE id = ? AND workspace_id = ?').get(id, wsId);
    logActivity('funnels', 'create', `Created funnel: ${name}`, type, id, wsId);
    res.status(201).json(funnel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /funnels/:id — update a funnel
router.put('/funnels/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, description, status, stages, product, audience, industry } = req.body;
    db.prepare(
      `UPDATE fn_funnels SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        stages = COALESCE(?, stages),
        product = COALESCE(?, product),
        audience = COALESCE(?, audience),
        industry = COALESCE(?, industry),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND workspace_id = ?`
    ).run(name, type, description, status, stages ? JSON.stringify(stages) : null, product, audience, industry, req.params.id, wsId);
    const funnel = db.prepare('SELECT * FROM fn_funnels WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(funnel || { error: 'not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /funnels/:id — get a single funnel with its pages
router.get('/funnels/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { id } = req.params;
    const funnel = db.prepare('SELECT * FROM fn_funnels WHERE id = ? AND workspace_id = ?').get(id, wsId);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });
    const pages = db.prepare('SELECT * FROM fn_pages WHERE funnel_id = ? AND workspace_id = ? ORDER BY position ASC').all(id, wsId);
    res.json({ ...funnel, pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /funnels/:id — delete a funnel
router.delete('/funnels/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM fn_funnels WHERE id = ? AND workspace_id = ?').get(id, wsId);
    if (!existing) return res.status(404).json({ error: 'Funnel not found' });
    db.prepare('DELETE FROM fn_pages WHERE funnel_id = ? AND workspace_id = ?').run(id, wsId);
    db.prepare('DELETE FROM fn_funnels WHERE id = ? AND workspace_id = ?').run(id, wsId);
    logActivity('funnels', 'delete', 'Deleted funnel', existing.name, id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /funnels/:id/pages — save generated page content
router.post('/funnels/:id/pages', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { id: funnelId } = req.params;
    const funnel = db.prepare('SELECT * FROM fn_funnels WHERE id = ? AND workspace_id = ?').get(funnelId, wsId);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });

    const { name, stage_name, content, position, type } = req.body;
    const pageId = uuid();

    // Delete existing page for this stage if it exists
    if (stage_name) {
      db.prepare('DELETE FROM fn_pages WHERE funnel_id = ? AND workspace_id = ? AND stage_name = ?').run(funnelId, wsId, stage_name);
    }

    db.prepare(
      'INSERT INTO fn_pages (id, funnel_id, workspace_id, name, stage_name, type, content, generated_content, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(pageId, funnelId, wsId, name || stage_name, stage_name || null, type || 'landing', null, content, position || 0);

    const page = db.prepare('SELECT * FROM fn_pages WHERE id = ?').get(pageId);
    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /search - AI influencer discovery (SSE)
router.post('/search', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { niche, platform, followerMin, followerMax, engagementRate, budget } = req.body;

    const prompt = `You are an expert influencer marketing researcher. Find and recommend influencers matching these criteria:

Niche: ${niche || 'general'}
Platform: ${platform || 'Instagram'}
Follower Range: ${followerMin || '10000'} - ${followerMax || '500000'}
Minimum Engagement Rate: ${engagementRate || '2'}%
Budget: ${budget ? '$' + budget : 'Flexible'}

IMPORTANT DISCLAIMER: These are AI-generated example profiles for inspiration and research planning only — not real, discoverable influencers. Clearly note at the top of your response: "⚠️ AI-Generated Profiles: These are example archetypes for planning purposes, not real searchable social media profiles."

Provide a list of 8-12 influencer profiles with:
1. Suggested influencer name/handle (realistic examples for the niche)
2. Estimated follower count
3. Estimated engagement rate
4. Content style description
5. Why they're a good fit for this niche
6. Estimated cost per post
7. Best collaboration format (sponsored post, story, reel, unboxing, etc.)
8. Audience demographic match score (1-10)

Also provide:
- Overall niche analysis (competition level, saturation, trending topics)
- Recommended influencer tier mix (nano, micro, mid, macro)
- Budget allocation strategy
- Red flags to watch for in this niche`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    // Save search to database
    const result = db.prepare(
      'INSERT INTO inf_searches (niche, platform, criteria, results, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(niche, platform, JSON.stringify({ followerMin, followerMax, engagementRate, budget }), text, wsId);

    logActivity('influencers', 'search', `Searched ${platform || 'Instagram'} influencers`, niche || 'general', null, wsId);
    sse.sendResult({ content: text, searchId: result.lastInsertRowid });
  } catch (error) {
    console.error('Influencer search error:', error);
    sse.sendError(error);
  }
});

// POST /vetting-checklist — SSE: generate influencer vetting checklist
router.post('/vetting-checklist', async (req, res) => {
  const { handle, platform, niche } = req.body;
  if (!handle) return res.status(400).json({ error: 'handle required' });

  const sse = setupSSE(res);

  try {
    const { text } = await generateTextWithClaude(`You are an influencer marketing expert. Generate a comprehensive vetting checklist for this influencer:

Handle: @${handle}
Platform: ${platform || 'Instagram'}
Niche: ${niche || 'general'}

Provide a detailed vetting report with these sections:

## Authenticity Signals to Check
(5-7 specific things to look for that indicate real vs. fake followers/engagement)

## Content Consistency Score
(What to evaluate: posting frequency, visual style, voice consistency, topic focus)

## Brand Safety Checklist
(Red flags: controversial posts, competitor mentions, brand conflicts, audience demographics)

## Engagement Quality Indicators
(How to spot genuine engagement vs. bot activity: comment patterns, like ratios, story views)

## Before You Reach Out — Verification Steps
(5 concrete steps: e.g., check follower growth chart on Social Blade, verify email via LinkedIn, etc.)

## Estimated Fake Follower % Signal
(Formula/heuristic for rough estimate based on public metrics)

## Green Flags ✓ / Red Flags ✗
(Quick-scan checklist table)

Note: This is an AI-generated guide for manual vetting — you must verify all metrics directly on the platform.`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /generate-outreach - AI outreach template generation (SSE)
router.post('/generate-outreach', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { templateType, influencerName, niche, platform, product, budget, campaignGoal } = req.body;

    const typeLabels = {
      'initial': 'Initial Contact / Introduction DM',
      'collaboration': 'Collaboration Proposal',
      'gifting': 'Product Gifting Offer',
      'paid': 'Paid Partnership Proposal',
    };

    const prompt = `You are an expert influencer outreach specialist. Write a ${typeLabels[templateType] || 'outreach'} message:

Template Type: ${typeLabels[templateType] || templateType || 'Initial Contact'}
Influencer: ${influencerName || 'the influencer'}
Platform: ${platform || 'Instagram'}
Niche: ${niche || 'general'}
Product/Brand: ${product || 'our brand'}
Campaign Goal: ${campaignGoal || 'brand awareness'}
Budget Range: ${budget ? '$' + budget : 'To be discussed'}

Write 3 variations of the outreach message:
1. Casual / DM-friendly version
2. Professional / Email version
3. Brief / Follow-up version

For each, provide:
- Subject line (for email versions)
- Message body
- Key personalization hooks to customize
- Best time to send
- Follow-up timeline

Also include:
- Negotiation talking points
- Common objections and responses
- Rate card benchmarks for this tier
- Contract terms to include`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('influencers', 'outreach', `Generated ${templateType || 'outreach'} template`, influencerName || 'general', null, wsId);
    sse.sendResult({ content: text, templateType: templateType || 'initial' });
  } catch (error) {
    console.error('Outreach generation error:', error);
    sse.sendError(error);
  }
});

// POST /generate - Generic AI generation (SSE) - used by frontend for all tool types
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { type, prompt } = req.body;
    const finalPrompt = prompt || `Generate influencer marketing content for: ${type || 'general'}`;

    const { text } = await generateTextWithClaude(finalPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('influencers', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Influencer generation error:', error);
    sse.sendError(error);
  }
});

// GET /campaigns - List all campaigns
router.get('/campaigns', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const campaigns = db.prepare('SELECT * FROM inf_campaigns WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns - Create a campaign
router.post('/campaigns', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, influencers, budget, status } = req.body;

    const result = db.prepare(
      'INSERT INTO inf_campaigns (name, influencers, budget, status, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, influencers ? JSON.stringify(influencers) : null, budget || 0, status || 'planning', wsId);

    const campaign = db.prepare('SELECT * FROM inf_campaigns WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('influencers', 'create', 'Created campaign', name, null, wsId);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /campaigns/:id - Update a campaign
router.put('/campaigns/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, description, budget, status } = req.body;
    db.prepare(
      'UPDATE inf_campaigns SET name = COALESCE(?, name), description = COALESCE(?, description), budget = COALESCE(?, budget), status = COALESCE(?, status) WHERE id = ? AND workspace_id = ?'
    ).run(name, description, budget, status, req.params.id, wsId);
    const campaign = db.prepare('SELECT * FROM inf_campaigns WHERE id = ?').get(req.params.id);
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /campaigns/:id - Delete a campaign
router.delete('/campaigns/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM inf_outreach WHERE campaign_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM inf_campaigns WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('influencers', 'delete', 'Deleted campaign', req.params.id, null, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /searches - List recent searches
router.get('/searches', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const searches = db.prepare('SELECT * FROM inf_searches WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 20').all(wsId);
    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /calculate-roi — calculate influencer ROI
router.post('/calculate-roi', (req, res) => {
  const { followers, engagement_rate, fee, avg_order_value, product_margin } = req.body;
  if (!followers || !fee) return res.status(400).json({ error: 'followers and fee required' });

  const reach = Math.round(followers * 0.6);
  const clicks = Math.round(reach * (parseFloat(engagement_rate) || 3) / 100 * 0.15);
  const sales = Math.round(clicks * 0.02);
  const revenue = sales * (parseFloat(avg_order_value) || 50);
  const profit = revenue * ((parseFloat(product_margin) || 40) / 100);
  const roi = Math.round(((profit - parseFloat(fee)) / parseFloat(fee)) * 100);
  const breakeven_sales = Math.ceil(parseFloat(fee) / ((parseFloat(avg_order_value) || 50) * (parseFloat(product_margin) || 40) / 100));

  res.json({ reach, estimated_clicks: clicks, projected_sales: sales, projected_revenue: revenue.toFixed(2), roi_percent: roi, breakeven_sales, is_profitable: roi > 0 });
});

// POST /generate-brief — generate influencer campaign brief (SSE)
router.post('/generate-brief', (req, res) => {
  const { product, goal, influencer_niche, platform } = req.body;
  if (!product) { res.status(400).json({ error: 'product required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are an influencer marketing expert. Create a complete campaign brief for:

Product: ${product}
Campaign Goal: ${goal || 'Brand Awareness'}
Influencer Niche: ${influencer_niche || 'Lifestyle'}
Platform: ${platform || 'Instagram'}

Write a professional influencer brief with these sections:

## Campaign Overview
(2-3 sentences on what this campaign is about)

## Content Requirements
(specific content formats, length, style)

## Key Messages
(3-5 bullet points the influencer must communicate)

## Do's
(5 specific things to do)

## Don'ts
(5 specific things to avoid)

## Required Hashtags & Tags
(list all required hashtags and brand account tags)

## CTA Requirements
(exact call-to-action, promo code, link structure)

## Deliverables & Timeline
(what's required and when)

Be specific, clear, and professional.`;

  generateTextWithClaude(prompt, {
    onChunk: (chunk) => sse.sendChunk(chunk),
  })
    .then(() => sse.sendResult({ done: true }))
    .catch(() => sse.sendError({ message: 'Generation failed' }));
});

module.exports = router;

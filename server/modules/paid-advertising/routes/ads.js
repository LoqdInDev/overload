const express = require('express');
const { v4: uuid } = require('uuid');
const { generateTextWithClaude } = require('../../../services/claude');
const { logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildAdCampaignPrompt } = require('../prompts/adGenerator');
const { setupSSE } = require('../../../services/sse');
const pm = require('../../../services/platformManager');

const router = express.Router();

// Parse JSON from AI response — strips code fences, handles partial match
function parseAdJSON(text) {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// POST /generate — SSE: generate ad campaign with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { platform, name, objective, budget, audience } = req.body;
  if (!platform || !name) return sse.sendError(new Error('platform and name are required'));
  try {
    const prompt = buildAdCampaignPrompt(platform, { name, objective, budget, audience });
    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 4096,
    });
    const parsed = parseAdJSON(text) || { campaign_name: name, platform, ad_content: {}, targeting: {}, strategy: {} };
    const id = uuid();
    q.create(id, platform, name, objective || 'conversions', budget || '', audience || '', JSON.stringify(parsed.ad_content || {}), JSON.stringify(parsed));
    logActivity('ads', 'generate', `Generated ${platform} ad campaign`, name, id, wsId);
    sse.sendResult({ id, ...parsed });
  } catch (err) {
    console.error('Ad generation error:', err);
    sse.sendError(err);
  }
});

// GET /campaigns — list all campaigns
router.get('/campaigns', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const platform = req.query.platform;
  const campaigns = platform ? q.getByPlatform(platform) : q.getAll();
  res.json(campaigns);
});

// GET /campaigns/:id — get campaign by ID
router.get('/campaigns/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const campaign = q.getById(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  if (campaign.ad_content) campaign.ad_content = JSON.parse(campaign.ad_content);
  if (campaign.metadata) campaign.metadata = JSON.parse(campaign.metadata);
  res.json(campaign);
});

// PUT /campaigns/:id — update campaign
router.put('/campaigns/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const existing = q.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, objective, budget, audience, ad_content, status, metadata } = req.body;
  q.update(
    name || existing.name,
    objective || existing.objective,
    budget || existing.budget,
    audience || existing.audience,
    ad_content ? JSON.stringify(ad_content) : existing.ad_content,
    status || existing.status,
    metadata ? JSON.stringify(metadata) : existing.metadata,
    req.params.id
  );
  res.json({ success: true });
});

// DELETE /campaigns/:id — delete campaign
router.delete('/campaigns/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  q.delete(req.params.id);
  logActivity('ads', 'delete', 'Deleted ad campaign', null, req.params.id, wsId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════
// Real Platform Integration Routes
// ══════════════════════════════════════════════════════

router.get('/platforms/campaigns', async (req, res) => {
  try {
    const { provider, customerId, adAccountId } = req.query;
    const results = {};
    const providers = provider ? [provider] : ['google', 'meta'];
    for (const pid of providers) {
      if (!pm.isConnected(pid)) continue;
      try {
        const params = {};
        if (pid === 'google' && customerId) params.customerId = customerId;
        if (pid === 'meta' && adAccountId) params.adAccountId = adAccountId;
        results[pid] = await pm.adsCampaigns(pid, params);
      } catch (e) { results[pid] = { error: e.message }; }
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/platforms/metrics', async (req, res) => {
  try {
    const { provider, campaignId, customerId, startDate, endDate } = req.query;
    if (!provider || !campaignId) return res.status(400).json({ success: false, error: 'provider and campaignId required' });
    if (!pm.isConnected(provider)) return res.status(400).json({ success: false, error: `${provider} not connected` });
    const data = await pm.adsMetrics(provider, { campaignId, customerId, startDate, endDate });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/platforms/campaigns/:campaignId/pause', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { provider, customerId } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'provider required' });
    if (!pm.isConnected(provider)) return res.status(400).json({ success: false, error: `${provider} not connected` });
    const data = await pm.adsPause(provider, { campaignId: req.params.campaignId, customerId });
    logActivity('ads', 'pause', `Paused ${provider} campaign`, req.params.campaignId, null, wsId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/platforms/campaigns/:campaignId/enable', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { provider, customerId } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'provider required' });
    if (!pm.isConnected(provider)) return res.status(400).json({ success: false, error: `${provider} not connected` });
    const data = await pm.adsEnable(provider, { campaignId: req.params.campaignId, customerId });
    logActivity('ads', 'enable', `Enabled ${provider} campaign`, req.params.campaignId, null, wsId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/platforms/accounts', async (req, res) => {
  try {
    const results = {};
    if (pm.isConnected('google')) {
      try {
        const token = await pm.getToken('google');
        const platforms = require('../../../services/platforms');
        results.google = await platforms.googleAds.listAccessibleCustomers(token);
      } catch (e) { results.google = { error: e.message }; }
    }
    if (pm.isConnected('meta')) {
      try {
        const token = await pm.getToken('meta');
        const platforms = require('../../../services/platforms');
        results.meta = await platforms.metaAds.getAdAccounts(token);
      } catch (e) { results.meta = { error: e.message }; }
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════
// AI Optimization Routes
// ══════════════════════════════════════════════════════

// POST /score-ad — score ad effectiveness (FIXED: async/await, no fake fallback)
router.post('/score-ad', async (req, res) => {
  const { headline, body_copy, cta, platform, objective } = req.body;
  if (!headline) return res.status(400).json({ error: 'headline required' });
  try {
    const { text } = await generateTextWithClaude(`You are a senior paid advertising expert. Score this ad:

Platform: ${platform || 'Meta'}
Objective: ${objective || 'Conversions'}
Headline: ${headline}
Body Copy: ${body_copy || 'N/A'}
CTA: ${cta || 'N/A'}

Return JSON:
{
  "overall_score": <1-10>,
  "hook_strength": <1-10>,
  "clarity": <1-10>,
  "cta_effectiveness": <1-10>,
  "platform_fit": <1-10>,
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "rewritten_headline": "<improved headline>",
  "predicted_ctr": "<like 2.3%>"
}

Only return JSON.`);
    const result = parseAdJSON(text);
    if (!result) return res.status(500).json({ error: 'Failed to parse score result' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate-headline-variations — generate 3 headline variations (FIXED: async/await, no fake fallback)
router.post('/generate-headline-variations', async (req, res) => {
  const { headline, product, platform } = req.body;
  if (!headline) return res.status(400).json({ error: 'headline required' });
  try {
    const { text } = await generateTextWithClaude(`You are a copywriting expert. Generate 3 headline variations for this ad:

Original: "${headline}"
Product/Service: ${product || 'Unknown'}
Platform: ${platform || 'Meta'}

Return JSON:
{
  "variations": [
    { "headline": "<variation>", "approach": "<Emotional|Direct Response|Curiosity|Social Proof>", "strength": "<what makes it work>" },
    { "headline": "<variation>", "approach": "<approach>", "strength": "<what makes it work>" },
    { "headline": "<variation>", "approach": "<approach>", "strength": "<what makes it work>" }
  ]
}

Only return JSON.`);
    const result = parseAdJSON(text);
    if (!result) return res.status(500).json({ error: 'Failed to generate variations' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /adapt-platform — SSE: adapt existing campaign to a different platform
router.post('/adapt-platform', async (req, res) => {
  const sse = setupSSE(res);
  const { original_campaign, target_platform } = req.body;
  if (!original_campaign || !target_platform) return sse.sendError(new Error('original_campaign and target_platform required'));
  try {
    const prompt = buildAdCampaignPrompt(target_platform, {
      name: original_campaign.campaign_name || original_campaign.name || 'Campaign',
      objective: original_campaign.objective || 'conversions',
      budget: original_campaign.budget || '50',
      audience: original_campaign.targeting?.audience_segments?.join(', ') || 'Based on original targeting',
    });
    const contextPrompt = `${prompt}

IMPORTANT: This is an adaptation of an existing campaign for ${target_platform}. Keep the same product, offer, and core value proposition — but rewrite everything to feel native and optimal for ${target_platform}'s format, audience behavior, and best practices.

Original campaign context:
${JSON.stringify({ ad_content: original_campaign.ad_content, targeting: original_campaign.targeting }, null, 2).substring(0, 1200)}`;
    const { text } = await generateTextWithClaude(contextPrompt, {
      onChunk: (t) => sse.sendChunk(t),
      maxTokens: 4096,
    });
    const parsed = parseAdJSON(text) || { campaign_name: original_campaign.campaign_name, platform: target_platform, ad_content: {}, targeting: {}, strategy: {} };
    sse.sendResult({ ...parsed, platform: target_platform });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /negative-keywords — SSE: generate Google Ads negative keyword list
router.post('/negative-keywords', async (req, res) => {
  const sse = setupSSE(res);
  const { campaign_name, audience, objective } = req.body;
  if (!campaign_name) return sse.sendError(new Error('campaign_name required'));
  try {
    const { text } = await generateTextWithClaude(`You are a Google Ads expert. Generate a negative keyword list to prevent wasted ad spend.

Campaign: ${campaign_name}
Audience: ${audience || 'Not specified'}
Objective: ${objective || 'Conversions'}

Generate 25-30 negative keywords across these categories: free/discount seekers, job seekers, DIY/how-to searchers, competitor research terms, irrelevant industries, wrong intent modifiers.

Return JSON:
{
  "negative_keywords": [
    { "keyword": "free trial", "reason": "discount seekers won't convert", "match_type": "Broad" },
    { "keyword": "how to make", "reason": "informational intent, not buyer", "match_type": "Phrase" }
  ],
  "categories": ["Free/Discount", "Job Seekers", "DIY/How-To", "Competitor Research", "Wrong Intent"]
}

Only return JSON.`, {
      onChunk: (t) => sse.sendChunk(t),
      maxTokens: 2048,
    });
    const parsed = parseAdJSON(text) || { negative_keywords: [], categories: [] };
    sse.sendResult(parsed);
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /video-script — SSE: generate video ad script for TikTok or YouTube
router.post('/video-script', async (req, res) => {
  const sse = setupSSE(res);
  const { campaign_name, platform, objective, audience, duration } = req.body;
  if (!campaign_name) return sse.sendError(new Error('campaign_name required'));
  const scriptDuration = Number(duration) || 30;
  const platformStyle = platform === 'tiktok'
    ? 'casual, native TikTok style — fast cuts, trendy, relatable, speaking directly to camera, hooks in first 2 seconds before anyone scrolls'
    : 'YouTube Pre-Roll — hook before the skip button appears (first 5 seconds are critical), then deliver value, then close';
  try {
    const { text } = await generateTextWithClaude(`You are a video ad scriptwriter specializing in performance creative. Write a ${scriptDuration}-second video ad script.

Campaign: ${campaign_name}
Platform: ${platform === 'tiktok' ? 'TikTok' : 'YouTube Pre-Roll'}
Style: ${platformStyle}
Objective: ${objective || 'Conversions'}
Audience: ${audience || 'General'}

Return JSON:
{
  "duration": "${scriptDuration}s",
  "hook": {
    "visual": "<what viewer sees in first 2-3 seconds>",
    "audio": "<opening spoken line — must be attention-grabbing>",
    "why_it_works": "<why this specific hook stops the scroll>"
  },
  "body": [
    { "time": "0:03-0:12", "visual": "<shot description>", "script": "<exact spoken words>", "purpose": "<what this achieves>" },
    { "time": "0:12-0:22", "visual": "<shot description>", "script": "<exact spoken words>", "purpose": "<what this achieves>" }
  ],
  "cta": {
    "time": "0:22-0:${scriptDuration}",
    "visual": "<end card / product shot / offer>",
    "script": "<closing line>",
    "text_overlay": "<text shown on screen>"
  },
  "music_vibe": "<recommended music style — e.g., upbeat electronic, lo-fi chill>",
  "production_notes": "<2-3 key tips for shooting this effectively on a budget>"
}

Only return JSON.`, {
      onChunk: (t) => sse.sendChunk(t),
      maxTokens: 2048,
    });
    const parsed = parseAdJSON(text);
    if (!parsed) return sse.sendError(new Error('Failed to generate script'));
    sse.sendResult(parsed);
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

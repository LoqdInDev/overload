const express = require('express');
const { v4: uuid } = require('uuid');
const { generateTextWithClaude } = require('../../../services/claude');
const { logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildAdCampaignPrompt } = require('../prompts/adGenerator');
const { setupSSE } = require('../../../services/sse');
const pm = require('../../../services/platformManager');
const { requirePlan } = require('../../../services/stripe');

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

// POST /export-config — generate platform-specific importable campaign config
router.post('/export-config', async (req, res) => {
  const { campaign_result, platform, budget, objective } = req.body;
  if (!campaign_result || !platform) return res.status(400).json({ error: 'campaign_result and platform required' });

  const ad = campaign_result.ad_content || {};
  const targeting = campaign_result.targeting || {};
  const strategy = campaign_result.strategy || {};
  const name = campaign_result.campaign_name || 'Campaign';

  try {
    if (platform === 'google') {
      // Google Ads Editor CSV format — directly importable
      const rows = [['Campaign', 'Ad Group', 'Headline 1', 'Headline 2', 'Headline 3', 'Description 1', 'Description 2', 'Final URL', 'Campaign Status', 'Campaign Type', 'Campaign Daily Budget', 'Bid Strategy Type']];
      const h = ad.headlines || [];
      const d = ad.descriptions || [];
      rows.push([
        name, `${name} - Ad Group 1`,
        h[0] || '', h[1] || '', h[2] || '',
        d[0] || '', d[1] || '',
        '{YOUR_LANDING_PAGE_URL}',
        'Paused', 'Search', budget || '50',
        strategy.bidding || 'Maximize Conversions',
      ]);
      // Additional RSA variations if available
      if (h.length > 3) {
        rows.push([
          name, `${name} - Ad Group 1`,
          h[3] || '', h[4] || h[0] || '', h[1] || '',
          d[1] || d[0] || '', d[2] || d[0] || '',
          '{YOUR_LANDING_PAGE_URL}',
          'Paused', 'Search', budget || '50',
          strategy.bidding || 'Maximize Conversions',
        ]);
      }

      // Keywords sheet
      const kwRows = [['Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Max CPC']];
      const keywords = ad.extras?.keywords || targeting.interests || [];
      keywords.forEach(kw => {
        const keyword = typeof kw === 'string' ? kw : (kw.keyword || kw.text || '');
        const match = typeof kw === 'string' ? 'Broad' : (kw.match_type || 'Broad');
        if (keyword) kwRows.push([name, `${name} - Ad Group 1`, keyword, match, '']);
      });

      // Sitelinks
      const slRows = [['Campaign', 'Sitelink Text', 'Sitelink Description Line 1', 'Sitelink Description Line 2', 'Sitelink Final URL']];
      const sitelinks = ad.extras?.sitelinks || [];
      sitelinks.forEach(sl => {
        slRows.push([name, sl.title || '', sl.description1 || sl.desc1 || '', sl.description2 || sl.desc2 || '', '{YOUR_URL}']);
      });

      const toCsv = (rows) => rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

      return res.json({
        format: 'google_ads_editor',
        instructions: [
          '1. Open Google Ads Editor (free desktop app from Google)',
          '2. Go to Account → Import → Paste text',
          '3. Paste the Ads CSV content below',
          '4. Repeat for Keywords if needed',
          '5. Replace {YOUR_LANDING_PAGE_URL} with your actual URL',
          '6. Review settings, then Post changes to your account',
          '7. Campaign starts PAUSED — enable when ready',
        ],
        files: {
          'ads.csv': toCsv(rows),
          'keywords.csv': kwRows.length > 1 ? toCsv(kwRows) : null,
          'sitelinks.csv': slRows.length > 1 ? toCsv(slRows) : null,
        },
        api_payload: {
          campaign: {
            name, status: 'PAUSED',
            advertisingChannelType: 'SEARCH',
            biddingStrategyType: strategy.bidding || 'MAXIMIZE_CONVERSIONS',
            campaignBudget: { amountMicros: String((Number(budget) || 50) * 1000000), deliveryMethod: 'STANDARD' },
          },
          adGroup: { name: `${name} - Ad Group 1`, status: 'ENABLED', type: 'SEARCH_STANDARD' },
          responsiveSearchAd: {
            headlines: (h.slice(0, 15)).map(text => ({ text })),
            descriptions: (d.slice(0, 4)).map(text => ({ text })),
            finalUrls: ['{YOUR_LANDING_PAGE_URL}'],
          },
        },
      });
    }

    if (platform === 'meta') {
      // Meta Ads Manager bulk import format
      const rows = [['Campaign Name', 'Campaign Objective', 'Campaign Budget', 'Budget Type', 'Ad Set Name', 'Optimization Goal', 'Targeting - Interests', 'Targeting - Age Min', 'Targeting - Age Max', 'Placements', 'Ad Name', 'Primary Text', 'Headline', 'Description', 'Call to Action', 'Website URL', 'Status']];

      const h = ad.headlines || [];
      const pt = ad.primary_texts || [];
      const d = ad.descriptions || [];
      const interests = (targeting.interests || []).join('; ');
      const placements = (targeting.placements || []).join('; ');
      const demographics = targeting.demographics || '';
      const ageMatch = demographics.match(/(\d{2})\s*[-–]\s*(\d{2})/);
      const ageMin = ageMatch ? ageMatch[1] : '18';
      const ageMax = ageMatch ? ageMatch[2] : '65';
      const objMap = { conversions: 'OUTCOME_SALES', traffic: 'OUTCOME_TRAFFIC', awareness: 'OUTCOME_AWARENESS', leads: 'OUTCOME_LEADS' };

      // Create rows for each primary text + headline combo (up to 3)
      const count = Math.max(1, Math.min(3, h.length, pt.length));
      for (let i = 0; i < count; i++) {
        rows.push([
          name, objMap[objective] || 'OUTCOME_SALES',
          budget || '50', 'DAILY',
          `${name} - Ad Set 1`,
          objective === 'traffic' ? 'LINK_CLICKS' : 'OFFSITE_CONVERSIONS',
          interests, ageMin, ageMax, placements || 'Automatic',
          `${name} - Ad ${i + 1}`,
          pt[i] || pt[0] || '', h[i] || h[0] || '', d[i] || d[0] || '',
          ad.cta || 'LEARN_MORE',
          '{YOUR_LANDING_PAGE_URL}', 'PAUSED',
        ]);
      }

      const toCsv = (rows) => rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

      return res.json({
        format: 'meta_ads_manager',
        instructions: [
          '1. Open Meta Ads Manager (business.facebook.com)',
          '2. Use the campaign data below to set up your campaign',
          '3. Campaign Name, Objective, Budget → Campaign level',
          '4. Targeting, Placements, Optimization → Ad Set level',
          '5. Primary Text, Headline, Description, CTA → Ad level',
          '6. Replace {YOUR_LANDING_PAGE_URL} with your actual URL',
          '7. Add your image/video creative in Ads Manager',
          '8. Campaign starts PAUSED — enable when ready',
        ],
        files: {
          'campaign.csv': toCsv(rows),
        },
        api_payload: {
          campaign: {
            name, objective: objMap[objective] || 'OUTCOME_SALES', status: 'PAUSED',
            special_ad_categories: [],
            daily_budget: String((Number(budget) || 50) * 100),
          },
          adSet: {
            name: `${name} - Ad Set 1`,
            optimization_goal: objective === 'traffic' ? 'LINK_CLICKS' : 'OFFSITE_CONVERSIONS',
            billing_event: 'IMPRESSIONS',
            targeting: {
              age_min: Number(ageMin), age_max: Number(ageMax),
              interests: (targeting.interests || []).map(i => ({ name: i })),
              publisher_platforms: placements ? undefined : ['facebook', 'instagram'],
            },
          },
          adCreative: {
            name: `${name} - Creative`,
            object_story_spec: {
              link_data: {
                message: pt[0] || '',
                name: h[0] || '',
                description: d[0] || '',
                call_to_action: { type: ad.cta?.toUpperCase().replace(/\s+/g, '_') || 'LEARN_MORE' },
                link: '{YOUR_LANDING_PAGE_URL}',
              },
            },
          },
        },
      });
    }

    if (platform === 'tiktok') {
      const h = ad.headlines || [];
      const texts = ad.primary_texts || ad.descriptions || [];
      const hashtags = ad.extras?.hashtags || [];

      return res.json({
        format: 'tiktok_ads_manager',
        instructions: [
          '1. Open TikTok Ads Manager (ads.tiktok.com)',
          '2. Create Campaign → set objective and budget',
          '3. Create Ad Group → set targeting and placements',
          '4. Create Ad → paste text, upload video creative',
          '5. Use the hashtags and hook suggestions in your video',
          '6. Campaign starts PAUSED — enable when ready',
        ],
        files: null,
        campaign_setup: {
          campaign: { name, objective: objective || 'conversions', budget_mode: 'BUDGET_MODE_DAY', budget: budget || '50', status: 'CAMPAIGN_STATUS_DISABLE' },
          adGroup: {
            name: `${name} - Ad Group`,
            placement_type: 'PLACEMENT_TYPE_NORMAL',
            placements: (targeting.placements || []).length > 0 ? targeting.placements : ['TikTok'],
            audience: targeting.audience_segments || [],
            interests: targeting.interests || [],
            age_groups: targeting.demographics || '18-55',
            optimization_goal: objective === 'traffic' ? 'CLICK' : 'CONVERT',
          },
          ads: texts.slice(0, 3).map((text, i) => ({
            name: `${name} - Ad ${i + 1}`,
            text,
            headline: h[i] || h[0] || '',
            call_to_action: ad.cta || 'LEARN_MORE',
            hashtags: hashtags.slice(0, 5),
            landing_page: '{YOUR_LANDING_PAGE_URL}',
          })),
          hooks: ad.extras?.hooks || [],
          music_suggestions: ad.extras?.music || [],
        },
        api_payload: {
          campaign: {
            campaign_name: name,
            objective_type: objective === 'traffic' ? 'TRAFFIC' : objective === 'awareness' ? 'REACH' : 'CONVERSIONS',
            budget_mode: 'BUDGET_MODE_DAY',
            budget: (Number(budget) || 50).toFixed(2),
            operation_status: 'DISABLE',
          },
        },
      });
    }

    if (platform === 'linkedin') {
      const h = ad.headlines || [];
      const texts = ad.primary_texts || [];
      const d = ad.descriptions || [];
      const objMap = { conversions: 'WEBSITE_CONVERSIONS', traffic: 'WEBSITE_VISITS', awareness: 'BRAND_AWARENESS', leads: 'LEAD_GENERATION' };

      return res.json({
        format: 'linkedin_campaign_manager',
        instructions: [
          '1. Open LinkedIn Campaign Manager (linkedin.com/campaignmanager)',
          '2. Create Campaign Group → set budget',
          '3. Create Campaign → set objective, audience, format',
          '4. Create Ads → paste introductory text, headline, description',
          '5. Add your image/video creative',
          '6. Campaign starts PAUSED — enable when ready',
        ],
        files: null,
        campaign_setup: {
          campaign: {
            name, objective: objMap[objective] || 'WEBSITE_CONVERSIONS',
            dailyBudget: { amount: budget || '50', currencyCode: 'USD' },
            status: 'PAUSED',
            type: 'SPONSORED_UPDATES',
          },
          targeting: {
            jobTitles: targeting.audience_segments || [],
            industries: targeting.interests || [],
            seniority: targeting.demographics || '',
          },
          ads: h.slice(0, 3).map((headline, i) => ({
            name: `${name} - Ad ${i + 1}`,
            introductoryText: texts[i] || texts[0] || '',
            headline,
            description: d[i] || d[0] || '',
            callToAction: ad.cta?.toUpperCase().replace(/\s+/g, '_') || 'LEARN_MORE',
            landingPageUrl: '{YOUR_LANDING_PAGE_URL}',
          })),
        },
      });
    }

    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  } catch (err) {
    console.error('Export config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /launch — launch campaign directly to ad platform (PAUSED) [Autopilot plan required]
router.post('/launch', requirePlan('autopilot'), async (req, res) => {
  const wsId = req.workspace.id;
  const { campaign_result, platform, budget, objective, account_id } = req.body;
  if (!campaign_result || !platform) return res.status(400).json({ error: 'campaign_result and platform required' });
  if (!pm.isConnected(platform)) return res.status(400).json({ error: `${platform} not connected. Go to Settings → Integrations to connect your ${platform} account.` });

  try {
    const ad = campaign_result.ad_content || {};
    const targeting = campaign_result.targeting || {};
    const strategy = campaign_result.strategy || {};
    const name = campaign_result.campaign_name || 'Campaign';
    const dailyBudget = budget || '50';
    const budgetMicros = String((Number(dailyBudget) || 50) * 1000000);

    const params = {
      name, objective: objective || 'conversions',
      dailyBudget, budgetMicros,
      adContent: ad, targeting, strategy,
    };

    // Platform-specific account IDs
    if (platform === 'google') {
      if (!account_id) return res.status(400).json({ error: 'Google Ads Customer ID required. Select an account first.' });
      params.customerId = account_id;
    } else if (platform === 'meta') {
      if (!account_id) return res.status(400).json({ error: 'Meta Ad Account ID required. Select an account first.' });
      params.adAccountId = account_id;
    } else if (platform === 'tiktok') {
      params.advertiserId = account_id;
    } else if (platform === 'linkedin') {
      params.accountId = account_id;
    }

    const result = await pm.adsCreate(platform, params);

    // Update saved campaign status
    const q = getQueries(wsId);
    const existing = q.getAll().find(c => c.name === name && c.platform === platform);
    if (existing) {
      q.update(existing.name, existing.objective, existing.budget, existing.audience, existing.ad_content, 'launched', JSON.stringify({ ...JSON.parse(existing.metadata || '{}'), launch: result }), existing.id);
    }

    logActivity('ads', 'launch', `Launched ${platform} campaign (PAUSED)`, name, result.campaignId, wsId);

    res.json({
      success: true,
      platform,
      campaign_name: name,
      status: 'PAUSED',
      ...result,
      message: `Campaign "${name}" created on ${platform} as PAUSED. Go to your ${platform} Ads Manager to review and enable it.`,
    });
  } catch (err) {
    console.error(`Launch to ${platform} failed:`, err);
    res.status(500).json({ error: err.message });
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

const express = require('express');
const { v4: uuid } = require('uuid');
const { generateWithClaude } = require('../../../services/claude');
const { logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildAdCampaignPrompt } = require('../prompts/adGenerator');
const pm = require('../../../services/platformManager');

const router = express.Router();

// Generate ad campaign with AI
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { platform, name, objective, budget, audience } = req.body;

  if (!platform || !name) {
    return res.status(400).json({ error: 'platform and name are required' });
  }

  try {
    const prompt = buildAdCampaignPrompt(platform, { name, objective, budget, audience });
    const { parsed } = await generateWithClaude(prompt, { temperature: 0.8 });

    const id = uuid();
    q.create(
      id, platform, name, objective || 'conversions',
      budget || '', audience || '',
      JSON.stringify(parsed.ad_content || {}),
      JSON.stringify(parsed)
    );

    logActivity('ads', 'generate', `Generated ${platform} ad campaign`, name, id, wsId);

    res.json({ id, ...parsed });
  } catch (err) {
    console.error('Ad generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all campaigns
router.get('/campaigns', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const platform = req.query.platform;
  const campaigns = platform ? q.getByPlatform(platform) : q.getAll();
  res.json(campaigns);
});

// Get campaign by ID
router.get('/campaigns/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const campaign = q.getById(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });

  // Parse JSON fields
  if (campaign.ad_content) campaign.ad_content = JSON.parse(campaign.ad_content);
  if (campaign.metadata) campaign.metadata = JSON.parse(campaign.metadata);

  res.json(campaign);
});

// Update campaign
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

// Delete campaign
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

// GET /platforms/campaigns - fetch real campaigns from connected ad platforms
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
      } catch (e) {
        results[pid] = { error: e.message };
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Platform campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/metrics - get campaign performance metrics
router.get('/platforms/metrics', async (req, res) => {
  try {
    const { provider, campaignId, customerId, startDate, endDate } = req.query;
    if (!provider || !campaignId) return res.status(400).json({ success: false, error: 'provider and campaignId required' });
    if (!pm.isConnected(provider)) return res.status(400).json({ success: false, error: `${provider} not connected` });

    const data = await pm.adsMetrics(provider, { campaignId, customerId, startDate, endDate });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Platform metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /platforms/campaigns/:campaignId/pause - pause a campaign
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
    console.error('Pause campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /platforms/campaigns/:campaignId/enable - enable a campaign
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
    console.error('Enable campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/accounts - get connected ad accounts
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

module.exports = router;

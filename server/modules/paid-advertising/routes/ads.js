const express = require('express');
const { v4: uuid } = require('uuid');
const { generateWithClaude } = require('../../../services/claude');
const { logActivity } = require('../../../db/database');
const { queries } = require('../db/queries');
const { buildAdCampaignPrompt } = require('../prompts/adGenerator');

const router = express.Router();

// Generate ad campaign with AI
router.post('/generate', async (req, res) => {
  const { platform, name, objective, budget, audience } = req.body;

  if (!platform || !name) {
    return res.status(400).json({ error: 'platform and name are required' });
  }

  try {
    const prompt = buildAdCampaignPrompt(platform, { name, objective, budget, audience });
    const { parsed } = await generateWithClaude(prompt, { temperature: 0.8 });

    const id = uuid();
    queries.create.run(
      id, platform, name, objective || 'conversions',
      budget || '', audience || '',
      JSON.stringify(parsed.ad_content || {}),
      JSON.stringify(parsed)
    );

    logActivity('ads', 'generate', `Generated ${platform} ad campaign`, name, id);

    res.json({ id, ...parsed });
  } catch (err) {
    console.error('Ad generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all campaigns
router.get('/campaigns', (req, res) => {
  const platform = req.query.platform;
  const campaigns = platform ? queries.getByPlatform.all(platform) : queries.getAll.all();
  res.json(campaigns);
});

// Get campaign by ID
router.get('/campaigns/:id', (req, res) => {
  const campaign = queries.getById.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });

  // Parse JSON fields
  if (campaign.ad_content) campaign.ad_content = JSON.parse(campaign.ad_content);
  if (campaign.metadata) campaign.metadata = JSON.parse(campaign.metadata);

  res.json(campaign);
});

// Update campaign
router.put('/campaigns/:id', (req, res) => {
  const existing = queries.getById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, objective, budget, audience, ad_content, status, metadata } = req.body;

  queries.update.run(
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
  queries.delete.run(req.params.id);
  logActivity('ads', 'delete', 'Deleted ad campaign', null, req.params.id);
  res.json({ success: true });
});

module.exports = router;

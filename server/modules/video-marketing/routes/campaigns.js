const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getQueries } = require('../db/queries');
const { logActivity } = require('../../../db/database');

router.post('/', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { productName, productData } = req.body;

  if (!productName) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const id = uuidv4();
  q.createCampaign(id, productName, JSON.stringify(productData || {}));
  const campaign = q.getCampaign(id);
  logActivity('video-marketing', 'create', `New campaign: ${productName}`, null, id, wsId);
  res.json(campaign);
});

router.get('/', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const campaigns = q.getAllCampaigns();
  res.json(campaigns);
});

router.get('/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const campaign = q.getCampaign(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const generations = q.getAllGenerationsForCampaign(req.params.id);
  const favorites = q.getFavorites(req.params.id);

  res.json({
    ...campaign,
    product_data: JSON.parse(campaign.product_data),
    generations: generations.map(g => ({
      ...g,
      output: JSON.parse(g.output),
    })),
    favorites,
  });
});

router.put('/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { productName, productData } = req.body;
  const existing = q.getCampaign(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  q.updateCampaign(
    productName || existing.product_name,
    JSON.stringify(productData || JSON.parse(existing.product_data)),
    req.params.id
  );

  const updated = q.getCampaign(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  q.deleteCampaign(req.params.id);
  res.json({ success: true });
});

router.post('/:id/favorite', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { generationId, itemIndex } = req.body;
  const id = uuidv4();
  q.addFavorite(id, req.params.id, generationId, itemIndex);
  res.json({ id });
});

router.delete('/:id/favorite/:favId', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  q.removeFavorite(req.params.favId);
  res.json({ success: true });
});

module.exports = router;

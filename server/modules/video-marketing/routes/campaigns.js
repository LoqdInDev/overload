const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { queries } = require('../db/queries');
const { logActivity } = require('../../../db/database');

router.post('/', (req, res) => {
  const { productName, productData } = req.body;

  if (!productName) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const id = uuidv4();
  queries.createCampaign.run(id, productName, JSON.stringify(productData || {}));
  const campaign = queries.getCampaign.get(id);
  logActivity('video-marketing', 'create', `New campaign: ${productName}`, null, id);
  res.json(campaign);
});

router.get('/', (req, res) => {
  const campaigns = queries.getAllCampaigns.all();
  res.json(campaigns);
});

router.get('/:id', (req, res) => {
  const campaign = queries.getCampaign.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const generations = queries.getAllGenerationsForCampaign.all(req.params.id);
  const favorites = queries.getFavorites.all(req.params.id);

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
  const { productName, productData } = req.body;
  const existing = queries.getCampaign.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  queries.updateCampaign.run(
    productName || existing.product_name,
    JSON.stringify(productData || JSON.parse(existing.product_data)),
    req.params.id
  );

  const updated = queries.getCampaign.get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  queries.deleteCampaign.run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/favorite', (req, res) => {
  const { generationId, itemIndex } = req.body;
  const id = uuidv4();
  queries.addFavorite.run(id, req.params.id, generationId, itemIndex);
  res.json({ id });
});

router.delete('/:id/favorite/:favId', (req, res) => {
  queries.removeFavorite.run(req.params.favId);
  res.json({ success: true });
});

module.exports = router;

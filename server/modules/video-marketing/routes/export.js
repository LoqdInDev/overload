const express = require('express');
const router = express.Router();
const { queries } = require('../db/queries');
const { exportJSON, exportMarkdown, exportPDF } = require('../services/exporter');

function getCampaignData(campaignId) {
  const campaign = queries.getCampaign.get(campaignId);
  if (!campaign) return null;

  const generations = queries.getAllGenerationsForCampaign.all(campaignId);
  return { campaign, generations };
}

router.get('/:campaignId/json', (req, res) => {
  const data = getCampaignData(req.params.campaignId);
  if (!data) return res.status(404).json({ error: 'Campaign not found' });

  const json = exportJSON(data);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="overload-vm-${data.campaign.product_name}.json"`);
  res.send(json);
});

router.get('/:campaignId/markdown', (req, res) => {
  const data = getCampaignData(req.params.campaignId);
  if (!data) return res.status(404).json({ error: 'Campaign not found' });

  const md = exportMarkdown(data);
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="overload-vm-${data.campaign.product_name}.md"`);
  res.send(md);
});

router.get('/:campaignId/pdf', (req, res) => {
  const data = getCampaignData(req.params.campaignId);
  if (!data) return res.status(404).json({ error: 'Campaign not found' });

  try {
    const pdf = exportPDF(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="overload-vm-${data.campaign.product_name}.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { INSIGHT_TEMPLATES, MODULE_CATEGORY_MAP } = require('./insight-templates');

// GET /insights/:moduleId — template-based AI insights
router.get('/insights/:moduleId', (req, res) => {
  const { moduleId } = req.params;
  const category = MODULE_CATEGORY_MAP[moduleId] || 'default';
  const items = INSIGHT_TEMPLATES[category] || INSIGHT_TEMPLATES.default;
  res.json({ moduleId, items });
});

module.exports = router;

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'brand-profile',
  name: 'Brand Identity',
  description: 'Your brand DNA — every AI module references this when generating content',
  icon: 'icon-brand',
  color: '#C45D3E',
  category: 'settings',
  apiPrefix: '/api/brand-profile',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/brand-profile'));
    return router;
  },
};

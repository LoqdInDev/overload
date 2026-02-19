const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'brand-profile',
  name: 'Brand Profile',
  description: 'Define and manage brand identity including voice, visuals, audience, and guidelines',
  icon: 'icon-brand',
  color: '#64748b',
  category: 'settings',
  apiPrefix: '/api/brand-profile',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/brand-profile'));
    return router;
  },
};

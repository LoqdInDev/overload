const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'affiliates',
  name: 'Affiliate Manager',
  description: 'AI-powered affiliate program management and commission tracking',
  icon: 'link',
  color: '#22c55e',
  category: 'advertise',

  apiPrefix: '/api/affiliates',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/affiliates'));
    return router;
  },
};

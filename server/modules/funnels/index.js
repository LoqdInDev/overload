const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'funnels',
  name: 'Sales Funnels',
  description: 'AI-powered funnel builder with landing page copy generation',
  icon: 'funnel',
  color: '#f59e0b',
  category: 'convert',

  apiPrefix: '/api/funnels',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/funnels'));
    return router;
  },
};

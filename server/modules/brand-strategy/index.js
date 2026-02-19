const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'brand-strategy',
  name: 'Brand Strategy',
  description: 'AI-powered brand voice, positioning, and persona development',
  icon: 'palette',
  color: '#f59e0b',
  category: 'create',

  apiPrefix: '/api/brand',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/brand-strategy'));
    return router;
  },
};

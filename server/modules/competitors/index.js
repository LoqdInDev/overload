const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'competitors',
  name: 'Competitor Intelligence',
  description: 'AI-powered competitor analysis and monitoring',
  icon: 'target',
  color: '#ef4444',
  category: 'analyze',

  apiPrefix: '/api/competitors',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/competitors'));
    return router;
  },
};

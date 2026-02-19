const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'analytics',
  name: 'Analytics',
  description: 'Unified reporting across all modules',
  icon: 'chart-bar',
  color: '#f43f5e',
  category: 'analyze',

  apiPrefix: '/api/analytics',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/analytics'));
    return router;
  },
};

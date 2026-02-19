const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'profit-dashboard',
  name: 'Profit Dashboard',
  description: 'Track revenue, costs, and profitability across platforms',
  icon: 'chart-bar',
  color: '#22c55e',
  category: 'analytics',

  apiPrefix: '/api/profit-dashboard',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

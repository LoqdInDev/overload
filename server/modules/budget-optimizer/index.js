const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'budget-optimizer',
  name: 'Budget Optimizer',
  description: 'Optimize ad spend and budget allocation across channels',
  icon: 'calculator',
  color: '#059669',
  category: 'advertise',

  apiPrefix: '/api/budget-optimizer',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/budget-optimizer'));
    return router;
  },
};

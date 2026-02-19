const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'checkout-optimizer',
  name: 'Checkout Optimizer',
  description: 'Optimize checkout flows and run conversion tests',
  icon: 'shopping-cart',
  color: '#10b981',
  category: 'optimize',

  apiPrefix: '/api/checkout-optimizer',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

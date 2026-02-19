const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'ecommerce-hub',
  name: 'E-Commerce Hub',
  description: 'Manage stores, orders, and products across e-commerce platforms',
  icon: 'store',
  color: '#6366f1',
  category: 'manage',

  apiPrefix: '/api/ecommerce-hub',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

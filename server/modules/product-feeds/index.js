const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'product-feeds',
  name: 'Product Feeds',
  description: 'Product feed management and AI-optimized descriptions',
  icon: 'shopping-bag',
  color: '#64748b',
  category: 'advertise',

  apiPrefix: '/api/product-feeds',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();

    router.use('/', require('./routes/product-feeds'));

    return router;
  },
};

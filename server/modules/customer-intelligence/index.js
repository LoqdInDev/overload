const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'customer-intelligence',
  name: 'Customer Intelligence',
  description: 'Customer segmentation and AI-driven insights',
  icon: 'brain',
  color: '#a855f7',
  category: 'analytics',

  apiPrefix: '/api/customer-intelligence',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

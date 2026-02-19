const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'billing',
  name: 'Billing',
  description: 'Manage subscriptions, invoices, and usage tracking across the platform',
  icon: 'icon-billing',
  color: '#64748b',
  category: 'settings',
  apiPrefix: '/api/billing',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/billing'));
    return router;
  },
};

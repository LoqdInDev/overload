const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'webhooks',
  name: 'Webhooks',
  description: 'Configure and manage webhook endpoints and event delivery',
  icon: 'bolt',
  color: '#f97316',
  category: 'connect',

  apiPrefix: '/api/webhooks',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/webhooks'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'integrations',
  name: 'Integrations',
  description: 'Connect and manage third-party platform integrations',
  icon: 'plug',
  color: '#6366f1',
  category: 'connect',

  apiPrefix: '/api/integrations',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/integrations'));
    return router;
  },
};

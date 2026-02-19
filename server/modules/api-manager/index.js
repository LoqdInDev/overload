const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'api-manager',
  name: 'API Manager',
  description: 'Manage API keys, permissions, and usage monitoring',
  icon: 'key',
  color: '#0ea5e9',
  category: 'connect',

  apiPrefix: '/api/api-manager',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/api-manager'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'client-manager',
  name: 'Client Manager',
  description: 'Manage clients and their associated projects',
  icon: 'briefcase',
  color: '#64748b',
  category: 'manage',

  apiPrefix: '/api/client-manager',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'crm',
  name: 'CRM',
  description: 'Customer relationship management with deal pipeline',
  icon: 'users',
  color: '#3b82f6',
  category: 'manage',

  apiPrefix: '/api/crm',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/crm'));
    return router;
  },
};

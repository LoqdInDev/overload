const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'audience-builder',
  name: 'Audience Builder',
  description: 'Build and manage targeted audience segments',
  icon: 'users',
  color: '#8b5cf6',
  category: 'analyze',

  apiPrefix: '/api/audience-builder',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/audience-builder'));
    return router;
  },
};

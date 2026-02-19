const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'pr-press',
  name: 'PR & Press',
  description: 'Press release creation and media contact management',
  icon: 'newspaper',
  color: '#8b5cf6',
  category: 'marketing',

  apiPrefix: '/api/pr-press',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'knowledge-base',
  name: 'Knowledge Base',
  description: 'Self-service knowledge base with articles and categories',
  icon: 'book-open',
  color: '#14b8a6',
  category: 'content',

  apiPrefix: '/api/knowledge-base',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

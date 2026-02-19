const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'reviews',
  name: 'Review Management',
  description: 'AI-powered review monitoring, responses, and sentiment analysis',
  icon: 'chat-bubble-left-right',
  color: '#14b8a6',
  category: 'manage',

  apiPrefix: '/api/reviews',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/reviews'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'the-advisor',
  name: 'The Advisor',
  description: 'AI-powered daily briefings and actionable recommendations',
  icon: 'lightbulb',
  color: '#f97316',
  category: 'analytics',

  apiPrefix: '/api/the-advisor',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

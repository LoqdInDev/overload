const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'creative',
  name: 'Creative & Design',
  description: 'AI-powered visual content generation',
  icon: 'paint-brush',
  color: '#06b6d4',
  category: 'create',

  apiPrefix: '/api/creative',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/creative'));
    return router;
  },
};

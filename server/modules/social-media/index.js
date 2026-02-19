const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'social',
  name: 'Social Media',
  description: 'AI-powered social media content creation, caption generation, hashtag strategy, and content calendar planning',
  icon: 'share',
  color: '#3b82f6',
  category: 'create',

  apiPrefix: '/api/social',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/social-media'));
    return router;
  },
};

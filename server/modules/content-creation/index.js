const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'content',
  name: 'AI Content',
  description: 'AI-powered content generation for blogs, ads, and social',
  icon: 'document-text',
  color: '#f97316',
  category: 'create',

  apiPrefix: '/api/content',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/content'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'seo',
  name: 'SEO Tools',
  description: 'AI-powered SEO keyword research, meta tags, and audits',
  icon: 'magnifying-glass',
  color: '#06b6d4',
  category: 'optimize',

  apiPrefix: '/api/seo',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/seo'));
    return router;
  },
};

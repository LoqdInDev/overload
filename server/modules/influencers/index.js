const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'influencers',
  name: 'Influencer Marketing',
  description: 'AI-powered influencer discovery, matching, and outreach',
  icon: 'star',
  color: '#d946ef',
  category: 'engage',

  apiPrefix: '/api/influencers',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/influencers'));
    return router;
  },
};

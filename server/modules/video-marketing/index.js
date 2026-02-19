const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'video-marketing',
  name: 'Video Marketing',
  description: 'AI-powered video ad creation pipeline',
  icon: 'film',
  color: '#8b5cf6',
  category: 'create',

  apiPrefix: '/api',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();

    router.use('/campaigns', require('./routes/campaigns'));
    router.use('/generate', require('./routes/generate'));
    router.use('/video', require('./routes/video'));
    router.use('/export', require('./routes/export'));

    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'website-builder',
  name: 'Website Builder',
  description: 'AI-powered website and landing page builder',
  icon: 'globe',
  color: '#d946ef',
  category: 'create',

  apiPrefix: '/api/website-builder',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();

    router.use('/', require('./routes/website-builder'));

    return router;
  },
};

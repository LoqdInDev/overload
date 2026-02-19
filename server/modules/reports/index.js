const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'reports',
  name: 'Client Reports',
  description: 'AI-generated client reports with cross-module analytics',
  icon: 'bar-chart-2',
  color: '#f43f5e',
  category: 'analyze',

  apiPrefix: '/api/reports',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();

    router.use('/', require('./routes/reports'));

    return router;
  },
};

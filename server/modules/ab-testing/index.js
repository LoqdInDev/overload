const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'ab-testing',
  name: 'A/B Testing',
  description: 'Create and manage split tests to optimize conversions',
  icon: 'beaker',
  color: '#f472b6',
  category: 'advertise',

  apiPrefix: '/api/ab-testing',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/ab-testing'));
    return router;
  },
};

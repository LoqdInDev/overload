const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'ads',
  name: 'Paid Advertising',
  description: 'AI-powered campaign builder for all major ad platforms',
  icon: 'currency-dollar',
  color: '#10b981',
  category: 'advertise',

  apiPrefix: '/api/ads',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/ads'));
    return router;
  },
};

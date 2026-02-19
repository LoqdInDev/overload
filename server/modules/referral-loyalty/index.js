const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'referral-loyalty',
  name: 'Referral & Loyalty',
  description: 'Referral programs and customer loyalty management',
  icon: 'gift',
  color: '#f59e0b',
  category: 'marketing',

  apiPrefix: '/api/referral-loyalty',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

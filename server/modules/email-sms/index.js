const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'email-sms',
  name: 'Email & SMS',
  description: 'AI-powered email campaigns, SMS blasts, subject line optimization, and A/B variant generation',
  icon: 'envelope',
  color: '#f59e0b',
  category: 'create',

  apiPrefix: '/api/email-sms',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/email-sms'));
    return router;
  },
};

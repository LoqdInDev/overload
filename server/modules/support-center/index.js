const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'support-center',
  name: 'Support Center',
  description: 'Customer support ticket management with AI-assisted responses',
  icon: 'headset',
  color: '#0ea5e9',
  category: 'manage',

  apiPrefix: '/api/support-center',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

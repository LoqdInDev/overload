const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'calendar',
  name: 'Marketing Calendar',
  description: 'Campaign planning and scheduling across all modules',
  icon: 'calendar',
  color: '#0ea5e9',
  category: 'plan',

  apiPrefix: '/api/calendar',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();

    router.use('/', require('./routes/calendar'));

    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'scheduler',
  name: 'Scheduler',
  description: 'Schedule and automate recurring marketing tasks across all modules',
  icon: 'icon-clock',
  color: '#3b82f6',
  category: 'automate',
  apiPrefix: '/api/scheduler',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/scheduler'));
    return router;
  },
};

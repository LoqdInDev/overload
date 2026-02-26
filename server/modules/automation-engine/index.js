const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'automation-engine',
  name: 'Automation Engine',
  description: 'Core automation engine managing module modes, approval queue, and action execution',
  category: 'automate',
  apiPrefix: '/api/automation',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const express = require('express');
    const router = express.Router();
    router.use('/', require('./routes/modes'));
    router.use('/', require('./routes/approvals'));
    router.use('/', require('./routes/actions'));
    router.use('/', require('./routes/rules'));
    router.use('/', require('./routes/notifications'));
    router.use('/', require('./routes/settings'));
    router.use('/', require('./routes/activity-log'));
    router.use('/', require('./routes/insights'));
    return router;
  },
};

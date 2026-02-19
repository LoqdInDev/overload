const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'goal-tracker',
  name: 'Goal Tracker',
  description: 'Set, track, and manage business goals and milestones',
  icon: 'target',
  color: '#ef4444',
  category: 'analytics',

  apiPrefix: '/api/goal-tracker',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes'));
    return router;
  },
};

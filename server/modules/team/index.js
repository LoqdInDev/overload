const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'team',
  name: 'Team',
  description: 'Manage team members, roles, permissions, and invitations',
  icon: 'icon-team',
  color: '#64748b',
  category: 'settings',
  apiPrefix: '/api/team',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/team'));
    return router;
  },
};

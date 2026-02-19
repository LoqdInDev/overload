const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'autopilot',
  name: 'Autopilot',
  description: 'AI-driven autonomous marketing operations with configurable risk levels and approval workflows',
  icon: 'icon-autopilot',
  color: '#f59e0b',
  category: 'automate',
  apiPrefix: '/api/autopilot',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/autopilot'));
    return router;
  },
};

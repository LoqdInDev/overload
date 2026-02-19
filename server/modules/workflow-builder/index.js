const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'workflow-builder',
  name: 'Workflow Builder',
  description: 'Create and manage automated marketing workflows with triggers, steps, and conditional logic',
  icon: 'icon-workflow',
  color: '#8b5cf6',
  category: 'automate',
  apiPrefix: '/api/workflow-builder',
  initDatabase() { initDatabase(); },
  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/workflow-builder'));
    return router;
  },
};

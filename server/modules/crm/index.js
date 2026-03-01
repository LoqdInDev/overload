const express = require('express');
const { initDatabase } = require('./db/schema');
const { addSoftDeleteColumns } = require('../../middleware/softDelete');
const { db } = require('../../db/database');

module.exports = {
  id: 'crm',
  name: 'CRM',
  description: 'Customer relationship management with deal pipeline',
  icon: 'users',
  color: '#3b82f6',
  category: 'manage',

  apiPrefix: '/api/crm',

  initDatabase() {
    initDatabase();
    // Add soft delete columns to critical CRM tables
    addSoftDeleteColumns(db, 'crm_contacts');
    addSoftDeleteColumns(db, 'crm_deals');
  },

  getRouter() {
    const router = express.Router();
    router.use('/', require('./routes/crm'));
    return router;
  },
};

const express = require('express');
const { initDatabase } = require('./db/schema');

module.exports = {
  id: 'chatbot',
  name: 'Chatbot Builder',
  description: 'AI chatbot creation and conversation flow designer',
  icon: 'message-circle',
  color: '#0ea5e9',
  category: 'create',

  apiPrefix: '/api/chatbot',

  initDatabase() {
    initDatabase();
  },

  getRouter() {
    const router = express.Router();

    router.use('/', require('./routes/chatbot'));

    return router;
  },
};

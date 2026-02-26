const { initDatabase } = require('./db/schema');
const { getRouter } = require('./routes/onboarding');

module.exports = {
  id: 'onboarding',
  name: 'Onboarding',
  description: 'First-time user onboarding flow',
  apiPrefix: '/api/onboarding',
  initDatabase,
  getRouter,
};

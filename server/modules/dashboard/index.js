const { getRouter } = require('./routes/dashboard');

module.exports = {
  id: 'dashboard',
  name: 'Dashboard',
  description: 'Aggregated dashboard data from all modules',
  apiPrefix: '/api/dashboard',
  getRouter,
};

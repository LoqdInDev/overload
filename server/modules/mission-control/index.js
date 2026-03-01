const { getRouter } = require('./routes/mission-control');

module.exports = {
  id: 'mission-control',
  name: 'Mission Control',
  description: 'Owner-level platform monitoring dashboard',
  apiPrefix: '/api/mission-control',
  getRouter,
};

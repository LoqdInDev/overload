const { db } = require('../../../db/database');

const queries = {
  getAll: db.prepare('SELECT * FROM pa_campaigns ORDER BY created_at DESC'),
  getByPlatform: db.prepare('SELECT * FROM pa_campaigns WHERE platform = ? ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM pa_campaigns WHERE id = ?'),
  create: db.prepare('INSERT INTO pa_campaigns (id, platform, name, objective, budget, audience, ad_content, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE pa_campaigns SET name = ?, objective = ?, budget = ?, audience = ?, ad_content = ?, status = ?, metadata = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  delete: db.prepare('DELETE FROM pa_campaigns WHERE id = ?'),
};

module.exports = { queries };

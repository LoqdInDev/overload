const { db } = require('../../../db/database');

function getQueries(wsId) {
  return {
    getAll: async () => db.prepare('SELECT * FROM pa_campaigns WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId),
    getByPlatform: async (platform) => db.prepare('SELECT * FROM pa_campaigns WHERE platform = ? AND workspace_id = ? ORDER BY created_at DESC').all(platform, wsId),
    getById: async (id) => db.prepare('SELECT * FROM pa_campaigns WHERE id = ? AND workspace_id = ?').get(id, wsId),
    create: async (id, platform, name, objective, budget, audience, ad_content, metadata) => db.prepare(
      'INSERT INTO pa_campaigns (id, platform, name, objective, budget, audience, ad_content, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, platform, name, objective, budget, audience, ad_content, metadata, wsId),
    update: async (name, objective, budget, audience, ad_content, status, metadata, id) => db.prepare(
      "UPDATE pa_campaigns SET name = ?, objective = ?, budget = ?, audience = ?, ad_content = ?, status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?"
    ).run(name, objective, budget, audience, ad_content, status, metadata, id, wsId),
    delete: async (id) => db.prepare('DELETE FROM pa_campaigns WHERE id = ? AND workspace_id = ?').run(id, wsId),
  };
}

module.exports = { getQueries };

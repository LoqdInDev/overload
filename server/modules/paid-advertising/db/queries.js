const { db } = require('../../../db/database');

function getQueries(wsId) {
  return {
    getAll: () => db.prepare('SELECT * FROM pa_campaigns WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId),
    getByPlatform: (platform) => db.prepare('SELECT * FROM pa_campaigns WHERE platform = ? AND workspace_id = ? ORDER BY created_at DESC').all(platform, wsId),
    getById: (id) => db.prepare('SELECT * FROM pa_campaigns WHERE id = ? AND workspace_id = ?').get(id, wsId),
    create: (id, platform, name, objective, budget, audience, ad_content, metadata) => db.prepare(
      'INSERT INTO pa_campaigns (id, platform, name, objective, budget, audience, ad_content, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, platform, name, objective, budget, audience, ad_content, metadata, wsId),
    update: (name, objective, budget, audience, ad_content, status, metadata, id) => db.prepare(
      "UPDATE pa_campaigns SET name = ?, objective = ?, budget = ?, audience = ?, ad_content = ?, status = ?, metadata = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?"
    ).run(name, objective, budget, audience, ad_content, status, metadata, id, wsId),
    delete: (id) => db.prepare('DELETE FROM pa_campaigns WHERE id = ? AND workspace_id = ?').run(id, wsId),
  };
}

module.exports = { getQueries };

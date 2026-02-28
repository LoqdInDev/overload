const { db } = require('../../../db/database');

function getQueries(wsId) {
  return {
    getAll: () => db.prepare('SELECT * FROM cc_projects WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId),
    getByType: (type) => db.prepare('SELECT * FROM cc_projects WHERE workspace_id = ? AND type = ? ORDER BY created_at DESC').all(wsId, type),
    getById: (id) => db.prepare('SELECT * FROM cc_projects WHERE id = ? AND workspace_id = ?').get(id, wsId),
    create: (...args) => db.prepare('INSERT INTO cc_projects (id, type, title, prompt, content, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(...args, wsId),
    update: (title, content, metadata, id) => db.prepare("UPDATE cc_projects SET title = ?, content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?").run(title, content, metadata, id, wsId),
    delete: (id) => db.prepare('DELETE FROM cc_projects WHERE id = ? AND workspace_id = ?').run(id, wsId),
  };
}

module.exports = { getQueries };

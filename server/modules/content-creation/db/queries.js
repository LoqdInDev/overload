const { db } = require('../../../db/database');

const queries = {
  getAll: db.prepare('SELECT * FROM cc_projects ORDER BY created_at DESC'),
  getByType: db.prepare('SELECT * FROM cc_projects WHERE type = ? ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM cc_projects WHERE id = ?'),
  create: db.prepare('INSERT INTO cc_projects (id, type, title, prompt, content, metadata) VALUES (?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE cc_projects SET title = ?, content = ?, metadata = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  delete: db.prepare('DELETE FROM cc_projects WHERE id = ?'),
};

module.exports = { queries };

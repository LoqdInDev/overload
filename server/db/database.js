const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', '..', 'overload.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSharedTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      source_module TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      action TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      entity_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function logActivity(moduleId, action, title, detail, entityId) {
  db.prepare(
    'INSERT INTO activity_log (module_id, action, title, detail, entity_id) VALUES (?, ?, ?, ?, ?)'
  ).run(moduleId, action, title, detail || null, entityId || null);
}

function getRecentActivity(limit = 20) {
  return db.prepare(
    'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

module.exports = { db, initSharedTables, logActivity, getRecentActivity };

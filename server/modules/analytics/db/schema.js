const { db } = require('../../../db/database');

function initDatabase() {
  // Analytics uses the shared activity_log table primarily
  // Add a snapshots table for daily aggregation cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS an_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      date TEXT NOT NULL,
      module_id TEXT NOT NULL,
      action_count INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, module_id)
    );
  `);
}

module.exports = { initDatabase };

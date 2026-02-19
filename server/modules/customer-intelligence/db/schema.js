const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ci_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      criteria TEXT,
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ci_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER,
      type TEXT,
      title TEXT,
      description TEXT,
      confidence REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (segment_id) REFERENCES ci_segments(id)
    );
  `);
}

module.exports = { initDatabase };

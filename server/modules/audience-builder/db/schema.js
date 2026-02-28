const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ab_audiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      platform TEXT,
      type TEXT,
      size INTEGER,
      criteria TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ab_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      audience_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filters TEXT,
      size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (audience_id) REFERENCES ab_audiences(id)
    )
  `);
}

module.exports = { initDatabase };

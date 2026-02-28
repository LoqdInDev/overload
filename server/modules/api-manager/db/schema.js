const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      permissions TEXT,
      rate_limit INTEGER DEFAULT 100,
      usage_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      last_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      key_id INTEGER NOT NULL,
      endpoint TEXT,
      method TEXT,
      status_code INTEGER,
      response_time INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (key_id) REFERENCES api_keys(id)
    )
  `);
}

module.exports = { initDatabase };

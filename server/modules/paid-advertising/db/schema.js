const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pa_campaigns (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      objective TEXT,
      budget TEXT,
      audience TEXT,
      ad_content TEXT,
      status TEXT DEFAULT 'draft',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { initDatabase };

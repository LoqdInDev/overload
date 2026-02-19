const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sm_posts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      content TEXT,
      media_url TEXT,
      hashtags TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_at TEXT,
      published_at TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sm_accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT,
      connected INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sm_schedules (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES sm_posts(id)
    );
  `);
}

module.exports = { initDatabase };

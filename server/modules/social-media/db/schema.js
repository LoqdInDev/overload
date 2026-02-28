const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sm_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      platform TEXT NOT NULL,
      post_type TEXT DEFAULT 'feed',
      caption TEXT,
      hashtags TEXT,
      media_url TEXT,
      media_notes TEXT,
      best_time TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_at TEXT,
      published_at TEXT,
      external_post_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sm_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      provider_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_id TEXT,
      username TEXT,
      display_name TEXT,
      avatar_url TEXT,
      followers INTEGER DEFAULT 0,
      connected INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sm_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      title TEXT,
      platform TEXT,
      post_type TEXT,
      content_summary TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      status TEXT DEFAULT 'planned',
      post_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES sm_posts(id)
    )
  `);

  // Add missing columns if upgrading from old schema
  const cols = db.prepare("PRAGMA table_info(sm_posts)").all().map(c => c.name);
  if (!cols.includes('post_type')) db.exec("ALTER TABLE sm_posts ADD COLUMN post_type TEXT DEFAULT 'feed'");
  if (!cols.includes('caption')) db.exec("ALTER TABLE sm_posts ADD COLUMN caption TEXT");
  if (!cols.includes('media_notes')) db.exec("ALTER TABLE sm_posts ADD COLUMN media_notes TEXT");
  if (!cols.includes('best_time')) db.exec("ALTER TABLE sm_posts ADD COLUMN best_time TEXT");
  if (!cols.includes('external_post_id')) db.exec("ALTER TABLE sm_posts ADD COLUMN external_post_id TEXT");

  const acctCols = db.prepare("PRAGMA table_info(sm_accounts)").all().map(c => c.name);
  if (!acctCols.includes('provider_id')) db.exec("ALTER TABLE sm_accounts ADD COLUMN provider_id TEXT");
  if (!acctCols.includes('avatar_url')) db.exec("ALTER TABLE sm_accounts ADD COLUMN avatar_url TEXT");
  if (!acctCols.includes('followers')) db.exec("ALTER TABLE sm_accounts ADD COLUMN followers INTEGER DEFAULT 0");
  if (!acctCols.includes('account_id')) db.exec("ALTER TABLE sm_accounts ADD COLUMN account_id TEXT");
}

module.exports = { initDatabase };

const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sm_posts (
      id SERIAL PRIMARY KEY,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sm_accounts (
      id SERIAL PRIMARY KEY,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sm_calendar (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      title TEXT,
      platform TEXT,
      post_type TEXT,
      content_summary TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      status TEXT DEFAULT 'planned',
      post_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES sm_posts(id)
    )
  `);

  // Add missing columns if upgrading from old schema
  await db.exec("ALTER TABLE sm_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'feed'");
  await db.exec("ALTER TABLE sm_posts ADD COLUMN IF NOT EXISTS caption TEXT");
  await db.exec("ALTER TABLE sm_posts ADD COLUMN IF NOT EXISTS media_notes TEXT");
  await db.exec("ALTER TABLE sm_posts ADD COLUMN IF NOT EXISTS best_time TEXT");
  await db.exec("ALTER TABLE sm_posts ADD COLUMN IF NOT EXISTS external_post_id TEXT");

  await db.exec("ALTER TABLE sm_accounts ADD COLUMN IF NOT EXISTS provider_id TEXT");
  await db.exec("ALTER TABLE sm_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT");
  await db.exec("ALTER TABLE sm_accounts ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0");
  await db.exec("ALTER TABLE sm_accounts ADD COLUMN IF NOT EXISTS account_id TEXT");
}

module.exports = { initDatabase };

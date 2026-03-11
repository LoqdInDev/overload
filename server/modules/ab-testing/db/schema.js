const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS abt_tests (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      type TEXT,
      status TEXT DEFAULT 'draft',
      variants TEXT,
      winner_variant TEXT,
      start_date TEXT,
      end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS abt_variants (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      test_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      content TEXT,
      impressions INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      click_rate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES abt_tests(id)
    )
  `);

  try { await db.exec('ALTER TABLE abt_tests ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
}

module.exports = { initDatabase };

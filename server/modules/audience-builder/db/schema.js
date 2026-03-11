const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ab_audiences (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      platform TEXT,
      type TEXT,
      size INTEGER,
      criteria TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ab_segments (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      audience_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filters TEXT,
      size INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (audience_id) REFERENCES ab_audiences(id)
    )
  `);
}

module.exports = { initDatabase };

const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      permissions TEXT,
      rate_limit INTEGER DEFAULT 100,
      usage_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      last_used TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      key_id INTEGER NOT NULL,
      endpoint TEXT,
      method TEXT,
      status_code INTEGER,
      response_time INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (key_id) REFERENCES api_keys(id)
    )
  `);
}

module.exports = { initDatabase };

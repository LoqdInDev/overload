const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wh_webhooks (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT,
      secret TEXT,
      status TEXT DEFAULT 'active',
      last_triggered TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wh_webhook_logs (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      webhook_id INTEGER NOT NULL,
      event TEXT,
      payload TEXT,
      response_status INTEGER,
      response_body TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES wh_webhooks(id)
    )
  `);
}

module.exports = { initDatabase };

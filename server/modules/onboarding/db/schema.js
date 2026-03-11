const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_state (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      user_id TEXT,
      completed INTEGER DEFAULT 0,
      dismissed INTEGER DEFAULT 0,
      current_step INTEGER DEFAULT 0,
      brand_done INTEGER DEFAULT 0,
      integration_done INTEGER DEFAULT 0,
      first_content_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { initDatabase };

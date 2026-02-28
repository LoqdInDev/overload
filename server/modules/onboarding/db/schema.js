const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      user_id TEXT,
      completed INTEGER DEFAULT 0,
      dismissed INTEGER DEFAULT 0,
      current_step INTEGER DEFAULT 0,
      brand_done INTEGER DEFAULT 0,
      integration_done INTEGER DEFAULT 0,
      first_content_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

module.exports = { initDatabase };

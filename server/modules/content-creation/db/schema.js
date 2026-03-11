const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cc_projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT,
      content TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { initDatabase };

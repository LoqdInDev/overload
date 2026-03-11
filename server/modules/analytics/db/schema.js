const { db } = require('../../../db/database');

async function initDatabase() {
  // Analytics uses the shared activity_log table primarily
  // Add a snapshots table for daily aggregation cache
  await db.exec(`
    CREATE TABLE IF NOT EXISTS an_snapshots (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      date TEXT NOT NULL,
      module_id TEXT NOT NULL,
      action_count INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, module_id)
    );
  `);
}

module.exports = { initDatabase };

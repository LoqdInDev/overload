const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ci_segments (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      criteria TEXT,
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ci_insights (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      segment_id INTEGER,
      type TEXT,
      title TEXT,
      description TEXT,
      confidence REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES ci_segments(id)
    );
  `);
}

module.exports = { initDatabase };

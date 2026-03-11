const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ci_competitors (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      website TEXT,
      industry TEXT,
      description TEXT,
      strengths TEXT,
      weaknesses TEXT,
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ci_reports (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      competitor_id INTEGER,
      type TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      raw_response TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competitor_id) REFERENCES ci_competitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ci_alerts (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      competitor_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competitor_id) REFERENCES ci_competitors(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

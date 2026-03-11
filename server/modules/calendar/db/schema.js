const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS mc_events (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      module_id TEXT,
      date TEXT NOT NULL,
      end_date TEXT,
      color TEXT,
      recurrence TEXT DEFAULT NULL,
      status TEXT DEFAULT 'planned',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mc_campaigns (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      modules TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add recurrence column if missing
  await db.exec("ALTER TABLE mc_events ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT NULL");
}

module.exports = { initDatabase };

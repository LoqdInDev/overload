const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mc_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      module_id TEXT,
      date TEXT NOT NULL,
      end_date TEXT,
      color TEXT,
      recurrence TEXT DEFAULT NULL,
      status TEXT DEFAULT 'planned',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mc_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      modules TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: add recurrence column if missing
  try {
    const cols = db.prepare("PRAGMA table_info(mc_events)").all();
    if (!cols.find(c => c.name === 'recurrence')) {
      db.exec("ALTER TABLE mc_events ADD COLUMN recurrence TEXT DEFAULT NULL");
    }
  } catch (e) { /* table may not exist yet */ }
}

module.exports = { initDatabase };

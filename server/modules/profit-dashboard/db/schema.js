const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pd_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      revenue REAL DEFAULT 0,
      ad_spend REAL DEFAULT 0,
      cogs REAL DEFAULT 0,
      other_costs REAL DEFAULT 0,
      platform TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pd_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric TEXT NOT NULL,
      target_value REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      period TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { initDatabase };

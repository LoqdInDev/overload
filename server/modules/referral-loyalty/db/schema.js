const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rl_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      type TEXT,
      reward_type TEXT,
      reward_value TEXT,
      rules TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rl_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      program_id INTEGER,
      customer_name TEXT,
      email TEXT,
      referrals INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      tier TEXT,
      joined_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (program_id) REFERENCES rl_programs(id)
    );
  `);
}

module.exports = { initDatabase };

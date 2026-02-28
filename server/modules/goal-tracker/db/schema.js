const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gt_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      metric TEXT,
      target_value REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      deadline TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gt_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      goal_id INTEGER,
      value REAL,
      label TEXT,
      reached_at TEXT,
      FOREIGN KEY (goal_id) REFERENCES gt_goals(id)
    );
  `);
}

module.exports = { initDatabase };

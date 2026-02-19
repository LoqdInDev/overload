const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS sc_scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    module TEXT,
    action TEXT,
    config TEXT,
    schedule_type TEXT,
    schedule_value TEXT,
    next_run TEXT,
    last_run TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS sc_task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    status TEXT,
    output TEXT,
    executed_at TEXT
  )`);
}

module.exports = { initDatabase };

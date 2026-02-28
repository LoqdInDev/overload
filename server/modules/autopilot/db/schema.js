const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS ap_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    brand_id INTEGER,
    modules_enabled TEXT,
    strategy TEXT,
    risk_level TEXT DEFAULT 'conservative',
    status TEXT DEFAULT 'inactive',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS ap_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    config_id INTEGER,
    module TEXT,
    action_type TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    executed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS ap_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    config_id INTEGER,
    type TEXT,
    title TEXT,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

module.exports = { initDatabase };

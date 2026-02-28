const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS tm_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'member',
    permissions TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    last_active TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS tm_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    email TEXT,
    role TEXT,
    invited_by INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

module.exports = { initDatabase };

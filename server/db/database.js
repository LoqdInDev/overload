const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'overload.db');

// Ensure directory exists (for Railway volume mount)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSharedTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      source_module TEXT,
      workspace_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      action TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      entity_id TEXT,
      workspace_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(workspace_id, user_id)
    );
  `);

  // Auto-create default workspace for existing users who don't have one
  ensureDefaultWorkspaces();
}

function ensureDefaultWorkspaces() {
  const hasUsers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!hasUsers) return;

  const users = db.prepare('SELECT id, display_name, email FROM users').all();
  for (const user of users) {
    const hasMembership = db.prepare(
      'SELECT 1 FROM workspace_members WHERE user_id = ?'
    ).get(user.id);

    if (!hasMembership) {
      const wsId = crypto.randomUUID();
      const name = 'My Workspace';
      const slug = 'my-workspace-' + user.id.slice(0, 8);

      db.prepare(
        'INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)'
      ).run(wsId, name, slug, user.id);

      db.prepare(
        'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)'
      ).run(crypto.randomUUID(), wsId, user.id, 'owner');
    }
  }
}

function getDefaultWorkspaceId() {
  const ws = db.prepare('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1').get();
  return ws ? ws.id : null;
}

function logActivity(moduleId, action, title, detail, entityId, workspaceId) {
  db.prepare(
    'INSERT INTO activity_log (module_id, action, title, detail, entity_id, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(moduleId, action, title, detail || null, entityId || null, workspaceId || null);
}

function getRecentActivity(limit = 20, workspaceId) {
  if (workspaceId) {
    return db.prepare(
      'SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(workspaceId, limit);
  }
  return db.prepare(
    'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

module.exports = { db, initSharedTables, logActivity, getRecentActivity, getDefaultWorkspaceId };

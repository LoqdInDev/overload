const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`CREATE TABLE IF NOT EXISTS tm_members (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'member',
    permissions TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    last_active TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS tm_invites (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    email TEXT,
    role TEXT,
    invited_by INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { initDatabase };

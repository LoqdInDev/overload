const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS es_campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'email',
      subject TEXT,
      content TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_at TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS es_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'email',
      subject TEXT,
      body TEXT,
      category TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS es_contacts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      email TEXT,
      phone TEXT,
      name TEXT,
      tags TEXT,
      subscribed INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { initDatabase };

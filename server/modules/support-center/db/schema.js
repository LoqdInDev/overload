const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sc_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      subject TEXT NOT NULL,
      description TEXT,
      customer_email TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      ai_response TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sc_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { initDatabase };

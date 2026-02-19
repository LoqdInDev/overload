const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cb_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      personality TEXT,
      knowledge_base TEXT,
      welcome_message TEXT,
      channels TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cb_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      trigger TEXT,
      steps TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bot_id) REFERENCES cb_bots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cb_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      messages TEXT DEFAULT '[]',
      rating INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bot_id) REFERENCES cb_bots(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

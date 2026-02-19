const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pp_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'draft',
      target_date TEXT,
      distribution_list TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pp_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      outlet TEXT,
      email TEXT,
      beat TEXT,
      relationship TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { initDatabase };

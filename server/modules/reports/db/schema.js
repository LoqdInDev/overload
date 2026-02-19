const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cr_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_name TEXT,
      date_range TEXT,
      modules TEXT DEFAULT '[]',
      content TEXT DEFAULT '{}',
      template TEXT,
      branding TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cr_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      layout TEXT DEFAULT '{}',
      sections TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cr_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'quarterly')),
      next_run TEXT,
      recipients TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES cr_reports(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

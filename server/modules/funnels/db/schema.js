const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fn_funnels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'sales',
      description TEXT,
      status TEXT DEFAULT 'draft',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fn_pages (
      id TEXT PRIMARY KEY,
      funnel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'landing',
      content TEXT,
      position INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (funnel_id) REFERENCES fn_funnels(id)
    );

    CREATE TABLE IF NOT EXISTS fn_conversions (
      id TEXT PRIMARY KEY,
      funnel_id TEXT NOT NULL,
      page_id TEXT,
      event TEXT NOT NULL,
      value REAL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (funnel_id) REFERENCES fn_funnels(id),
      FOREIGN KEY (page_id) REFERENCES fn_pages(id)
    );
  `);
}

module.exports = { initDatabase };

const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wb_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      domain TEXT,
      template TEXT,
      pages TEXT,
      settings TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wb_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      site_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT,
      content TEXT,
      seo_title TEXT,
      seo_desc TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES wb_sites(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cd_projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cd_images (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_id TEXT NOT NULL,
      url TEXT,
      alt TEXT,
      provider TEXT,
      status TEXT DEFAULT 'pending',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES cd_projects(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

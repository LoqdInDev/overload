const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS seo_projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      url TEXT,
      description TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seo_keywords (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_id TEXT,
      keyword TEXT NOT NULL,
      volume INTEGER,
      difficulty INTEGER,
      intent TEXT,
      suggestions TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES seo_projects(id)
    );

    CREATE TABLE IF NOT EXISTS seo_audits (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_id TEXT,
      url TEXT NOT NULL,
      score INTEGER,
      issues TEXT,
      recommendations TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES seo_projects(id)
    );
  `);
}

module.exports = { initDatabase };

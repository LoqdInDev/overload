const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      title TEXT NOT NULL,
      slug TEXT,
      content TEXT,
      category TEXT,
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      helpful_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // FTS5 full-text search virtual table
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
      title,
      content,
      category,
      content='kb_articles',
      content_rowid='id'
    );
  `);

  // Sync FTS index with existing articles
  try {
    db.exec(`INSERT INTO kb_fts(kb_fts) VALUES('rebuild')`);
  } catch {}

  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS kb_articles_ai AFTER INSERT ON kb_articles BEGIN
        INSERT INTO kb_fts(rowid, title, content, category) VALUES (new.id, new.title, new.content, new.category);
      END;
      CREATE TRIGGER IF NOT EXISTS kb_articles_ad AFTER DELETE ON kb_articles BEGIN
        INSERT INTO kb_fts(kb_fts, rowid, title, content, category) VALUES('delete', old.id, old.title, old.content, old.category);
      END;
      CREATE TRIGGER IF NOT EXISTS kb_articles_au AFTER UPDATE ON kb_articles BEGIN
        INSERT INTO kb_fts(kb_fts, rowid, title, content, category) VALUES('delete', old.id, old.title, old.content, old.category);
        INSERT INTO kb_fts(rowid, title, content, category) VALUES (new.id, new.title, new.content, new.category);
      END;
    `);
  } catch {}
}

module.exports = { initDatabase };

const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rv_reviews (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      source TEXT NOT NULL,
      author TEXT,
      rating INTEGER,
      content TEXT,
      sentiment TEXT,
      sentiment_score REAL,
      response TEXT,
      status TEXT DEFAULT 'new',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rv_responses (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      review_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      sent_at TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (review_id) REFERENCES rv_reviews(id)
    );

    CREATE TABLE IF NOT EXISTS rv_sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      api_key TEXT,
      active INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rv_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      star_rating INTEGER,
      tone TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rv_generated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      tool_type TEXT,
      input_data TEXT,
      output TEXT,
      platform TEXT,
      tone TEXT,
      rating INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try { db.exec("ALTER TABLE rv_reviews ADD COLUMN response TEXT"); } catch {}
  try { db.exec("ALTER TABLE rv_reviews ADD COLUMN status TEXT DEFAULT 'new'"); } catch {}
}

module.exports = { initDatabase };

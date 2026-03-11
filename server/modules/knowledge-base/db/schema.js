const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS kb_articles (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      title TEXT NOT NULL,
      slug TEXT,
      content TEXT,
      category TEXT,
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      helpful_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kb_categories (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // PostgreSQL full-text search index (GIN on tsvector)
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_kb_articles_search
      ON kb_articles USING gin(to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(content,'')));
    `);
  } catch {}
}

module.exports = { initDatabase };

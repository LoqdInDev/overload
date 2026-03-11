const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fn_funnels (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'sales',
      description TEXT,
      status TEXT DEFAULT 'draft',
      stages TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fn_pages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      funnel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'landing',
      content TEXT,
      position INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (funnel_id) REFERENCES fn_funnels(id)
    );

    CREATE TABLE IF NOT EXISTS fn_conversions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      funnel_id TEXT NOT NULL,
      page_id TEXT,
      event TEXT NOT NULL,
      value REAL,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (funnel_id) REFERENCES fn_funnels(id),
      FOREIGN KEY (page_id) REFERENCES fn_pages(id)
    );
  `);

  // Safe migrations for existing DBs
  const funnelCols = ['stages TEXT', 'product TEXT', 'audience TEXT', 'industry TEXT'];
  for (const col of funnelCols) {
    try { await db.exec(`ALTER TABLE fn_funnels ADD COLUMN ${col}`); } catch {}
  }
  const pageCols = ['stage_name TEXT', 'generated_content TEXT'];
  for (const col of pageCols) {
    try { await db.exec(`ALTER TABLE fn_pages ADD COLUMN ${col}`); } catch {}
  }
}

module.exports = { initDatabase };

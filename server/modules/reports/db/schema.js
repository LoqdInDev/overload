const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cr_reports (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      client_name TEXT,
      date_range TEXT,
      modules TEXT DEFAULT '[]',
      content TEXT DEFAULT '{}',
      template TEXT,
      branding TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cr_templates (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      layout TEXT DEFAULT '{}',
      sections TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cr_schedules (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      report_id INTEGER NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'quarterly')),
      next_run TEXT,
      recipients TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES cr_reports(id) ON DELETE CASCADE
    );
  `);

  try { await db.exec("ALTER TABLE cr_reports ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP"); } catch {}
}

module.exports = { initDatabase };

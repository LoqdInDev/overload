const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pp_releases (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'draft',
      target_date TEXT,
      distribution_list TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pp_contacts (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      outlet TEXT,
      email TEXT,
      beat TEXT,
      relationship TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for existing DBs
  const contactCols = ['ai_score INTEGER', 'ai_tier TEXT', 'ai_pitch_angle TEXT', 'ai_best_time TEXT', 'ai_warning TEXT'];
  for (const col of contactCols) {
    try { await db.exec(`ALTER TABLE pp_contacts ADD COLUMN ${col}`); } catch {}
  }
}

module.exports = { initDatabase };

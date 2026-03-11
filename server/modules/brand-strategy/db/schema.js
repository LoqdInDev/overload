const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bs_brands (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      industry TEXT,
      description TEXT,
      voice_tone TEXT,
      "values" TEXT,
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bs_guidelines (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      brand_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      raw_response TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES bs_brands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bs_personas (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      brand_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      demographics TEXT,
      psychographics TEXT,
      pain_points TEXT,
      goals TEXT,
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES bs_brands(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

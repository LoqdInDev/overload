const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`CREATE TABLE IF NOT EXISTS bp_profiles (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    brand_name TEXT,
    tagline TEXT,
    mission TEXT,
    vision TEXT,
    "values" TEXT,
    voice_tone TEXT,
    voice_personality TEXT,
    target_audience TEXT,
    competitors TEXT,
    colors TEXT,
    fonts TEXT,
    logo_url TEXT,
    guidelines TEXT,
    keywords TEXT,
    industry TEXT,
    website TEXT,
    social_links TEXT,
    words_to_use TEXT,
    words_to_avoid TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Media assets table
  await db.exec(`CREATE TABLE IF NOT EXISTS bp_media (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    mimetype TEXT,
    size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration for existing databases
  try { await db.exec('ALTER TABLE bp_profiles ADD COLUMN words_to_use TEXT'); } catch (e) { /* already exists */ }
  try { await db.exec('ALTER TABLE bp_profiles ADD COLUMN words_to_avoid TEXT'); } catch (e) { /* already exists */ }
}

module.exports = { initDatabase };

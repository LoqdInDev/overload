const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS bp_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Migration for existing databases
  try { db.exec('ALTER TABLE bp_profiles ADD COLUMN words_to_use TEXT'); } catch (e) { /* already exists */ }
  try { db.exec('ALTER TABLE bp_profiles ADD COLUMN words_to_avoid TEXT'); } catch (e) { /* already exists */ }
}

module.exports = { initDatabase };

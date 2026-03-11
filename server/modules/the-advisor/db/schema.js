const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS adv_briefings (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      date TEXT UNIQUE,
      yesterday_summary TEXT,
      today_recommendations TEXT,
      weekly_snapshot TEXT,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS adv_actions (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      briefing_id INTEGER,
      priority TEXT,
      title TEXT,
      description TEXT,
      module TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (briefing_id) REFERENCES adv_briefings(id)
    );
  `);
}

module.exports = { initDatabase };

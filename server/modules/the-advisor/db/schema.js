const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS adv_briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE,
      yesterday_summary TEXT,
      today_recommendations TEXT,
      weekly_snapshot TEXT,
      generated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS adv_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      briefing_id INTEGER,
      priority TEXT,
      title TEXT,
      description TEXT,
      module TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (briefing_id) REFERENCES adv_briefings(id)
    );
  `);
}

module.exports = { initDatabase };

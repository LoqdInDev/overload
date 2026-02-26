const { db } = require('../../../db/database');

const AUTOMATABLE_MODULES = [
  'content', 'video-marketing', 'creative', 'email-sms', 'social',
  'ads', 'seo', 'pr-press', 'influencers', 'reviews', 'customer-ai', 'reports'
];

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_module_modes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL UNIQUE,
      mode TEXT NOT NULL DEFAULT 'manual',
      config TEXT,
      risk_level TEXT DEFAULT 'conservative',
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_approval_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      payload TEXT NOT NULL,
      ai_confidence REAL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      review_notes TEXT,
      source TEXT,
      expires_at TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      mode TEXT NOT NULL,
      description TEXT,
      input_data TEXT,
      output_data TEXT,
      status TEXT NOT NULL,
      error TEXT,
      approval_id INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_config TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_config TEXT,
      requires_approval INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      last_triggered TEXT,
      run_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed default mode rows for all automatable modules
  const insert = db.prepare(
    'INSERT OR IGNORE INTO ae_module_modes (module_id, mode) VALUES (?, ?)'
  );
  for (const moduleId of AUTOMATABLE_MODULES) {
    insert.run(moduleId, 'manual');
  }
}

module.exports = { initDatabase, AUTOMATABLE_MODULES };

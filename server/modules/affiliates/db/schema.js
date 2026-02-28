const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS af_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      commission_type TEXT DEFAULT 'percentage' CHECK(commission_type IN ('percentage', 'flat')),
      commission_value REAL DEFAULT 10,
      cookie_days INTEGER DEFAULT 30,
      terms TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'closed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS af_affiliates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      program_id INTEGER,
      name TEXT NOT NULL,
      email TEXT,
      tracking_code TEXT UNIQUE,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending', 'suspended')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (program_id) REFERENCES af_programs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS af_payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      affiliate_id INTEGER,
      amount REAL DEFAULT 0,
      period TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (affiliate_id) REFERENCES af_affiliates(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

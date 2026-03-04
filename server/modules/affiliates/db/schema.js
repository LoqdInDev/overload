const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS af_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      commission_type TEXT DEFAULT 'percentage' CHECK(commission_type IN ('percentage', 'flat')),
      commission_rate REAL DEFAULT 10,
      cookie_duration INTEGER DEFAULT 30,
      terms TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'closed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS af_affiliates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      program_id INTEGER,
      name TEXT NOT NULL,
      email TEXT,
      website TEXT,
      affiliate_code TEXT UNIQUE,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending', 'suspended')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (program_id) REFERENCES af_programs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS af_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      affiliate_id INTEGER,
      program_id INTEGER,
      order_id TEXT,
      sale_amount REAL DEFAULT 0,
      commission_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'paid', 'rejected')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (affiliate_id) REFERENCES af_affiliates(id) ON DELETE CASCADE,
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

  // Migrations for existing databases
  const programMigrations = [
    "ALTER TABLE af_programs RENAME COLUMN commission_value TO commission_rate",
    "ALTER TABLE af_programs RENAME COLUMN cookie_days TO cookie_duration",
    "ALTER TABLE af_programs ADD COLUMN description TEXT",
    "ALTER TABLE af_programs ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))",
  ];
  for (const sql of programMigrations) {
    try { db.exec(sql); } catch {}
  }

  const affiliateMigrations = [
    "ALTER TABLE af_affiliates RENAME COLUMN tracking_code TO affiliate_code",
    "ALTER TABLE af_affiliates ADD COLUMN website TEXT",
    "ALTER TABLE af_affiliates ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))",
  ];
  for (const sql of affiliateMigrations) {
    try { db.exec(sql); } catch {}
  }
}

module.exports = { initDatabase };

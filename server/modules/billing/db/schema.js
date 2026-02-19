const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS bl_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    billing_cycle TEXT DEFAULT 'monthly',
    amount REAL DEFAULT 0,
    next_billing TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS bl_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'paid',
    period_start TEXT,
    period_end TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS bl_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT,
    action TEXT,
    count INTEGER DEFAULT 0,
    date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

module.exports = { initDatabase };

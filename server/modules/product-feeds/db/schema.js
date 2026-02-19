const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pf_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      format TEXT DEFAULT 'csv' CHECK(format IN ('csv', 'xml', 'json')),
      product_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      last_sync TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pf_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL,
      sale_price REAL,
      image_url TEXT,
      category TEXT,
      brand TEXT,
      sku TEXT,
      availability TEXT DEFAULT 'in_stock',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (feed_id) REFERENCES pf_feeds(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pf_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER NOT NULL,
      field TEXT NOT NULL,
      rule_type TEXT NOT NULL CHECK(rule_type IN ('replace', 'prefix', 'suffix', 'remove')),
      value TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (feed_id) REFERENCES pf_feeds(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initDatabase };

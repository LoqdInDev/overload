const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS eh_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT,
      store_name TEXT NOT NULL,
      store_url TEXT,
      api_key TEXT,
      status TEXT DEFAULT 'connected',
      last_sync TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eh_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER,
      order_number TEXT,
      customer TEXT,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      platform TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES eh_stores(id)
    );

    CREATE TABLE IF NOT EXISTS eh_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER,
      name TEXT NOT NULL,
      sku TEXT,
      price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES eh_stores(id)
    );
  `);
}

module.exports = { initDatabase };

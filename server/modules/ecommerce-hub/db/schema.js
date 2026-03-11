const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS eh_stores (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      platform TEXT,
      store_name TEXT NOT NULL,
      store_url TEXT,
      api_key TEXT,
      status TEXT DEFAULT 'connected',
      last_sync TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS eh_orders (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      store_id INTEGER,
      order_number TEXT,
      customer TEXT,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      platform TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES eh_stores(id)
    );

    CREATE TABLE IF NOT EXISTS eh_products (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      store_id INTEGER,
      name TEXT NOT NULL,
      sku TEXT,
      price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES eh_stores(id)
    );
  `);
}

module.exports = { initDatabase };

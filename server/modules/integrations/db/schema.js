const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS int_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      provider_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      status TEXT DEFAULT 'disconnected',
      access_token_enc TEXT,
      refresh_token_enc TEXT,
      token_expires_at INTEGER,
      token_scope TEXT,
      credentials_enc TEXT,
      account_name TEXT,
      account_id TEXT,
      config TEXT,
      last_sync TEXT,
      error_message TEXT,
      connected_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS int_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      connection_id INTEGER NOT NULL,
      provider_id TEXT NOT NULL,
      action TEXT,
      status TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (connection_id) REFERENCES int_connections(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS int_oauth_states (
      state TEXT PRIMARY KEY,
      workspace_id TEXT,
      provider_id TEXT NOT NULL,
      extra_params TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { initDatabase };

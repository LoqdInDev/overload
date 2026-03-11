const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cm_clients (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cm_projects (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      client_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      modules TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES cm_clients(id)
    );
  `);
}

module.exports = { initDatabase };

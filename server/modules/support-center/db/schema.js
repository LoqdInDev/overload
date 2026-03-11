const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sc_tickets (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      subject TEXT NOT NULL,
      description TEXT,
      customer_email TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      ai_response TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sc_templates (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { initDatabase };

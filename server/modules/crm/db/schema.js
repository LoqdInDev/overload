const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      title TEXT,
      source TEXT,
      tags TEXT,
      notes TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crm_deals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      contact_id TEXT,
      name TEXT NOT NULL,
      value REAL DEFAULT 0,
      stage TEXT DEFAULT 'lead',
      probability INTEGER DEFAULT 0,
      expected_close TEXT,
      notes TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES crm_contacts(id)
    );

    CREATE TABLE IF NOT EXISTS crm_activities (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      contact_id TEXT,
      deal_id TEXT,
      type TEXT NOT NULL,
      description TEXT,
      scheduled_at TEXT,
      completed_at TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
      FOREIGN KEY (deal_id) REFERENCES crm_deals(id)
    );

    CREATE TABLE IF NOT EXISTS crm_segments (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      rules TEXT,
      color TEXT,
      count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations: add columns if they don't already exist
  await db.exec("ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lead'");
  await db.exec("ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL");
  await db.exec("ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0");
  await db.exec("ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT NULL");

  await db.exec("ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL");
  await db.exec("ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS pipeline TEXT DEFAULT 'default'");

  // Migration: rename title to name in crm_deals if title exists but name does not
  try {
    const hasTitle = await db.prepare("SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2").get('crm_deals', 'title');
    const hasName = await db.prepare("SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2").get('crm_deals', 'name');
    if (hasTitle && !hasName) {
      await db.exec('ALTER TABLE crm_deals RENAME COLUMN title TO name');
    }
  } catch (e) { /* column rename may already be done */ }

  await db.exec("ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS title TEXT DEFAULT NULL");
}

module.exports = { initDatabase };

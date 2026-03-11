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

  // Migration: add status column to crm_contacts if missing
  try {
    const contactCols = db.prepare('PRAGMA table_info(crm_contacts)').all();
    if (!contactCols.find(c => c.name === 'status')) {
      await db.exec("ALTER TABLE crm_contacts ADD COLUMN status TEXT DEFAULT 'lead'");
    }
  } catch (e) { /* column may already exist */ }

  // Migration: add deleted_at column to crm_contacts if missing
  try {
    const contactCols = db.prepare('PRAGMA table_info(crm_contacts)').all();
    if (!contactCols.find(c => c.name === 'deleted_at')) {
      await db.exec('ALTER TABLE crm_contacts ADD COLUMN deleted_at TEXT DEFAULT NULL');
    }
  } catch (e) { /* column may already exist */ }

  // Migration: add deleted_at column to crm_deals if missing
  try {
    const dealCols = db.prepare('PRAGMA table_info(crm_deals)').all();
    if (!dealCols.find(c => c.name === 'deleted_at')) {
      await db.exec('ALTER TABLE crm_deals ADD COLUMN deleted_at TEXT DEFAULT NULL');
    }
  } catch (e) { /* column may already exist */ }

  // Migration: rename title to name in crm_deals if title exists but name does not
  try {
    const dealCols = db.prepare('PRAGMA table_info(crm_deals)').all();
    const hasTitle = dealCols.find(c => c.name === 'title');
    const hasName = dealCols.find(c => c.name === 'name');
    if (hasTitle && !hasName) {
      await db.exec('ALTER TABLE crm_deals RENAME COLUMN title TO name');
    }
  } catch (e) { /* column rename may not be supported or already done */ }

  // Migration: add pipeline column to crm_deals if missing
  try {
    const dealCols = db.prepare('PRAGMA table_info(crm_deals)').all();
    if (!dealCols.find(c => c.name === 'pipeline')) {
      await db.exec("ALTER TABLE crm_deals ADD COLUMN pipeline TEXT DEFAULT 'default'");
    }
  } catch (e) { /* column may already exist */ }

  // Migration: add score column to crm_contacts if missing
  try {
    const contactCols = db.prepare('PRAGMA table_info(crm_contacts)').all();
    if (!contactCols.find(c => c.name === 'score')) {
      await db.exec('ALTER TABLE crm_contacts ADD COLUMN score INTEGER DEFAULT 0');
    }
  } catch (e) { /* column may already exist */ }

  // Migration: add segment column to crm_contacts if missing
  try {
    const contactCols = db.prepare('PRAGMA table_info(crm_contacts)').all();
    if (!contactCols.find(c => c.name === 'segment')) {
      await db.exec('ALTER TABLE crm_contacts ADD COLUMN segment TEXT DEFAULT NULL');
    }
  } catch (e) { /* column may already exist */ }

  // Migration: add title column to crm_activities if missing
  try {
    const activityCols = db.prepare('PRAGMA table_info(crm_activities)').all();
    if (!activityCols.find(c => c.name === 'title')) {
      await db.exec('ALTER TABLE crm_activities ADD COLUMN title TEXT DEFAULT NULL');
    }
  } catch (e) { /* column may already exist */ }
}

module.exports = { initDatabase };

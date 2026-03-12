const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inf_influencers (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT,
      followers INTEGER DEFAULT 0,
      niche TEXT,
      engagement_rate REAL,
      contact_email TEXT,
      notes TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inf_campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      influencers TEXT,
      budget REAL,
      status TEXT DEFAULT 'draft',
      start_date TEXT,
      end_date TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inf_searches (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      niche TEXT,
      platform TEXT,
      criteria TEXT,
      results TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inf_outreach (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      influencer_id TEXT NOT NULL,
      campaign_id TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      responded_at TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (influencer_id) REFERENCES inf_influencers(id),
      FOREIGN KEY (campaign_id) REFERENCES inf_campaigns(id)
    );
  `);
}

module.exports = { initDatabase };

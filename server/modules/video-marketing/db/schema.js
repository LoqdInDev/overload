const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vm_campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      product_name TEXT NOT NULL,
      product_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vm_generations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      campaign_id TEXT NOT NULL,
      stage TEXT NOT NULL CHECK(stage IN ('angles', 'scripts', 'hooks', 'storyboard', 'ugc', 'iteration')),
      output TEXT NOT NULL,
      raw_response TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES vm_campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vm_favorites (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      campaign_id TEXT NOT NULL,
      generation_id TEXT NOT NULL,
      item_index INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES vm_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (generation_id) REFERENCES vm_generations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vm_video_jobs (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      campaign_id TEXT,
      scene_number INTEGER,
      provider TEXT DEFAULT 'wavespeed',
      status TEXT DEFAULT 'queued',
      prompt TEXT,
      settings TEXT,
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES vm_campaigns(id) ON DELETE CASCADE
    );
  `);

  // Migrate data from old adforge tables if they exist
  try {
    const oldCampaigns = await db.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns'").get();
    if (oldCampaigns) {
      const count = db.prepare('SELECT COUNT(*) as c FROM vm_campaigns').get().c;
      if (count === 0) {
        await db.exec(`
          INSERT INTO vm_campaigns SELECT * FROM campaigns ON CONFLICT DO NOTHING;
          INSERT INTO vm_generations SELECT * FROM generations ON CONFLICT DO NOTHING;
          INSERT INTO vm_favorites SELECT * FROM favorites ON CONFLICT DO NOTHING;
          INSERT INTO vm_video_jobs SELECT * FROM video_jobs ON CONFLICT DO NOTHING;
        `);
        console.log('  Migrated AdForge data to video-marketing module tables');
      }
    }
  } catch (e) {
    // Old tables don't exist, nothing to migrate
  }
}

module.exports = { initDatabase };

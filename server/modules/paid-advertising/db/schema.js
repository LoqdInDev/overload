const { db } = require('../../../db/database');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pa_campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      objective TEXT,
      budget TEXT,
      audience TEXT,
      ad_content TEXT,
      status TEXT DEFAULT 'draft',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pa_campaign_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      platform_campaign_id TEXT,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      spend REAL DEFAULT 0,
      conversions REAL DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpc REAL DEFAULT 0,
      cpa REAL DEFAULT 0,
      roas REAL DEFAULT 0,
      date TEXT NOT NULL,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pa_metrics_ws_campaign ON pa_campaign_metrics(workspace_id, campaign_id, date);
    CREATE INDEX IF NOT EXISTS idx_pa_metrics_ws_platform ON pa_campaign_metrics(workspace_id, platform, date);

    CREATE TABLE IF NOT EXISTS pa_optimization_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      campaign_id TEXT,
      platform TEXT,
      action_type TEXT NOT NULL,
      description TEXT,
      ai_analysis TEXT,
      decisions TEXT,
      status TEXT DEFAULT 'pending',
      executed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pa_optlog_ws ON pa_optimization_log(workspace_id, created_at DESC);
  `);
}

module.exports = { initDatabase };

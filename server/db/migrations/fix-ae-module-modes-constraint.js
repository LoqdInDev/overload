const { db } = require('../database');

/**
 * Fix ae_module_modes table:
 * - Change UNIQUE(module_id) to UNIQUE(module_id, workspace_id)
 *   so each workspace can have its own mode settings.
 * - Backfill workspace_id on rows that have NULL.
 */
function runMigration() {
  // Get the default workspace to backfill existing rows
  const defaultWs = db.prepare(
    "SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1"
  ).get();
  const wsId = defaultWs?.id || null;

  // Backfill workspace_id on ae_module_modes
  if (wsId) {
    db.prepare('UPDATE ae_module_modes SET workspace_id = ? WHERE workspace_id IS NULL').run(wsId);
  }

  // Recreate table with composite unique constraint
  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_module_modes_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      module_id TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'manual',
      config TEXT,
      risk_level TEXT DEFAULT 'conservative',
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(module_id, workspace_id)
    )
  `);

  // Copy data
  db.exec(`
    INSERT OR IGNORE INTO ae_module_modes_new (id, workspace_id, module_id, mode, config, risk_level, updated_at, created_at)
    SELECT id, workspace_id, module_id, mode, config, risk_level, updated_at, created_at
    FROM ae_module_modes
  `);

  db.exec('DROP TABLE ae_module_modes');
  db.exec('ALTER TABLE ae_module_modes_new RENAME TO ae_module_modes');

  // Also backfill workspace_id on approval queue, action log, rules, notifications, settings
  if (wsId) {
    db.prepare('UPDATE ae_approval_queue SET workspace_id = ? WHERE workspace_id IS NULL').run(wsId);
    db.prepare('UPDATE ae_action_log SET workspace_id = ? WHERE workspace_id IS NULL').run(wsId);
    db.prepare('UPDATE ae_rules SET workspace_id = ? WHERE workspace_id IS NULL').run(wsId);
    db.prepare('UPDATE ae_notifications SET workspace_id = ? WHERE workspace_id IS NULL').run(wsId);
    db.prepare('UPDATE ae_settings SET workspace_id = ? WHERE workspace_id IS NULL').run(wsId);
  }

  console.log('  Backfilled workspace_id on automation engine tables');
}

module.exports = { runMigration };

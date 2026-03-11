const { db } = require('../database');

/**
 * Fix ae_settings table: change from `key TEXT PRIMARY KEY` to
 * composite UNIQUE(key, workspace_id) so each workspace has its own settings.
 */
async function runMigration() {
  const tableExists = await db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ae_settings'"
  ).get();

  if (!tableExists) return;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ae_settings_new (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(key, workspace_id)
    )
  `);

  // Migrate existing rows — skip rows with NULL workspace_id
  const rows = await db.prepare('SELECT key, workspace_id, value, updated_at FROM ae_settings WHERE workspace_id IS NOT NULL').all();
  const insert = db.prepare('INSERT OR IGNORE INTO ae_settings_new (key, workspace_id, value, updated_at) VALUES (?, ?, ?, ?)');
  for (const row of rows) {
    insert.run(row.key, row.workspace_id, row.value, row.updated_at);
  }

  // For rows with NULL workspace_id, assign to all workspaces
  const nullRows = await db.prepare('SELECT key, value, updated_at FROM ae_settings WHERE workspace_id IS NULL').all();
  if (nullRows.length > 0) {
    const workspaces = await db.prepare('SELECT id FROM workspaces').all();
    for (const row of nullRows) {
      for (const ws of workspaces) {
        insert.run(row.key, ws.id, row.value, row.updated_at);
      }
    }
  }

  await db.exec('DROP TABLE ae_settings');
  await db.exec('ALTER TABLE ae_settings_new RENAME TO ae_settings');
}

module.exports = { runMigration };

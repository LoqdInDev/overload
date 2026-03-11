const { db } = require('../database');
const path = require('path');
const fs = require('fs');

/**
 * Migration Runner
 *
 * Tracks applied migrations in a `schema_migrations` table.
 * Auto-discovers and runs migration files in sorted order.
 * Each migration only runs once (idempotent).
 */

async function ensureMigrationsTable() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function hasRun(name) {
  return !!await db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(name);
}

async function markRun(name) {
  await db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
}

async function runAllMigrations() {
  await ensureMigrationsTable();

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js') && f !== 'runner.js')
    .sort();

  let applied = 0;
  for (const file of files) {
    const name = path.basename(file, '.js');

    if (await hasRun(name)) continue;

    try {
      const migration = require(path.join(migrationsDir, file));
      if (typeof migration.runMigration === 'function') {
        await migration.runMigration();
        await markRun(name);
        applied++;
        console.log(`  Migration applied: ${name}`);
      }
    } catch (err) {
      console.error(`  Migration failed [${name}]:`, err.message);
    }
  }

  if (applied > 0) {
    console.log(`  Migration runner: ${applied} new migration(s) applied`);
  } else {
    console.log('  Migration runner: all migrations up to date');
  }
}

module.exports = { runAllMigrations };

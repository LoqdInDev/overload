/**
 * Soft Delete Helpers
 *
 * Provides utilities for soft-deleting records in SQLite tables.
 * Instead of permanently removing rows, a `deleted_at` timestamp is set.
 *
 * Usage:
 *   const { addSoftDeleteColumns, softDelete, restoreRecord, excludeDeleted } = require('./softDelete');
 *
 *   // During module init — idempotently add the column
 *   addSoftDeleteColumns(db, 'my_table');
 *
 *   // In a DELETE route
 *   softDelete(db, 'my_table', recordId);
 *
 *   // In a restore/undo route
 *   restoreRecord(db, 'my_table', recordId);
 *
 *   // When building queries
 *   const where = excludeDeleted('WHERE workspace_id = ?');
 *   db.prepare(`SELECT * FROM my_table ${where}`).all(wsId);
 */

/**
 * Add a `deleted_at` column to the given table if it doesn't already exist.
 * Safe to call multiple times (idempotent).
 *
 * @param {import('better-sqlite3').Database} db - The database instance
 * @param {string} tableName - Name of the table to alter
 */
function addSoftDeleteColumns(db, tableName) {
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN deleted_at TEXT DEFAULT NULL`);
  } catch (err) {
    // Column likely already exists — SQLite throws "duplicate column name"
    if (!err.message.includes('duplicate column name')) {
      console.error(`softDelete: failed to add deleted_at to ${tableName}:`, err.message);
    }
  }
}

/**
 * Soft-delete a record by setting its `deleted_at` timestamp.
 *
 * @param {import('better-sqlite3').Database} db - The database instance
 * @param {string} table - Table name
 * @param {string|number} id - The primary key value of the record
 * @returns {import('better-sqlite3').RunResult} The result of the UPDATE
 */
function softDelete(db, table, id) {
  return db.prepare(
    `UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
  ).run(id);
}

/**
 * Restore a soft-deleted record by clearing its `deleted_at` timestamp.
 *
 * @param {import('better-sqlite3').Database} db - The database instance
 * @param {string} table - Table name
 * @param {string|number} id - The primary key value of the record
 * @returns {import('better-sqlite3').RunResult} The result of the UPDATE
 */
function restoreRecord(db, table, id) {
  return db.prepare(
    `UPDATE ${table} SET deleted_at = NULL WHERE id = ?`
  ).run(id);
}

/**
 * Append a `deleted_at IS NULL` condition to an existing WHERE clause.
 * If no WHERE clause is provided, returns a standalone WHERE clause.
 *
 * @param {string} [whereClause=''] - An existing WHERE clause (e.g. "WHERE workspace_id = ?")
 * @returns {string} The clause with `deleted_at IS NULL` appended
 *
 * @example
 *   excludeDeleted('')
 *   // => 'WHERE deleted_at IS NULL'
 *
 *   excludeDeleted('WHERE workspace_id = ?')
 *   // => 'WHERE workspace_id = ? AND deleted_at IS NULL'
 */
function excludeDeleted(whereClause = '') {
  const trimmed = whereClause.trim();
  if (!trimmed) {
    return 'WHERE deleted_at IS NULL';
  }
  // If there's already a WHERE keyword, append with AND
  if (trimmed.toUpperCase().startsWith('WHERE')) {
    return `${trimmed} AND deleted_at IS NULL`;
  }
  // Otherwise treat the input as conditions only and wrap in WHERE
  return `WHERE ${trimmed} AND deleted_at IS NULL`;
}

module.exports = { addSoftDeleteColumns, softDelete, restoreRecord, excludeDeleted };

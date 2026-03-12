/**
 * Soft Delete Helpers
 *
 * Provides utilities for soft-deleting records in database tables.
 * Instead of permanently removing rows, a `deleted_at` timestamp is set.
 *
 * Usage:
 *   const { addSoftDeleteColumns, softDelete, restoreRecord, excludeDeleted } = require('./softDelete');
 *
 *   // During module init — idempotently add the column
 *   await addSoftDeleteColumns(db, 'my_table');
 *
 *   // In a DELETE route
 *   await softDelete(db, 'my_table', recordId);
 *
 *   // In a restore/undo route
 *   await restoreRecord(db, 'my_table', recordId);
 *
 *   // When building queries
 *   const where = excludeDeleted('WHERE workspace_id = ?');
 *   await db.prepare(`SELECT * FROM my_table ${where}`).all(wsId);
 */

/**
 * Add a `deleted_at` column to the given table if it doesn't already exist.
 * Safe to call multiple times (idempotent).
 */
async function addSoftDeleteColumns(db, tableName) {
  try {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS deleted_at TEXT DEFAULT NULL`);
  } catch (err) {
    // Column likely already exists
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.error(`softDelete: failed to add deleted_at to ${tableName}:`, err.message);
    }
  }
}

/**
 * Soft-delete a record by setting its `deleted_at` timestamp.
 */
async function softDelete(db, table, id) {
  return await db.prepare(
    `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`
  ).run(id);
}

/**
 * Restore a soft-deleted record by clearing its `deleted_at` timestamp.
 */
async function restoreRecord(db, table, id) {
  return await db.prepare(
    `UPDATE ${table} SET deleted_at = NULL WHERE id = ?`
  ).run(id);
}

/**
 * Append a `deleted_at IS NULL` condition to an existing WHERE clause.
 */
function excludeDeleted(whereClause = '') {
  const trimmed = whereClause.trim();
  if (!trimmed) {
    return 'WHERE deleted_at IS NULL';
  }
  if (trimmed.toUpperCase().startsWith('WHERE')) {
    return `${trimmed} AND deleted_at IS NULL`;
  }
  return `WHERE ${trimmed} AND deleted_at IS NULL`;
}

module.exports = { addSoftDeleteColumns, softDelete, restoreRecord, excludeDeleted };

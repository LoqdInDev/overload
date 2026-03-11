const { Pool } = require('pg');
const crypto = require('crypto');

// ── PostgreSQL connection pool ────────────────────────────────────
const dbUrl = process.env.DATABASE_URL;
try {
  const parsed = new URL(dbUrl || '');
  console.log(`[db] Connecting to PostgreSQL at ${parsed.hostname}:${parsed.port || 5432}/${parsed.pathname?.slice(1)}`);
} catch {
  console.error(`[db] DATABASE_URL is missing or invalid: "${dbUrl ? dbUrl.slice(0, 20) + '...' : '(not set)'}"`);
}
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// ── Placeholder conversion: ? → $1, $2, ... ──────────────────────
function convertPlaceholders(sql) {
  let i = 0;
  // Don't replace ? inside string literals
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── Compatibility wrapper ─────────────────────────────────────────
// Mimics the better-sqlite3 API but returns promises.
// Usage: await db.prepare('SELECT ...').get(param1, param2)

const db = {
  /**
   * Prepare a statement. Returns an object with async get/all/run methods.
   * Automatically converts ? placeholders to $1, $2, ...
   */
  prepare(sql) {
    const pgSql = convertPlaceholders(sql);
    return {
      async get(...params) {
        const { rows } = await pool.query(pgSql, params);
        return rows[0] || undefined;
      },
      async all(...params) {
        const { rows } = await pool.query(pgSql, params);
        return rows;
      },
      async run(...params) {
        const result = await pool.query(pgSql, params);
        return { changes: result.rowCount, lastInsertRowid: result.rows?.[0]?.id };
      },
    };
  },

  /**
   * Execute raw SQL (DDL, multi-statement). Used for schema creation.
   */
  async exec(sql) {
    await pool.query(sql);
  },

  /**
   * Run an async function inside a transaction.
   * The callback receives a transaction-scoped `tx` object with the same API.
   */
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tx = {
        prepare(sql) {
          const pgSql = convertPlaceholders(sql);
          return {
            async get(...params) {
              const { rows } = await client.query(pgSql, params);
              return rows[0] || undefined;
            },
            async all(...params) {
              const { rows } = await client.query(pgSql, params);
              return rows;
            },
            async run(...params) {
              const result = await client.query(pgSql, params);
              return { changes: result.rowCount, lastInsertRowid: result.rows?.[0]?.id };
            },
          };
        },
        async exec(sql) {
          await client.query(sql);
        },
      };

      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  /** No-op — PostgreSQL doesn't use pragmas */
  pragma() {},

  /** Close the pool */
  async close() {
    await pool.end();
  },

  /** Direct access to pool for advanced usage */
  pool,
};

// ── Shared tables ─────────────────────────────────────────────────
async function initSharedTables() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      source_module TEXT,
      workspace_id TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      module_id TEXT NOT NULL,
      action TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      entity_id TEXT,
      workspace_id TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );
  `);

  await ensureDefaultWorkspaces();
}

async function ensureDefaultWorkspaces() {
  const hasUsers = await db.prepare(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
  ).get();
  if (!hasUsers) return;

  const users = await db.prepare('SELECT id, display_name, email FROM users').all();
  for (const user of users) {
    const hasMembership = await db.prepare(
      'SELECT 1 FROM workspace_members WHERE user_id = ?'
    ).get(user.id);

    if (!hasMembership) {
      await db.transaction(async (tx) => {
        const wsId = crypto.randomUUID();
        const name = 'My Workspace';
        const slug = 'my-workspace-' + user.id.slice(0, 8);

        await tx.prepare(
          'INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)'
        ).run(wsId, name, slug, user.id);

        await tx.prepare(
          'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)'
        ).run(crypto.randomUUID(), wsId, user.id, 'owner');
      });
    }
  }
}

async function getDefaultWorkspaceId() {
  const ws = await db.prepare('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1').get();
  return ws ? ws.id : null;
}

async function logActivity(moduleId, action, title, detail, entityId, workspaceId) {
  await db.prepare(
    'INSERT INTO activity_log (module_id, action, title, detail, entity_id, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(moduleId, action, title, detail || null, entityId || null, workspaceId || null);
}

async function getRecentActivity(limit = 20, workspaceId) {
  if (workspaceId) {
    return await db.prepare(
      'SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(workspaceId, limit);
  }
  return await db.prepare(
    'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

module.exports = { db, initSharedTables, logActivity, getRecentActivity, getDefaultWorkspaceId };

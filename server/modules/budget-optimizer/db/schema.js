const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bo_budgets (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      total_budget REAL,
      period TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bo_allocations (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT,
      budget_id INTEGER NOT NULL,
      channel TEXT,
      amount REAL,
      roas REAL,
      status TEXT DEFAULT 'active',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (budget_id) REFERENCES bo_budgets(id)
    )
  `);
}

module.exports = { initDatabase };

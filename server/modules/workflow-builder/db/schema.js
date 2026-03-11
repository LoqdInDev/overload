const { db } = require('../../../db/database');

async function initDatabase() {
  await db.exec(`CREATE TABLE IF NOT EXISTS wf_workflows (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    name TEXT,
    description TEXT,
    trigger_type TEXT,
    trigger_config TEXT,
    status TEXT DEFAULT 'draft',
    run_count INTEGER DEFAULT 0,
    last_run TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS wf_steps (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    workflow_id INTEGER,
    step_order INTEGER,
    module TEXT,
    action TEXT,
    config TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS wf_runs (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT,
    workflow_id INTEGER,
    status TEXT,
    started_at TEXT,
    completed_at TEXT,
    logs TEXT
  )`);
}

module.exports = { initDatabase };

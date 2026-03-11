const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { AUTOMATABLE_MODULES } = require('../db/schema');

// GET /modes — all module modes
router.get('/modes', async (req, res) => {
  const wsId = req.workspace.id;
  const rows = await db.prepare('SELECT module_id, mode, config, risk_level, updated_at FROM ae_module_modes WHERE workspace_id = ?').all(wsId);
  const modes = {};
  for (const row of rows) {
    modes[row.module_id] = {
      mode: row.mode,
      config: row.config ? JSON.parse(row.config) : null,
      riskLevel: row.risk_level,
      updatedAt: row.updated_at,
    };
  }
  // Fill in non-automatable modules as manual
  for (const moduleId of AUTOMATABLE_MODULES) {
    if (!modes[moduleId]) {
      modes[moduleId] = { mode: 'manual', config: null, riskLevel: 'conservative', updatedAt: null };
    }
  }
  res.json(modes);
});

// GET /modes/:moduleId — single module mode
router.get('/modes/:moduleId', async (req, res) => {
  const wsId = req.workspace.id;
  const row = await db.prepare('SELECT module_id, mode, config, risk_level, updated_at FROM ae_module_modes WHERE module_id = ? AND workspace_id = ?').get(req.params.moduleId, wsId);
  if (!row) {
    return res.json({ mode: 'manual', config: null, riskLevel: 'conservative', updatedAt: null });
  }
  res.json({
    mode: row.mode,
    config: row.config ? JSON.parse(row.config) : null,
    riskLevel: row.risk_level,
    updatedAt: row.updated_at,
  });
});

// PUT /modes/:moduleId — set mode
router.put('/modes/:moduleId', async (req, res) => {
  const wsId = req.workspace.id;
  const { moduleId } = req.params;
  const { mode, config, riskLevel } = req.body;

  if (!['manual', 'copilot', 'autopilot'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode. Must be manual, copilot, or autopilot.' });
  }

  db.prepare(`
    INSERT INTO ae_module_modes (module_id, mode, config, risk_level, updated_at, workspace_id)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(module_id, workspace_id) DO UPDATE SET
      mode = excluded.mode,
      config = excluded.config,
      risk_level = excluded.risk_level,
      updated_at = CURRENT_TIMESTAMP
  `).run(moduleId, mode, config ? JSON.stringify(config) : null, riskLevel || 'conservative', wsId);

  // Log the mode change
  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, created_at, completed_at, workspace_id)
    VALUES (?, 'mode_change', ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
  `).run(moduleId, mode, `Mode changed to ${mode}`, wsId);

  res.json({ success: true, moduleId, mode });
});

module.exports = router;

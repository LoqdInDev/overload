const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

const DEFAULTS = {
  pauseAll: 'false',
  defaultMode: 'manual',
  maxActionsPerDay: '50',
  maxActionsPerHour: '10',
  monthlyBudgetLimit: '0',
  confidenceThreshold: '70',
  notifyNewSuggestions: 'true',
  notifyCompletedActions: 'true',
  notifyFailedActions: 'true',
  notifyRuleTriggers: 'true',
  riskLevel: 'balanced',
  previousModes: '{}',
};

// GET /settings — all settings as flat object
router.get('/settings', (req, res) => {
  const wsId = req.workspace.id;
  const rows = db.prepare('SELECT key, value FROM ae_settings WHERE workspace_id = ?').all(wsId);
  const result = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

// PUT /settings — upsert changed settings
router.put('/settings', (req, res) => {
  const wsId = req.workspace.id;
  const stmt = db.prepare(
    "INSERT INTO ae_settings (key, value, workspace_id) VALUES (?, ?, ?) ON CONFLICT(key, workspace_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  const transaction = db.transaction((entries) => {
    for (const [key, value] of entries) {
      if (DEFAULTS.hasOwnProperty(key)) {
        stmt.run(key, String(value), wsId);
      }
    }
  });
  transaction(Object.entries(req.body));
  res.json({ success: true });
});

module.exports = router;

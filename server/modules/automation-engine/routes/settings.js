const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');

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
  autopilotStrategy: '',
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

// GET /execution-log — get automation execution history
router.get('/execution-log', (req, res) => {
  const workspace_id = req.workspace.id;
  try {
    const logs = db.prepare(`
      SELECT * FROM automation_executions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(workspace_id);
    res.json({ logs: logs || [] });
  } catch {
    // If table doesn't exist, return empty
    res.json({ logs: [] });
  }
});

// POST /analyze-automation — AI analyze an automation rule
router.post('/analyze-automation', async (req, res) => {
  const { rule_name, trigger, action, conditions } = req.body;
  if (!rule_name) return res.status(400).json({ error: 'rule_name required' });

  try {
    const { text } = await generateTextWithClaude(`You are a marketing automation expert. Analyze this automation rule:

Rule Name: ${rule_name}
Trigger: ${trigger || 'Unknown'}
Conditions: ${conditions || 'None'}
Action: ${action || 'Unknown'}

Return JSON:
{
  "estimated_monthly_savings_hours": <number>,
  "effectiveness_score": <number 1-10>,
  "potential_issues": ["<issue 1>"],
  "best_practices_gaps": ["<gap 1>"],
  "enhancement_suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "similar_automations": ["<related rule to consider>"],
  "expected_impact": "<brief 1-sentence expected business impact>"
}

Only return JSON.`);
    try { res.json(JSON.parse(text.trim())); }
    catch { res.json({ estimated_monthly_savings_hours: 2, effectiveness_score: 7, potential_issues: [], best_practices_gaps: [], enhancement_suggestions: ['Add a condition filter', 'Consider a time delay'], similar_automations: [], expected_impact: 'Saves time on manual work' }); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered budget optimization with SSE streaming
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Budget Optimizer`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('budget-optimizer', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Budget Optimizer generation error:', error);
    sse.sendError(error);
  }
});

// GET /budgets - List all budgets
router.get('/budgets', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const budgets = db.prepare('SELECT * FROM bo_budgets WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /budgets - Create a new budget
router.post('/budgets', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, total_budget, period, status } = req.body;
    const result = db.prepare(
      'INSERT INTO bo_budgets (name, total_budget, period, status, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, total_budget, period, status || 'active', wsId);
    logActivity('budget-optimizer', 'create', `Created budget: ${name}`, 'Budget created', null, wsId);
    const budget = db.prepare('SELECT * FROM bo_budgets WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /budgets/:id - Get a specific budget with its allocations
router.get('/budgets/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const budget = db.prepare('SELECT * FROM bo_budgets WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Budget not found' });
    }
    const allocations = db.prepare('SELECT * FROM bo_allocations WHERE budget_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    res.json({ success: true, data: { ...budget, allocations } });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /budgets/:id - Update a budget
router.put('/budgets/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, total_budget, period, status } = req.body;
    db.prepare(
      'UPDATE bo_budgets SET name = COALESCE(?, name), total_budget = COALESCE(?, total_budget), period = COALESCE(?, period), status = COALESCE(?, status) WHERE id = ? AND workspace_id = ?'
    ).run(name, total_budget, period, status, req.params.id, wsId);
    res.json(db.prepare('SELECT * FROM bo_budgets WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId));
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /budgets/:id - Delete a budget and its allocations
router.delete('/budgets/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    db.prepare('DELETE FROM bo_allocations WHERE budget_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM bo_budgets WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /allocations/:id - Update an allocation
router.put('/allocations/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { amount, roas, status } = req.body;
    db.prepare(
      'UPDATE bo_allocations SET amount = COALESCE(?, amount), roas = COALESCE(?, roas), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(amount, roas, status, req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /optimize — AI budget reallocation recommendations
router.post('/optimize', async (req, res) => {
  const wsId = req.workspace.id;
  const { total_budget, channels, goal } = req.body;
  if (!channels?.length) return res.status(400).json({ error: 'channels required' });

  try {
    const { text } = await generateTextWithClaude(`You are a marketing budget allocation expert. Recommend optimal budget reallocation:

Total Budget: $${total_budget || 'Unknown'}
Business Goal: ${goal || 'Sales'}
Current Channels: ${JSON.stringify(channels)}

Return JSON:
{
  "recommendations": [
    { "channel": "<name>", "current_percent": <number>, "recommended_percent": <number>, "change": "<increase|decrease|maintain>", "rationale": "<brief reason>", "expected_roas_impact": "<like +0.5x>" }
  ],
  "overall_expected_improvement": "<like 23% better ROAS>",
  "top_insight": "<the most important reallocation insight>",
  "channels_to_pause": ["<channel names to pause if any>"]
}

Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { res.json(JSON.parse(m[0])); } catch { res.status(500).json({ error: 'Failed to parse budget recommendation' }); } }
      else res.status(500).json({ error: 'Failed to parse budget recommendation' });
    }
    logActivity('budget-optimizer', 'optimize', 'Generated budget optimization', goal || 'Sales', null, wsId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

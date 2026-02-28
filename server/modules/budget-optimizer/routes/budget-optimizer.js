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

module.exports = router;

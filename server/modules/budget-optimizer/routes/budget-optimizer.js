const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered budget optimization with SSE streaming
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Budget Optimizer`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('budget-optimizer', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Budget Optimizer generation error:', error);
    sse.sendError(error);
  }
});

// GET /budgets - List all budgets
router.get('/budgets', (req, res) => {
  try {
    const budgets = db.prepare('SELECT * FROM bo_budgets ORDER BY created_at DESC').all();
    res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /budgets - Create a new budget
router.post('/budgets', (req, res) => {
  try {
    const { name, total_budget, period, status } = req.body;
    const result = db.prepare(
      'INSERT INTO bo_budgets (name, total_budget, period, status) VALUES (?, ?, ?, ?)'
    ).run(name, total_budget, period, status || 'active');
    logActivity('budget-optimizer', 'create', `Created budget: ${name}`, 'Budget created');
    const budget = db.prepare('SELECT * FROM bo_budgets WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /budgets/:id - Get a specific budget with its allocations
router.get('/budgets/:id', (req, res) => {
  try {
    const budget = db.prepare('SELECT * FROM bo_budgets WHERE id = ?').get(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Budget not found' });
    }
    const allocations = db.prepare('SELECT * FROM bo_allocations WHERE budget_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ success: true, data: { ...budget, allocations } });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

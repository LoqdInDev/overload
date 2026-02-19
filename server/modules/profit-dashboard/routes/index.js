const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all profit entries
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM pd_entries ORDER BY date DESC, created_at DESC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single entry
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM pd_entries WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a profit entry
router.post('/', (req, res) => {
  try {
    const { date, revenue, ad_spend, cogs, other_costs, platform } = req.body;
    const result = db.prepare(
      'INSERT INTO pd_entries (date, revenue, ad_spend, cogs, other_costs, platform) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(date || null, revenue || 0, ad_spend || 0, cogs || 0, other_costs || 0, platform || null);
    const item = db.prepare('SELECT * FROM pd_entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a profit entry
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM pd_entries WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { date, revenue, ad_spend, cogs, other_costs, platform } = req.body;
    db.prepare(
      'UPDATE pd_entries SET date = ?, revenue = ?, ad_spend = ?, cogs = ?, other_costs = ?, platform = ? WHERE id = ?'
    ).run(
      date !== undefined ? date : existing.date,
      revenue !== undefined ? revenue : existing.revenue,
      ad_spend !== undefined ? ad_spend : existing.ad_spend,
      cogs !== undefined ? cogs : existing.cogs,
      other_costs !== undefined ? other_costs : existing.other_costs,
      platform !== undefined ? platform : existing.platform,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM pd_entries WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a profit entry
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM pd_entries WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM pd_entries WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /goals/list - list all goals
router.get('/goals/list', (req, res) => {
  try {
    const goals = db.prepare('SELECT * FROM pd_goals ORDER BY created_at DESC').all();
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /goals - create a goal
router.post('/goals', (req, res) => {
  try {
    const { metric, target_value, current_value, period } = req.body;
    const result = db.prepare(
      'INSERT INTO pd_goals (metric, target_value, current_value, period) VALUES (?, ?, ?, ?)'
    ).run(metric, target_value || 0, current_value || 0, period || null);
    const item = db.prepare('SELECT * FROM pd_goals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /goals/:id - delete a goal
router.delete('/goals/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pd_goals WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI assistant specializing in business profitability analysis. You help analyze revenue, costs, margins, and provide actionable insights to improve profitability.`;

    const userPrompt = rawPrompt || `Analyze profitability data and provide insights on revenue trends, cost optimization opportunities, and margin improvement strategies.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'analysis' });
  } catch (error) {
    console.error('Profit Dashboard generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

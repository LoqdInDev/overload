const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all checkout flows
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM co_flows ORDER BY created_at DESC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single checkout flow
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM co_flows WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const tests = db.prepare('SELECT * FROM co_tests WHERE flow_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ ...item, tests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a checkout flow
router.post('/', (req, res) => {
  try {
    const { name, steps, conversion_rate, status } = req.body;
    const result = db.prepare(
      'INSERT INTO co_flows (name, steps, conversion_rate, status) VALUES (?, ?, ?, ?)'
    ).run(name, steps || null, conversion_rate || 0, status || 'draft');
    const item = db.prepare('SELECT * FROM co_flows WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a checkout flow
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM co_flows WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, steps, conversion_rate, status } = req.body;
    db.prepare(
      'UPDATE co_flows SET name = ?, steps = ?, conversion_rate = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      name || existing.name,
      steps !== undefined ? steps : existing.steps,
      conversion_rate !== undefined ? conversion_rate : existing.conversion_rate,
      status || existing.status,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM co_flows WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a checkout flow
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM co_flows WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM co_tests WHERE flow_id = ?').run(req.params.id);
    db.prepare('DELETE FROM co_flows WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /tests - create a test for a flow
router.post('/tests', (req, res) => {
  try {
    const { flow_id, variant, results, status } = req.body;
    const result = db.prepare(
      'INSERT INTO co_tests (flow_id, variant, results, status) VALUES (?, ?, ?, ?)'
    ).run(flow_id, variant || null, results || null, status || 'pending');
    const item = db.prepare('SELECT * FROM co_tests WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI assistant specializing in e-commerce checkout optimization. You help design high-converting checkout flows, reduce cart abandonment, and suggest A/B test strategies.`;

    const userPrompt = rawPrompt || `Analyze the current checkout flow and suggest optimizations to improve conversion rates. Include specific step-by-step recommendations and A/B test ideas.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'optimization' });
  } catch (error) {
    console.error('Checkout Optimizer generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

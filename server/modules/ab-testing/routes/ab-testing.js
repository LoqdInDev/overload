const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered test generation with SSE streaming
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for A/B Testing`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('ab-testing', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('A/B Testing generation error:', error);
    sse.sendError(error);
  }
});

// GET /tests - List all A/B tests
router.get('/tests', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const tests = db.prepare('SELECT * FROM abt_tests WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: tests });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /tests - Create a new A/B test
router.post('/tests', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, type, status, variants, start_date, end_date } = req.body;
    const result = db.prepare(
      'INSERT INTO abt_tests (name, type, status, variants, start_date, end_date, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, type, status || 'draft', variants ? JSON.stringify(variants) : null, start_date, end_date, wsId);
    logActivity('ab-testing', 'create', `Created test: ${name}`, 'Test created', null, wsId);
    const test = db.prepare('SELECT * FROM abt_tests WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tests/:id - Get a specific A/B test with its variants
router.get('/tests/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const test = db.prepare('SELECT * FROM abt_tests WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    const variants = db.prepare('SELECT * FROM abt_variants WHERE test_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    res.json({ success: true, data: { ...test, variant_list: variants } });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /tests/:id - Update an A/B test
router.put('/tests/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM abt_tests WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Test not found' });

    const { name, type, status, variants, start_date, end_date } = req.body;
    db.prepare(
      'UPDATE abt_tests SET name = ?, type = ?, status = ?, variants = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(name || existing.name, type || existing.type, status || existing.status, variants ? JSON.stringify(variants) : existing.variants, start_date || existing.start_date, end_date || existing.end_date, req.params.id, wsId);

    const test = db.prepare('SELECT * FROM abt_tests WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('ab-testing', 'update', `Updated test: ${test.name}`, 'Test updated', null, wsId);
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /tests/:id - Delete an A/B test
router.delete('/tests/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM abt_tests WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Test not found' });

    db.prepare('DELETE FROM abt_variants WHERE test_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM abt_tests WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('ab-testing', 'delete', `Deleted test: ${existing.name}`, 'Test deleted', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /calculate-significance — calculate statistical significance
router.post('/calculate-significance', (req, res) => {
  const { control_visitors, control_conversions, variant_visitors, variant_conversions } = req.body;

  const cv = parseInt(control_visitors) || 1;
  const cc = parseInt(control_conversions) || 0;
  const vv = parseInt(variant_visitors) || 1;
  const vc = parseInt(variant_conversions) || 0;

  const control_rate = cc / cv;
  const variant_rate = vc / vv;
  const lift = control_rate > 0 ? ((variant_rate - control_rate) / control_rate * 100) : 0;

  // Simple Z-score approximation
  const p_pool = (cc + vc) / (cv + vv);
  const se = Math.sqrt(p_pool * (1 - p_pool) * (1/cv + 1/vv));
  const z = se > 0 ? Math.abs(variant_rate - control_rate) / se : 0;
  const significance = Math.min(99.9, Math.round((1 - Math.exp(-0.717 * z - 0.416 * z * z)) * 100 * 10) / 10);

  const is_significant = significance >= 95;
  let recommendation;
  if (!is_significant) recommendation = 'Continue testing — not enough data yet';
  else if (lift > 0) recommendation = `Variant wins with ${lift.toFixed(1)}% lift — implement it`;
  else recommendation = 'Control wins — stick with original';

  res.json({
    control_rate: (control_rate * 100).toFixed(2) + '%',
    variant_rate: (variant_rate * 100).toFixed(2) + '%',
    relative_lift: lift.toFixed(1) + '%',
    significance: significance + '%',
    is_significant,
    confidence_level: significance >= 99 ? '99%' : significance >= 95 ? '95%' : significance >= 90 ? '90%' : '<90%',
    recommendation,
    min_sample_size: Math.ceil(Math.max(cv, vv) * 0.2 + 1000)
  });
});

// POST /predict-winner — AI predict the winner based on psychology
router.post('/predict-winner', async (req, res) => {
  const { test_name, variant_a, variant_b } = req.body;

  try {
    const { text } = await generateTextWithClaude(`You are a conversion psychology expert. Predict which A/B test variant will win:

Test: ${test_name || 'A/B Test'}
Variant A: ${variant_a}
Variant B: ${variant_b}

Return JSON:
{
  "predicted_winner": "A|B",
  "confidence": "<Low|Medium|High>",
  "reasoning": "<2-3 sentences on psychological principles>",
  "key_factor": "<the single most important factor>",
  "caveat": "<any important caveat or audience consideration>"
}

Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse winner prediction' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

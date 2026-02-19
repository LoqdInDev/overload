const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered test generation with SSE streaming
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for A/B Testing`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('ab-testing', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('A/B Testing generation error:', error);
    sse.sendError(error);
  }
});

// GET /tests - List all A/B tests
router.get('/tests', (req, res) => {
  try {
    const tests = db.prepare('SELECT * FROM abt_tests ORDER BY created_at DESC').all();
    res.json({ success: true, data: tests });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /tests - Create a new A/B test
router.post('/tests', (req, res) => {
  try {
    const { name, type, status, variants, start_date, end_date } = req.body;
    const result = db.prepare(
      'INSERT INTO abt_tests (name, type, status, variants, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, type, status || 'draft', variants ? JSON.stringify(variants) : null, start_date, end_date);
    logActivity('ab-testing', 'create', `Created test: ${name}`, 'Test created');
    const test = db.prepare('SELECT * FROM abt_tests WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /tests/:id - Get a specific A/B test with its variants
router.get('/tests/:id', (req, res) => {
  try {
    const test = db.prepare('SELECT * FROM abt_tests WHERE id = ?').get(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    const variants = db.prepare('SELECT * FROM abt_variants WHERE test_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ success: true, data: { ...test, variant_list: variants } });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

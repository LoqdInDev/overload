const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered audience generation with SSE streaming
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Audience Builder`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('audience-builder', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Audience Builder generation error:', error);
    sse.sendError(error);
  }
});

// GET /audiences - List all audiences
router.get('/audiences', (req, res) => {
  try {
    const audiences = db.prepare('SELECT * FROM ab_audiences ORDER BY created_at DESC').all();
    res.json({ success: true, data: audiences });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /audiences - Create a new audience
router.post('/audiences', (req, res) => {
  try {
    const { name, platform, type, size, criteria, status } = req.body;
    const result = db.prepare(
      'INSERT INTO ab_audiences (name, platform, type, size, criteria, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, platform, type, size, criteria ? JSON.stringify(criteria) : null, status || 'active');
    logActivity('audience-builder', 'create', `Created audience: ${name}`, 'Audience created');
    const audience = db.prepare('SELECT * FROM ab_audiences WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: audience });
  } catch (error) {
    console.error('Error creating audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /audiences/:id - Get a specific audience with its segments
router.get('/audiences/:id', (req, res) => {
  try {
    const audience = db.prepare('SELECT * FROM ab_audiences WHERE id = ?').get(req.params.id);
    if (!audience) {
      return res.status(404).json({ success: false, error: 'Audience not found' });
    }
    const segments = db.prepare('SELECT * FROM ab_segments WHERE audience_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ success: true, data: { ...audience, segments } });
  } catch (error) {
    console.error('Error fetching audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

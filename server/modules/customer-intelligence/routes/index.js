const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all segments
router.get('/', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const items = db.prepare('SELECT * FROM ci_segments WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single segment with its insights
router.get('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const item = db.prepare('SELECT * FROM ci_segments WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const insights = db.prepare('SELECT * FROM ci_insights WHERE segment_id = ? AND workspace_id = ? ORDER BY created_at DESC').all(req.params.id, wsId);
    res.json({ ...item, insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a segment
router.post('/', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, description, criteria, size } = req.body;
    const result = db.prepare(
      'INSERT INTO ci_segments (name, description, criteria, size, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description || null, criteria || null, size || 0, wsId);
    const item = db.prepare('SELECT * FROM ci_segments WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a segment
router.put('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM ci_segments WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, description, criteria, size } = req.body;
    db.prepare(
      'UPDATE ci_segments SET name = ?, description = ?, criteria = ?, size = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      criteria !== undefined ? criteria : existing.criteria,
      size !== undefined ? size : existing.size,
      req.params.id, wsId
    );
    const updated = db.prepare('SELECT * FROM ci_segments WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a segment and its insights
router.delete('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM ci_segments WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM ci_insights WHERE segment_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM ci_segments WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /insights/list - list all insights
router.get('/insights/list', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const insights = db.prepare('SELECT i.*, s.name as segment_name FROM ci_insights i LEFT JOIN ci_segments s ON i.segment_id = s.id WHERE i.workspace_id = ? ORDER BY i.created_at DESC').all(wsId);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /insights - create an insight
router.post('/insights', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { segment_id, type, title, description, confidence } = req.body;
    const result = db.prepare(
      'INSERT INTO ci_insights (segment_id, type, title, description, confidence, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(segment_id || null, type || null, title || null, description || null, confidence || 0, wsId);
    const item = db.prepare('SELECT * FROM ci_insights WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
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

    const systemPrompt = `You are an AI assistant specializing in customer intelligence and segmentation. You help analyze customer data, identify segments, uncover behavioral patterns, and generate actionable insights for marketing and retention strategies.`;

    const userPrompt = rawPrompt || `Analyze customer data and provide segmentation recommendations with insights on behavior patterns, preferences, and actionable strategies for each segment.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'insight' });
  } catch (error) {
    console.error('Customer Intelligence generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

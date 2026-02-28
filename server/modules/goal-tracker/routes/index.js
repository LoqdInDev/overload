const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all goals
router.get('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const items = db.prepare('SELECT * FROM gt_goals WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single goal with milestones
router.get('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const item = db.prepare('SELECT * FROM gt_goals WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const milestones = db.prepare('SELECT * FROM gt_milestones WHERE goal_id = ? AND workspace_id = ? ORDER BY value ASC').all(req.params.id, wsId);
    res.json({ ...item, milestones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a goal
router.post('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, metric, target_value, current_value, deadline, status, notes } = req.body;
    const result = db.prepare(
      'INSERT INTO gt_goals (name, metric, target_value, current_value, deadline, status, notes, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, metric || null, target_value || 0, current_value || 0, deadline || null, status || 'active', notes || null, wsId);
    const item = db.prepare('SELECT * FROM gt_goals WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a goal
router.put('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM gt_goals WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, metric, target_value, current_value, deadline, status, notes } = req.body;
    db.prepare(
      'UPDATE gt_goals SET name = ?, metric = ?, target_value = ?, current_value = ?, deadline = ?, status = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      name || existing.name,
      metric !== undefined ? metric : existing.metric,
      target_value !== undefined ? target_value : existing.target_value,
      current_value !== undefined ? current_value : existing.current_value,
      deadline !== undefined ? deadline : existing.deadline,
      status || existing.status,
      notes !== undefined ? notes : existing.notes,
      req.params.id,
      wsId
    );
    const updated = db.prepare('SELECT * FROM gt_goals WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a goal and its milestones
router.delete('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM gt_goals WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM gt_milestones WHERE goal_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM gt_goals WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /milestones - add a milestone to a goal
router.post('/milestones', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { goal_id, value, label, reached_at } = req.body;
    const result = db.prepare(
      'INSERT INTO gt_milestones (goal_id, value, label, reached_at, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(goal_id, value || 0, label || null, reached_at || null, wsId);
    const item = db.prepare('SELECT * FROM gt_milestones WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /milestones/:id - delete a milestone
router.delete('/milestones/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM gt_milestones WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
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

    const systemPrompt = `You are an AI assistant specializing in goal setting and tracking. You help define SMART goals, suggest milestones, and provide strategies to achieve business objectives.`;

    const userPrompt = rawPrompt || `Help me define and break down a business goal into actionable milestones with timelines and success metrics.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'goal-planning' });
  } catch (error) {
    console.error('Goal Tracker generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

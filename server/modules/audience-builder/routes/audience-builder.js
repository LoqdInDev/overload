const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI-powered audience generation with SSE streaming
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Audience Builder`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('audience-builder', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Audience Builder generation error:', error);
    sse.sendError(error);
  }
});

// GET /audiences - List all audiences
router.get('/audiences', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const audiences = db.prepare('SELECT * FROM ab_audiences WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json({ success: true, data: audiences });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /audiences - Create a new audience
router.post('/audiences', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, platform, type, size, criteria, status } = req.body;
    const result = db.prepare(
      'INSERT INTO ab_audiences (name, platform, type, size, criteria, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, platform, type, size, criteria ? JSON.stringify(criteria) : null, status || 'active', wsId);
    logActivity('audience-builder', 'create', `Created audience: ${name}`, 'Audience created', null, wsId);
    const audience = db.prepare('SELECT * FROM ab_audiences WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.json({ success: true, data: audience });
  } catch (error) {
    console.error('Error creating audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /audiences/:id - Get a specific audience with its segments
router.get('/audiences/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const audience = db.prepare('SELECT * FROM ab_audiences WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!audience) {
      return res.status(404).json({ success: false, error: 'Audience not found' });
    }
    const segments = db.prepare('SELECT * FROM ab_segments WHERE audience_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    res.json({ success: true, data: { ...audience, segments } });
  } catch (error) {
    console.error('Error fetching audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /audiences/:id - Update an audience
router.put('/audiences/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM ab_audiences WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Audience not found' });

    const { name, platform, type, size, criteria, status } = req.body;
    db.prepare(
      'UPDATE ab_audiences SET name = ?, platform = ?, type = ?, size = ?, criteria = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(name || existing.name, platform || existing.platform, type || existing.type, size ?? existing.size, criteria ? JSON.stringify(criteria) : existing.criteria, status || existing.status, req.params.id, wsId);

    const audience = db.prepare('SELECT * FROM ab_audiences WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('audience-builder', 'update', `Updated audience: ${audience.name}`, 'Audience updated', null, wsId);
    res.json({ success: true, data: audience });
  } catch (error) {
    console.error('Error updating audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /audiences/:id - Delete an audience
router.delete('/audiences/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM ab_audiences WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ success: false, error: 'Audience not found' });

    db.prepare('DELETE FROM ab_segments WHERE audience_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM ab_audiences WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('audience-builder', 'delete', `Deleted audience: ${existing.name}`, 'Audience deleted', null, wsId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting audience:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /build-lookalike — SSE: build a lookalike audience spec
router.post('/build-lookalike', (req, res) => {
  const { seed_description, platforms } = req.body;
  if (!seed_description) { res.status(400).json({ error: 'seed_description required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a digital advertising audience specialist. Build a lookalike audience specification based on this seed audience:

Seed Audience: ${seed_description}
Target Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Facebook, Google, TikTok'}

Generate a detailed lookalike audience spec with:

## Core Demographics
(age range, gender split, income level, education, location targets)

## Interest Targeting
(20+ specific interest categories, organized by strength — primary/secondary/tertiary)

## Behavioral Signals
(specific behaviors to target on each platform)

## Facebook/Meta Targeting
(specific audience parameters, lookalike percentage recommendation)

## Google Targeting
(in-market segments, affinity audiences, custom intent keywords)

## TikTok Targeting
(hashtag communities, creator lookalikes, behavioral targeting)

## Exclusions
(audiences to exclude to improve quality)

## Estimated Audience Size
(rough estimate per platform)

Be specific with real targeting options that exist on these platforms.`;

  generateTextWithClaude(prompt, {
    onChunk: (chunk) => sse.sendChunk(chunk),
  })
    .then(() => sse.sendResult({ done: true }))
    .catch(() => sse.sendError(new Error('Generation failed')));
});

module.exports = router;

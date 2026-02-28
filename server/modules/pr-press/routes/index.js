const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all press releases
router.get('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const items = db.prepare('SELECT * FROM pp_releases WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single press release
router.get('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const item = db.prepare('SELECT * FROM pp_releases WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a press release
router.post('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { title, content, status, target_date, distribution_list } = req.body;
    const result = db.prepare(
      'INSERT INTO pp_releases (title, content, status, target_date, distribution_list, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, content || null, status || 'draft', target_date || null, distribution_list || null, wsId);
    const item = db.prepare('SELECT * FROM pp_releases WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a press release
router.put('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM pp_releases WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { title, content, status, target_date, distribution_list } = req.body;
    db.prepare(
      'UPDATE pp_releases SET title = ?, content = ?, status = ?, target_date = ?, distribution_list = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      title || existing.title,
      content !== undefined ? content : existing.content,
      status || existing.status,
      target_date !== undefined ? target_date : existing.target_date,
      distribution_list !== undefined ? distribution_list : existing.distribution_list,
      req.params.id,
      wsId
    );
    const updated = db.prepare('SELECT * FROM pp_releases WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a press release
router.delete('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM pp_releases WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM pp_releases WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /contacts/list - list all media contacts
router.get('/contacts/list', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const contacts = db.prepare('SELECT * FROM pp_contacts WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /contacts - create a media contact
router.post('/contacts', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, outlet, email, beat, relationship } = req.body;
    const result = db.prepare(
      'INSERT INTO pp_contacts (name, outlet, email, beat, relationship, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, outlet || null, email || null, beat || null, relationship || null, wsId);
    const contact = db.prepare('SELECT * FROM pp_contacts WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /contacts/:id - delete a media contact
router.delete('/contacts/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM pp_contacts WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
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

    const systemPrompt = `You are an AI assistant specializing in PR and press relations. You help write compelling press releases, media pitches, and communication strategies.`;

    const userPrompt = rawPrompt || `Generate a professional press release draft. Include a headline, subheadline, dateline, body paragraphs, boilerplate, and media contact info placeholder.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'press-release' });
  } catch (error) {
    console.error('PR & Press generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

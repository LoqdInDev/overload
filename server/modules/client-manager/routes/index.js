const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all clients
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM cm_clients';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single client with their projects
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM cm_clients WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const projects = db.prepare('SELECT * FROM cm_projects WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ ...item, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a client
router.post('/', (req, res) => {
  try {
    const { name, company, email, phone, status, notes } = req.body;
    const result = db.prepare(
      'INSERT INTO cm_clients (name, company, email, phone, status, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, company || null, email || null, phone || null, status || 'active', notes || null);
    const item = db.prepare('SELECT * FROM cm_clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a client
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM cm_clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, company, email, phone, status, notes } = req.body;
    db.prepare(
      'UPDATE cm_clients SET name = ?, company = ?, email = ?, phone = ?, status = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      name || existing.name,
      company !== undefined ? company : existing.company,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      status || existing.status,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM cm_clients WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a client and their projects
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM cm_clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM cm_projects WHERE client_id = ?').run(req.params.id);
    db.prepare('DELETE FROM cm_clients WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /projects/list - list all projects
router.get('/projects/list', (req, res) => {
  try {
    const { client_id, status } = req.query;
    let query = 'SELECT p.*, c.name as client_name, c.company as client_company FROM cm_projects p LEFT JOIN cm_clients c ON p.client_id = c.id';
    const conditions = [];
    const params = [];
    if (client_id) { conditions.push('p.client_id = ?'); params.push(client_id); }
    if (status) { conditions.push('p.status = ?'); params.push(status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.created_at DESC';
    const projects = db.prepare(query).all(...params);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /projects - create a project
router.post('/projects', (req, res) => {
  try {
    const { client_id, name, description, modules, status } = req.body;
    const result = db.prepare(
      'INSERT INTO cm_projects (client_id, name, description, modules, status) VALUES (?, ?, ?, ?, ?)'
    ).run(client_id || null, name, description || null, modules || null, status || 'active');
    const item = db.prepare('SELECT * FROM cm_projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /projects/:id - update a project
router.put('/projects/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM cm_projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, description, modules, status } = req.body;
    db.prepare(
      'UPDATE cm_projects SET name = ?, description = ?, modules = ?, status = ? WHERE id = ?'
    ).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      modules !== undefined ? modules : existing.modules,
      status || existing.status,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM cm_projects WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /projects/:id - delete a project
router.delete('/projects/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM cm_projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt, client } = req.body;

    const systemPrompt = `You are an AI assistant specializing in client management and project planning. You help create client proposals, project scopes, status reports, and communication strategies.`;

    let userPrompt;
    if (rawPrompt) {
      userPrompt = rawPrompt;
    } else if (client) {
      userPrompt = `Create a client status report for:
Client: ${client.name || 'N/A'}
Company: ${client.company || 'N/A'}
Status: ${client.status || 'active'}

Include project progress, upcoming milestones, and recommended next steps.`;
    } else {
      userPrompt = `Generate a client project proposal template that includes scope, timeline, deliverables, and pricing structure.`;
    }

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'report' });
  } catch (error) {
    console.error('Client Manager generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

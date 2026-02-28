const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all clients
router.get('/', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM cm_clients WHERE workspace_id = ?';
    const params = [wsId];
    if (status) {
      query += ' AND status = ?';
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
  const wsId = req.workspace.id;
  try {
    const item = db.prepare('SELECT * FROM cm_clients WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const projects = db.prepare('SELECT * FROM cm_projects WHERE client_id = ? AND workspace_id = ? ORDER BY created_at DESC').all(req.params.id, wsId);
    res.json({ ...item, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a client
router.post('/', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, company, email, phone, status, notes } = req.body;
    const result = db.prepare(
      'INSERT INTO cm_clients (name, company, email, phone, status, notes, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, company || null, email || null, phone || null, status || 'active', notes || null, wsId);
    const item = db.prepare('SELECT * FROM cm_clients WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a client
router.put('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM cm_clients WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, company, email, phone, status, notes } = req.body;
    db.prepare(
      'UPDATE cm_clients SET name = ?, company = ?, email = ?, phone = ?, status = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      name || existing.name,
      company !== undefined ? company : existing.company,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      status || existing.status,
      notes !== undefined ? notes : existing.notes,
      req.params.id, wsId
    );
    const updated = db.prepare('SELECT * FROM cm_clients WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a client and their projects
router.delete('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM cm_clients WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM cm_projects WHERE client_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM cm_clients WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /projects/list - list all projects
router.get('/projects/list', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { client_id, status } = req.query;
    let query = 'SELECT p.*, c.name as client_name, c.company as client_company FROM cm_projects p LEFT JOIN cm_clients c ON p.client_id = c.id';
    const conditions = ['p.workspace_id = ?'];
    const params = [wsId];
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
  const wsId = req.workspace.id;
  try {
    const { client_id, name, description, modules, status } = req.body;
    const result = db.prepare(
      'INSERT INTO cm_projects (client_id, name, description, modules, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(client_id || null, name, description || null, modules || null, status || 'active', wsId);
    const item = db.prepare('SELECT * FROM cm_projects WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /projects/:id - update a project
router.put('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM cm_projects WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, description, modules, status } = req.body;
    db.prepare(
      'UPDATE cm_projects SET name = ?, description = ?, modules = ?, status = ? WHERE id = ? AND workspace_id = ?'
    ).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      modules !== undefined ? modules : existing.modules,
      status || existing.status,
      req.params.id, wsId
    );
    const updated = db.prepare('SELECT * FROM cm_projects WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /projects/:id - delete a project
router.delete('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    db.prepare('DELETE FROM cm_projects WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
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

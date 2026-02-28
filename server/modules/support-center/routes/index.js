const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all tickets
router.get('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { status, priority } = req.query;
    let query = 'SELECT * FROM sc_tickets';
    const conditions = ['workspace_id = ?'];
    const params = [wsId];
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (priority) { conditions.push('priority = ?'); params.push(priority); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single ticket
router.get('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const item = db.prepare('SELECT * FROM sc_tickets WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a ticket
router.post('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { subject, description, customer_email, priority, status, assigned_to, ai_response } = req.body;
    const result = db.prepare(
      'INSERT INTO sc_tickets (subject, description, customer_email, priority, status, assigned_to, ai_response, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(subject, description || null, customer_email || null, priority || 'medium', status || 'open', assigned_to || null, ai_response || null, wsId);
    const item = db.prepare('SELECT * FROM sc_tickets WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a ticket
router.put('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM sc_tickets WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { subject, description, customer_email, priority, status, assigned_to, ai_response } = req.body;
    db.prepare(
      'UPDATE sc_tickets SET subject = ?, description = ?, customer_email = ?, priority = ?, status = ?, assigned_to = ?, ai_response = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      subject || existing.subject,
      description !== undefined ? description : existing.description,
      customer_email !== undefined ? customer_email : existing.customer_email,
      priority || existing.priority,
      status || existing.status,
      assigned_to !== undefined ? assigned_to : existing.assigned_to,
      ai_response !== undefined ? ai_response : existing.ai_response,
      req.params.id,
      wsId
    );
    const updated = db.prepare('SELECT * FROM sc_tickets WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a ticket
router.delete('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM sc_tickets WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM sc_tickets WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templates/list - list all templates
router.get('/templates/list', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const templates = db.prepare('SELECT * FROM sc_templates WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /templates - create a template
router.post('/templates', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, category, content } = req.body;
    const result = db.prepare(
      'INSERT INTO sc_templates (name, category, content, workspace_id) VALUES (?, ?, ?, ?)'
    ).run(name, category || null, content || null, wsId);
    const item = db.prepare('SELECT * FROM sc_templates WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /templates/:id - delete a template
router.delete('/templates/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM sc_templates WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt, ticket } = req.body;

    const systemPrompt = `You are an AI assistant specializing in customer support. You help draft professional, empathetic, and helpful responses to customer tickets, create support templates, and suggest resolution strategies.`;

    let userPrompt;
    if (rawPrompt) {
      userPrompt = rawPrompt;
    } else if (ticket) {
      userPrompt = `Draft a professional support response for this ticket:
Subject: ${ticket.subject || 'N/A'}
Description: ${ticket.description || 'N/A'}
Priority: ${ticket.priority || 'medium'}
Customer Email: ${ticket.customer_email || 'N/A'}

Provide a helpful, empathetic response that addresses the customer's issue and offers a clear resolution path.`;
    } else {
      userPrompt = `Generate a professional customer support response template that can be customized for common support scenarios.`;
    }

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'response' });
  } catch (error) {
    console.error('Support Center generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// SSE - AI campaign planning
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { goal, dateRange, modules, budget, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !goal && !dateRange) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('calendar', 'generate', 'Generated calendar content', 'AI generation');
      sse.sendResult({ content: text });
      return;
    }

    const prompt = `You are an expert marketing strategist. Create a detailed campaign plan as a JSON object.

Goal: ${goal || 'General marketing campaign'}
Date range: ${dateRange || 'Next 30 days'}
Modules to use: ${modules ? modules.join(', ') : 'All available'}
Budget considerations: ${budget || 'Not specified'}

Return a JSON object with this structure:
{
  "campaign": {
    "name": "Campaign name",
    "strategy": "Overall strategy description",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD"
  },
  "events": [
    {
      "title": "Event title",
      "description": "What to do",
      "module_id": "which module (e.g. video-marketing, email, social)",
      "date": "YYYY-MM-DD",
      "color": "#hex color"
    }
  ],
  "milestones": [
    { "title": "Milestone", "date": "YYYY-MM-DD", "metric": "KPI to track" }
  ]
}`;

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    logActivity('calendar', 'generate', 'Generated campaign plan', parsed.campaign?.name || 'AI Campaign');
    sse.sendResult(parsed);
  } catch (error) {
    console.error('Calendar generation error:', error);
    sse.sendError(error);
  }
});

// GET /events
router.get('/events', (req, res) => {
  try {
    const { start, end, module_id, status } = req.query;
    let sql = 'SELECT * FROM mc_events WHERE 1=1';
    const params = [];

    if (start) { sql += ' AND date >= ?'; params.push(start); }
    if (end) { sql += ' AND date <= ?'; params.push(end); }
    if (module_id) { sql += ' AND module_id = ?'; params.push(module_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY date ASC';
    const events = db.prepare(sql).all(...params);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /events
router.post('/events', (req, res) => {
  try {
    const { title, description, module_id, date, end_date, color, status } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const result = db.prepare(
      'INSERT INTO mc_events (title, description, module_id, date, end_date, color, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(title, description || null, module_id || null, date, end_date || null, color || null, status || 'planned');

    const event = db.prepare('SELECT * FROM mc_events WHERE id = ?').get(result.lastInsertRowid);
    logActivity('calendar', 'create', 'Created calendar event', title);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /events/:id
router.put('/events/:id', (req, res) => {
  try {
    const { title, description, module_id, date, end_date, color, status } = req.body;

    const existing = db.prepare('SELECT * FROM mc_events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare(
      'UPDATE mc_events SET title = ?, description = ?, module_id = ?, date = ?, end_date = ?, color = ?, status = ? WHERE id = ?'
    ).run(
      title || existing.title,
      description !== undefined ? description : existing.description,
      module_id !== undefined ? module_id : existing.module_id,
      date || existing.date,
      end_date !== undefined ? end_date : existing.end_date,
      color !== undefined ? color : existing.color,
      status || existing.status,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM mc_events WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /events/:id
router.delete('/events/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM mc_events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare('DELETE FROM mc_events WHERE id = ?').run(req.params.id);
    logActivity('calendar', 'delete', 'Deleted calendar event', existing.title);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /campaigns
router.get('/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM mc_campaigns ORDER BY created_at DESC').all();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns
router.post('/campaigns', (req, res) => {
  try {
    const { name, start_date, end_date, modules, notes } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, start_date, and end_date are required' });
    }

    const result = db.prepare(
      'INSERT INTO mc_campaigns (name, start_date, end_date, modules, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(name, start_date, end_date, modules ? JSON.stringify(modules) : null, notes || null);

    const campaign = db.prepare('SELECT * FROM mc_campaigns WHERE id = ?').get(result.lastInsertRowid);
    logActivity('calendar', 'create', 'Created campaign', name);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

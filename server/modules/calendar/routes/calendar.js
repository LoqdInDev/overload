const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// SSE - AI campaign planning
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { goal, dateRange, modules, budget, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !goal && !dateRange) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('calendar', 'generate', 'Generated calendar content', 'AI generation', null, wsId);
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

    logActivity('calendar', 'generate', 'Generated campaign plan', parsed.campaign?.name || 'AI Campaign', null, wsId);
    sse.sendResult(parsed);
  } catch (error) {
    console.error('Calendar generation error:', error);
    sse.sendError(error);
  }
});

// GET /events
router.get('/events', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { start, end, module_id, status } = req.query;
    let sql = 'SELECT * FROM mc_events WHERE workspace_id = ?';
    const params = [wsId];

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
  const wsId = req.workspace.id;
  try {
    const { title, description, module_id, date, end_date, color, status, recurrence } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const result = db.prepare(
      'INSERT INTO mc_events (title, description, module_id, date, end_date, color, recurrence, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(title, description || null, module_id || null, date, end_date || null, color || null, recurrence || null, status || 'planned', wsId);

    const event = db.prepare('SELECT * FROM mc_events WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('calendar', 'create', 'Created calendar event', title, null, wsId);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /events/:id
router.put('/events/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { title, description, module_id, date, end_date, color, status, recurrence } = req.body;

    const existing = db.prepare('SELECT * FROM mc_events WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare(
      'UPDATE mc_events SET title = ?, description = ?, module_id = ?, date = ?, end_date = ?, color = ?, recurrence = ?, status = ? WHERE id = ? AND workspace_id = ?'
    ).run(
      title || existing.title,
      description !== undefined ? description : existing.description,
      module_id !== undefined ? module_id : existing.module_id,
      date || existing.date,
      end_date !== undefined ? end_date : existing.end_date,
      color !== undefined ? color : existing.color,
      recurrence !== undefined ? recurrence : existing.recurrence,
      status || existing.status,
      req.params.id, wsId
    );

    const updated = db.prepare('SELECT * FROM mc_events WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /events/:id
router.delete('/events/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM mc_events WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare('DELETE FROM mc_events WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('calendar', 'delete', 'Deleted calendar event', existing.title, null, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /campaigns
router.get('/campaigns', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const campaigns = db.prepare('SELECT * FROM mc_campaigns WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns
router.post('/campaigns', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, start_date, end_date, modules, notes } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, start_date, and end_date are required' });
    }

    const result = db.prepare(
      'INSERT INTO mc_campaigns (name, start_date, end_date, modules, notes, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, start_date, end_date, modules ? JSON.stringify(modules) : null, notes || null, wsId);

    const campaign = db.prepare('SELECT * FROM mc_campaigns WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('calendar', 'create', 'Created campaign', name, null, wsId);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /suggest-content-plan — AI-generate a content plan for a month
router.post('/suggest-content-plan', (req, res) => {
  const { month, business_type, goal, workspace_id } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });

  generateTextWithClaude(`You are a content marketing strategist. Create a content calendar for:

Month: ${month}
Business Type: ${business_type || 'E-commerce/Marketing'}
Main Goal: ${goal || 'Brand awareness and engagement'}

Generate a 4-week posting schedule with 3-4 posts per week. Return JSON:
{
  "plan": [
    {
      "week": 1,
      "posts": [
        { "day": "<like Monday March 3>", "platform": "<Instagram|Twitter|LinkedIn|Facebook|TikTok>", "content_type": "<Educational|Promotional|Entertainment|UGC|Behind-the-Scenes>", "topic": "<specific post topic>", "hook": "<opening hook text>" }
      ]
    }
  ],
  "theme": "<overarching monthly theme>",
  "notes": "<2 strategic notes>"
}

Return exactly 4 weeks with 3-4 posts each. Only return JSON.`)
    .then(({ text }) => {
      try { res.json(JSON.parse(text.trim())); }
      catch { res.status(500).json({ error: 'Parse failed' }); }
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;

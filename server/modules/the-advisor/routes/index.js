const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all briefings
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM adv_briefings ORDER BY date DESC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single briefing with its actions
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM adv_briefings WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const actions = db.prepare('SELECT * FROM adv_actions WHERE briefing_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ ...item, actions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a briefing
router.post('/', (req, res) => {
  try {
    const { date, yesterday_summary, today_recommendations, weekly_snapshot } = req.body;
    const result = db.prepare(
      'INSERT INTO adv_briefings (date, yesterday_summary, today_recommendations, weekly_snapshot) VALUES (?, ?, ?, ?)'
    ).run(date || new Date().toISOString().split('T')[0], yesterday_summary || null, today_recommendations || null, weekly_snapshot || null);
    const item = db.prepare('SELECT * FROM adv_briefings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a briefing
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM adv_briefings WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { date, yesterday_summary, today_recommendations, weekly_snapshot } = req.body;
    db.prepare(
      'UPDATE adv_briefings SET date = ?, yesterday_summary = ?, today_recommendations = ?, weekly_snapshot = ?, generated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      date || existing.date,
      yesterday_summary !== undefined ? yesterday_summary : existing.yesterday_summary,
      today_recommendations !== undefined ? today_recommendations : existing.today_recommendations,
      weekly_snapshot !== undefined ? weekly_snapshot : existing.weekly_snapshot,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM adv_briefings WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a briefing and its actions
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM adv_briefings WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM adv_actions WHERE briefing_id = ?').run(req.params.id);
    db.prepare('DELETE FROM adv_briefings WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /actions/list - list all actions
router.get('/actions/list', (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = 'SELECT a.*, b.date as briefing_date FROM adv_actions a LEFT JOIN adv_briefings b ON a.briefing_id = b.id';
    const conditions = [];
    const params = [];
    if (status) { conditions.push('a.status = ?'); params.push(status); }
    if (priority) { conditions.push('a.priority = ?'); params.push(priority); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY a.created_at DESC';
    const actions = db.prepare(query).all(...params);
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /actions - create an action
router.post('/actions', (req, res) => {
  try {
    const { briefing_id, priority, title, description, module, status } = req.body;
    const result = db.prepare(
      'INSERT INTO adv_actions (briefing_id, priority, title, description, module, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(briefing_id || null, priority || 'medium', title || null, description || null, module || null, status || 'pending');
    const item = db.prepare('SELECT * FROM adv_actions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /actions/:id - update an action status
router.put('/actions/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM adv_actions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { priority, title, description, module, status } = req.body;
    db.prepare(
      'UPDATE adv_actions SET priority = ?, title = ?, description = ?, module = ?, status = ? WHERE id = ?'
    ).run(
      priority || existing.priority,
      title !== undefined ? title : existing.title,
      description !== undefined ? description : existing.description,
      module !== undefined ? module : existing.module,
      status || existing.status,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM adv_actions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI marketing advisor. You provide daily briefings, strategic recommendations, and actionable insights based on marketing performance data. You prioritize recommendations by impact and urgency, and connect insights across different marketing channels.`;

    const userPrompt = rawPrompt || `Generate a daily marketing briefing that includes:
1. A summary of yesterday's key marketing activities and results
2. Today's top priority recommendations (ranked by impact)
3. A weekly performance snapshot with trends
4. Specific action items with assigned modules/channels

Be concise, data-focused, and actionable.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'briefing' });
  } catch (error) {
    console.error('The Advisor generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

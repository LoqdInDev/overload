const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all referral/loyalty programs
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM rl_programs ORDER BY created_at DESC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single program with its members
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM rl_programs WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const members = db.prepare('SELECT * FROM rl_members WHERE program_id = ? ORDER BY joined_at DESC').all(req.params.id);
    res.json({ ...item, members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a program
router.post('/', (req, res) => {
  try {
    const { name, type, reward_type, reward_value, rules, status } = req.body;
    const result = db.prepare(
      'INSERT INTO rl_programs (name, type, reward_type, reward_value, rules, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, type || null, reward_type || null, reward_value || null, rules || null, status || 'active');
    const item = db.prepare('SELECT * FROM rl_programs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a program
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM rl_programs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, type, reward_type, reward_value, rules, status } = req.body;
    db.prepare(
      'UPDATE rl_programs SET name = ?, type = ?, reward_type = ?, reward_value = ?, rules = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      name || existing.name,
      type !== undefined ? type : existing.type,
      reward_type !== undefined ? reward_type : existing.reward_type,
      reward_value !== undefined ? reward_value : existing.reward_value,
      rules !== undefined ? rules : existing.rules,
      status || existing.status,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM rl_programs WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a program
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM rl_programs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM rl_members WHERE program_id = ?').run(req.params.id);
    db.prepare('DELETE FROM rl_programs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /members - add a member to a program
router.post('/members', (req, res) => {
  try {
    const { program_id, customer_name, email, referrals, points, tier } = req.body;
    const result = db.prepare(
      'INSERT INTO rl_members (program_id, customer_name, email, referrals, points, tier) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(program_id, customer_name || null, email || null, referrals || 0, points || 0, tier || null);
    const item = db.prepare('SELECT * FROM rl_members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /members/list - list all members
router.get('/members/list', (req, res) => {
  try {
    const members = db.prepare('SELECT m.*, p.name as program_name FROM rl_members m LEFT JOIN rl_programs p ON m.program_id = p.id ORDER BY m.joined_at DESC').all();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI assistant specializing in referral programs and customer loyalty strategies. You help design reward structures, referral incentives, and retention programs.`;

    const userPrompt = rawPrompt || `Design a referral and loyalty program. Include reward tiers, referral incentives, point structures, and engagement strategies.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'program-design' });
  } catch (error) {
    console.error('Referral & Loyalty generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

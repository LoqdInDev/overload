const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all referral/loyalty programs
router.get('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const items = db.prepare('SELECT * FROM rl_programs WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single program with its members
router.get('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const item = db.prepare('SELECT * FROM rl_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const members = db.prepare('SELECT * FROM rl_members WHERE program_id = ? AND workspace_id = ? ORDER BY joined_at DESC').all(req.params.id, wsId);
    res.json({ ...item, members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a program
router.post('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, type, reward_type, reward_value, rules, status } = req.body;
    const result = db.prepare(
      'INSERT INTO rl_programs (name, type, reward_type, reward_value, rules, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, type || null, reward_type || null, reward_value || null, rules || null, status || 'active', wsId);
    const item = db.prepare('SELECT * FROM rl_programs WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a program
router.put('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM rl_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, type, reward_type, reward_value, rules, status } = req.body;
    db.prepare(
      'UPDATE rl_programs SET name = ?, type = ?, reward_type = ?, reward_value = ?, rules = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      name || existing.name,
      type !== undefined ? type : existing.type,
      reward_type !== undefined ? reward_type : existing.reward_type,
      reward_value !== undefined ? reward_value : existing.reward_value,
      rules !== undefined ? rules : existing.rules,
      status || existing.status,
      req.params.id,
      wsId
    );
    const updated = db.prepare('SELECT * FROM rl_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a program
router.delete('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM rl_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM rl_members WHERE program_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM rl_programs WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /members - add a member to a program
router.post('/members', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { program_id, customer_name, email, referrals, points, tier } = req.body;
    const result = db.prepare(
      'INSERT INTO rl_members (program_id, customer_name, email, referrals, points, tier, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(program_id, customer_name || null, email || null, referrals || 0, points || 0, tier || null, wsId);
    const item = db.prepare('SELECT * FROM rl_members WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /members/list - list all members
router.get('/members/list', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const members = db.prepare('SELECT m.*, p.name as program_name FROM rl_members m LEFT JOIN rl_programs p ON m.program_id = p.id WHERE m.workspace_id = ? ORDER BY m.joined_at DESC').all(wsId);
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

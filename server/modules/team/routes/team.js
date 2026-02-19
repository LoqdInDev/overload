const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate team content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Team`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('team', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Team generation error:', error);
    sse.sendError(error);
  }
});

// Get all team members
router.get('/members', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM tm_members';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const members = db.prepare(query).all(...params);
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add a new team member
router.post('/members', (req, res) => {
  try {
    const { name, email, role, permissions, avatar_url } = req.body;
    const result = db.prepare(
      'INSERT INTO tm_members (name, email, role, permissions, avatar_url) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, role || 'member', JSON.stringify(permissions || []), avatar_url);

    logActivity('team', 'add', `Added team member: ${name}`, 'Member');
    res.json({ id: result.lastInsertRowid, name, email, role: role || 'member' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Update a team member
router.put('/members/:id', (req, res) => {
  try {
    const member = db.prepare('SELECT * FROM tm_members WHERE id = ?').get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { name, email, role, permissions, avatar_url, status } = req.body;
    db.prepare(
      'UPDATE tm_members SET name = ?, email = ?, role = ?, permissions = ?, avatar_url = ?, status = ? WHERE id = ?'
    ).run(
      name || member.name, email || member.email, role || member.role,
      permissions ? JSON.stringify(permissions) : member.permissions,
      avatar_url || member.avatar_url, status || member.status, req.params.id
    );

    logActivity('team', 'update', `Updated team member: ${name || member.name}`, 'Member');
    res.json({ id: req.params.id, updated: true });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Remove a team member
router.delete('/members/:id', (req, res) => {
  try {
    const member = db.prepare('SELECT * FROM tm_members WHERE id = ?').get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    db.prepare('DELETE FROM tm_members WHERE id = ?').run(req.params.id);

    logActivity('team', 'remove', `Removed team member: ${member.name}`, 'Member');
    res.json({ success: true, message: `Member "${member.name}" removed` });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Send an invitation
router.post('/invites', (req, res) => {
  try {
    const { email, role, invited_by } = req.body;

    const existing = db.prepare('SELECT * FROM tm_invites WHERE email = ? AND status = ?').get(email, 'pending');
    if (existing) {
      return res.status(400).json({ error: 'An invitation is already pending for this email' });
    }

    const result = db.prepare(
      'INSERT INTO tm_invites (email, role, invited_by) VALUES (?, ?, ?)'
    ).run(email, role || 'member', invited_by);

    logActivity('team', 'invite', `Sent invitation to: ${email}`, 'Invite');
    res.json({ id: result.lastInsertRowid, email, role: role || 'member', status: 'pending' });
  } catch (error) {
    console.error('Error sending invite:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

module.exports = router;

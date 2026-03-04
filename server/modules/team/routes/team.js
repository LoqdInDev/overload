const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate team content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Team`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('team', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Team generation error:', error);
    sse.sendError(error);
  }
});

// Get all team members
router.get('/members', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { status } = req.query;
    let query = 'SELECT * FROM tm_members';
    const conditions = ['workspace_id = ?'];
    const params = [wsId];
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
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
    const wsId = req.workspace.id;
    const { name, email, role, permissions, avatar_url } = req.body;
    const result = db.prepare(
      'INSERT INTO tm_members (name, email, role, permissions, avatar_url, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, email, role || 'member', JSON.stringify(permissions || []), avatar_url, wsId);

    logActivity('team', 'add', `Added team member: ${name}`, 'Member', null, wsId);
    res.json({ id: result.lastInsertRowid, name, email, role: role || 'member' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Update a team member
router.put('/members/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const member = db.prepare('SELECT * FROM tm_members WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { name, email, role, permissions, avatar_url, status } = req.body;
    db.prepare(
      'UPDATE tm_members SET name = ?, email = ?, role = ?, permissions = ?, avatar_url = ?, status = ? WHERE id = ? AND workspace_id = ?'
    ).run(
      name || member.name, email || member.email, role || member.role,
      permissions ? JSON.stringify(permissions) : member.permissions,
      avatar_url || member.avatar_url, status || member.status, req.params.id, wsId
    );

    logActivity('team', 'update', `Updated team member: ${name || member.name}`, 'Member', null, wsId);
    res.json({ id: req.params.id, updated: true });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Remove a team member
router.delete('/members/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const member = db.prepare('SELECT * FROM tm_members WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    db.prepare('DELETE FROM tm_members WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);

    logActivity('team', 'remove', `Removed team member: ${member.name}`, 'Member', null, wsId);
    res.json({ success: true, message: `Member "${member.name}" removed` });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Send an invitation
router.post('/invites', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { email, role, invited_by } = req.body;

    const existing = db.prepare('SELECT * FROM tm_invites WHERE email = ? AND status = ? AND workspace_id = ?').get(email, 'pending', wsId);
    if (existing) {
      return res.status(400).json({ error: 'An invitation is already pending for this email' });
    }

    const result = db.prepare(
      'INSERT INTO tm_invites (email, role, invited_by, workspace_id) VALUES (?, ?, ?, ?)'
    ).run(email, role || 'member', invited_by, wsId);

    logActivity('team', 'invite', `Sent invitation to: ${email}`, 'Invite', null, wsId);
    res.json({ id: result.lastInsertRowid, email, role: role || 'member', status: 'pending' });
  } catch (error) {
    console.error('Error sending invite:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// POST /generate-role-brief — generate a role performance brief
router.post('/generate-role-brief', async (req, res) => {
  const { name, role, email, role_name, responsibilities } = req.body;
  const effectiveRole = role_name || role || 'Team Member';
  const effectiveName = name || 'Team Member';
  if (!effectiveRole) return res.status(400).json({ error: 'role required' });

  try {
    const { text } = await generateTextWithClaude(`You are an HR and team performance expert. Generate a concise role brief for:

Name: ${effectiveName}
Role: ${effectiveRole}
${email ? `Email: ${email}` : ''}
${responsibilities ? `Responsibilities: ${responsibilities}` : ''}

Return JSON:
{
  "kpis": ["<KPI 1>", "<KPI 2>", "<KPI 3>"],
  "success_metrics": ["<30-day success metric>", "<60-day metric>", "<90-day metric>"],
  "collaboration": ["<who they work with and how>", "<cross-team touchpoint>"],
  "summary": "<one-sentence role summary>"
}

Only return JSON.`);
    try { res.json(JSON.parse(text.trim())); }
    catch { res.json({ kpis: ['Task completion rate', 'Quality score', 'Deadlines met'], success_metrics: ['Fully onboarded', 'First project delivered', 'Autonomous delivery'], collaboration: ['Collaborate with team lead weekly', 'Cross-functional standups'], summary: `${effectiveRole} responsible for delivering high-quality work aligned with team goals.` }); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

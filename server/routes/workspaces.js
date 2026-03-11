const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/requireAuth');

// All workspace routes require auth (but NOT requireWorkspace — that would be circular)
router.use(requireAuth);

// GET / — list workspaces the user belongs to
router.get('/', async (req, res) => {
  try {
    const workspaces = await db.prepare(`
      SELECT w.*, wm.role
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ?
      ORDER BY w.created_at ASC
    `).all(req.user.id);
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / — create a new workspace
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const id = crypto.randomUUID();
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 8);

    const workspace = await db.transaction(async () => {
      await db.prepare(
        'INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)'
      ).run(id, name.trim(), slug, req.user.id);

      await db.prepare(
        'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)'
      ).run(crypto.randomUUID(), id, req.user.id, 'owner');

      return await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    });

    res.status(201).json({ ...workspace, role: 'owner' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id — get workspace details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this workspace' });
    }

    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({ ...workspace, role: membership.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id — update workspace (owner only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can update settings' });
    }

    const { name } = req.body;
    if (name && name.trim()) {
      db.prepare(
        "UPDATE workspaces SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(name.trim(), id);
    }

    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    res.json({ ...workspace, role: 'owner' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id — delete workspace (owner only, cannot delete last workspace)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can delete a workspace' });
    }

    // Ensure user has at least one other workspace
    const count = db.prepare(
      'SELECT COUNT(*) as c FROM workspace_members WHERE user_id = ?'
    ).get(req.user.id);

    if (count.c <= 1) {
      return res.status(400).json({ error: 'Cannot delete your only workspace' });
    }

    await db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id/members — list workspace members
router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this workspace' });
    }

    const members = await db.prepare(`
      SELECT wm.id, wm.role, wm.joined_at, u.id as user_id, u.email, u.display_name, u.avatar_url
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
      ORDER BY wm.joined_at ASC
    `).all(id);

    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:id/members — invite a member (owner only)
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can invite members' });
    }

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const validRoles = ['editor', 'viewer'];
    const memberRole = validRoles.includes(role) ? role : 'editor';

    // Find user by email
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'No user found with that email. They must sign up first.' });
    }

    // Check if already a member
    const existing = await db.prepare(
      'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, user.id);

    if (existing) {
      return res.status(409).json({ error: 'User is already a member of this workspace' });
    }

    db.prepare(
      'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)'
    ).run(crypto.randomUUID(), id, user.id, memberRole);

    res.status(201).json({ success: true, email, role: memberRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id/members/:userId — update member role (owner only)
router.put('/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can change roles' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const { role } = req.body;
    const validRoles = ['editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be editor or viewer.' });
    }

    await db.prepare(
      'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?'
    ).run(role, id, userId);

    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id/members/:userId — remove member (owner only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const membership = await db.prepare(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can remove members' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself. Transfer ownership or delete the workspace.' });
    }

    await db.prepare(
      'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).run(id, userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

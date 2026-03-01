const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/requireAuth');

// All GDPR routes require authentication
router.use(requireAuth);

// GET /api/gdpr/export — export all user data as JSON
router.get('/export', (req, res) => {
  try {
    const userId = req.user.id;

    // Gather user profile (exclude password_hash)
    const user = db.prepare(`
      SELECT id, email, display_name, avatar_url, role, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Gather workspace memberships
    const memberships = db.prepare(`
      SELECT wm.workspace_id, wm.role, wm.joined_at, w.name AS workspace_name, w.slug AS workspace_slug
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.user_id = ?
    `).all(userId);

    // Gather workspaces owned by user
    const ownedWorkspaces = db.prepare(`
      SELECT id, name, slug, created_at, updated_at
      FROM workspaces WHERE owner_id = ?
    `).all(userId);

    // Gather activity log entries for workspaces the user belongs to
    const workspaceIds = memberships.map(m => m.workspace_id);
    let activityLog = [];
    if (workspaceIds.length > 0) {
      const placeholders = workspaceIds.map(() => '?').join(',');
      activityLog = db.prepare(`
        SELECT id, module_id, action, title, detail, entity_id, workspace_id, created_at
        FROM activity_log WHERE workspace_id IN (${placeholders})
        ORDER BY created_at DESC LIMIT 1000
      `).all(...workspaceIds);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      memberships,
      ownedWorkspaces,
      activityLog,
    };

    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${userId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    console.error('GDPR export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// DELETE /api/gdpr/delete-account — delete user account and all associated data
router.delete('/delete-account', (req, res) => {
  try {
    const userId = req.user.id;

    const deleteAll = db.transaction(() => {
      // 1. Find workspaces owned by this user
      const ownedWorkspaces = db.prepare(
        'SELECT id FROM workspaces WHERE owner_id = ?'
      ).all(userId);
      const ownedIds = ownedWorkspaces.map(w => w.id);

      // 2. Delete activity log entries for owned workspaces
      if (ownedIds.length > 0) {
        const placeholders = ownedIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM activity_log WHERE workspace_id IN (${placeholders})`).run(...ownedIds);
      }

      // 3. Delete workspace members for owned workspaces
      if (ownedIds.length > 0) {
        const placeholders = ownedIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM workspace_members WHERE workspace_id IN (${placeholders})`).run(...ownedIds);
      }

      // 4. Delete all owned workspaces
      db.prepare('DELETE FROM workspaces WHERE owner_id = ?').run(userId);

      // 5. Remove user from any workspaces they are a member of (not owner)
      db.prepare('DELETE FROM workspace_members WHERE user_id = ?').run(userId);

      // 6. Delete refresh tokens for this user
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);

      // 7. Delete the user record
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    deleteAll();

    res.json({ success: true, message: 'Account and all associated data have been permanently deleted.' });
  } catch (error) {
    console.error('GDPR delete error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;

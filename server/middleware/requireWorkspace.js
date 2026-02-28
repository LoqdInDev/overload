const { db } = require('../db/database');

function requireWorkspace(req, res, next) {
  const workspaceId = req.headers['x-workspace-id'];

  if (!workspaceId) {
    // Fallback: use the user's first workspace
    const membership = db.prepare(
      'SELECT workspace_id, role FROM workspace_members WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1'
    ).get(req.user.id);

    if (!membership) {
      return res.status(400).json({
        error: 'No workspace found. Please create a workspace.',
        code: 'NO_WORKSPACE',
      });
    }

    req.workspace = { id: membership.workspace_id, role: membership.role };
    return next();
  }

  // Validate user is a member of this workspace
  const membership = db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, req.user.id);

  if (!membership) {
    return res.status(403).json({
      error: 'You do not have access to this workspace',
      code: 'WORKSPACE_FORBIDDEN',
    });
  }

  req.workspace = { id: workspaceId, role: membership.role };
  next();
}

module.exports = { requireWorkspace };

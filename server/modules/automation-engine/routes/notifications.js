const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// GET /notifications — list recent notifications
router.get('/notifications', (req, res) => {
  const wsId = req.workspace.id;
  const { limit = 20 } = req.query;
  const items = db.prepare(
    'SELECT * FROM ae_notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(wsId, Number(limit));

  const unreadCount = db.prepare(
    'SELECT COUNT(*) as count FROM ae_notifications WHERE read = 0 AND workspace_id = ?'
  ).get(wsId);

  res.json({
    items: items.map(n => ({ ...n, read: !!n.read })),
    unreadCount: unreadCount.count,
  });
});

// POST /notifications/:id/read — mark single as read
router.post('/notifications/:id/read', (req, res) => {
  const wsId = req.workspace.id;
  const result = db.prepare('UPDATE ae_notifications SET read = 1 WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
  if (result.changes === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});

// POST /notifications/read-all — mark all as read
router.post('/notifications/read-all', (req, res) => {
  const wsId = req.workspace.id;
  const result = db.prepare('UPDATE ae_notifications SET read = 1 WHERE read = 0 AND workspace_id = ?').run(wsId);
  res.json({ success: true, updated: result.changes });
});

module.exports = router;

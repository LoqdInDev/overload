const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { createNotification } = require('../db/schema');

// GET /approvals — list queue items
router.get('/approvals', (req, res) => {
  const { module: moduleId, status, priority, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM ae_approval_queue WHERE 1=1';
  const params = [];

  if (moduleId) {
    sql += ' AND module_id = ?';
    params.push(moduleId);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  } else {
    sql += ' AND status = ?';
    params.push('pending');
  }
  if (priority) {
    sql += ' AND priority = ?';
    params.push(priority);
  }

  sql += ' ORDER BY CASE priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, created_at DESC';
  sql += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ?').get('pending');

  res.json({
    items: rows.map(r => ({
      ...r,
      payload: r.payload ? JSON.parse(r.payload) : null,
    })),
    total: total.count,
  });
});

// GET /approvals/count — pending counts
router.get('/approvals/count', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ?').get('pending');
  const byModule = db.prepare(
    'SELECT module_id, COUNT(*) as count FROM ae_approval_queue WHERE status = ? GROUP BY module_id'
  ).all('pending');

  const pendingByModule = {};
  for (const row of byModule) {
    pendingByModule[row.module_id] = row.count;
  }

  res.json({
    total: total.count,
    byModule: pendingByModule,
  });
});

// GET /approvals/:id — single item
router.get('/approvals/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Approval item not found' });
  res.json({ ...row, payload: row.payload ? JSON.parse(row.payload) : null });
});

// POST /approvals/:id/approve
router.post('/approvals/:id/approve', (req, res) => {
  const item = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  db.prepare(`
    UPDATE ae_approval_queue SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?
  `).run(req.user?.id || 'system', req.params.id);

  // Log the approval action
  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at)
    VALUES (?, ?, 'copilot', ?, 'completed', ?, datetime('now'), datetime('now'))
  `).run(item.module_id, item.action_type, `Approved: ${item.title}`, item.id);

  logActivity(item.module_id, 'approved', item.title, `Approved automation action: ${item.description}`);
  createNotification('action_completed', `Approved: ${item.title}`, item.description, item.module_id);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/:id/reject
router.post('/approvals/:id/reject', (req, res) => {
  const item = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  const { notes } = req.body || {};

  db.prepare(`
    UPDATE ae_approval_queue SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ?, review_notes = ? WHERE id = ?
  `).run(req.user?.id || 'system', notes || null, req.params.id);

  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at)
    VALUES (?, ?, 'copilot', ?, 'cancelled', ?, datetime('now'), datetime('now'))
  `).run(item.module_id, item.action_type, `Rejected: ${item.title}`, item.id);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/:id/edit — edit payload then approve
router.post('/approvals/:id/edit', (req, res) => {
  const item = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  const { payload } = req.body;

  db.prepare(`
    UPDATE ae_approval_queue SET status = 'approved', payload = ?, reviewed_at = datetime('now'), reviewed_by = ?, review_notes = 'edited' WHERE id = ?
  `).run(JSON.stringify(payload), req.user?.id || 'system', req.params.id);

  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at)
    VALUES (?, ?, 'copilot', ?, 'completed', ?, datetime('now'), datetime('now'))
  `).run(item.module_id, item.action_type, `Edited & approved: ${item.title}`, item.id);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/batch — batch approve/reject
router.post('/approvals/batch', (req, res) => {
  const { ids, action } = req.body;
  if (!ids || !Array.isArray(ids) || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid batch request' });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const stmt = db.prepare(`
    UPDATE ae_approval_queue SET status = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ? AND status = 'pending'
  `);

  let updated = 0;
  for (const id of ids) {
    const result = stmt.run(newStatus, req.user?.id || 'system', id);
    updated += result.changes;
  }

  res.json({ success: true, updated });
});

module.exports = router;

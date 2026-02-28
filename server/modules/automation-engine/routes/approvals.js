const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { createNotification } = require('../db/schema');

// GET /approvals — list queue items
router.get('/approvals', (req, res) => {
  const wsId = req.workspace.id;
  const { module: moduleId, status, priority, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM ae_approval_queue WHERE workspace_id = ?';
  const params = [wsId];

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
  const total = db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ?').get('pending', wsId);

  res.json({
    items: rows.map(r => ({
      id: r.id,
      moduleId: r.module_id,
      title: r.title,
      description: r.description,
      actionType: r.action_type,
      priority: r.priority,
      confidence: r.ai_confidence != null ? Math.round(r.ai_confidence * 100) : null,
      payload: r.payload ? JSON.parse(r.payload) : null,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      reviewedBy: r.reviewed_by,
    })),
    total: total.count,
  });
});

// GET /approvals/count — pending counts
router.get('/approvals/count', (req, res) => {
  const wsId = req.workspace.id;
  const total = db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ?').get('pending', wsId);
  const byModule = db.prepare(
    'SELECT module_id, COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ? GROUP BY module_id'
  ).all('pending', wsId);

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
  const wsId = req.workspace.id;
  const row = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!row) return res.status(404).json({ error: 'Approval item not found' });
  res.json({
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    description: row.description,
    actionType: row.action_type,
    priority: row.priority,
    confidence: row.ai_confidence != null ? Math.round(row.ai_confidence * 100) : null,
    payload: row.payload ? JSON.parse(row.payload) : null,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  });
});

// POST /approvals/:id/approve
router.post('/approvals/:id/approve', (req, res) => {
  const wsId = req.workspace.id;
  const item = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  db.prepare(`
    UPDATE ae_approval_queue SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ? AND workspace_id = ?
  `).run(req.user?.id || 'system', req.params.id, wsId);

  // Log the approval action
  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at, workspace_id)
    VALUES (?, ?, 'copilot', ?, 'completed', ?, datetime('now'), datetime('now'), ?)
  `).run(item.module_id, item.action_type, `Approved: ${item.title}`, item.id, wsId);

  logActivity(item.module_id, 'approved', item.title, `Approved automation action: ${item.description}`, null, wsId);
  createNotification('action_completed', `Approved: ${item.title}`, item.description, item.module_id);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/:id/reject
router.post('/approvals/:id/reject', (req, res) => {
  const wsId = req.workspace.id;
  const item = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  const { notes } = req.body || {};

  db.prepare(`
    UPDATE ae_approval_queue SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ?, review_notes = ? WHERE id = ? AND workspace_id = ?
  `).run(req.user?.id || 'system', notes || null, req.params.id, wsId);

  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at, workspace_id)
    VALUES (?, ?, 'copilot', ?, 'cancelled', ?, datetime('now'), datetime('now'), ?)
  `).run(item.module_id, item.action_type, `Rejected: ${item.title}`, item.id, wsId);

  createNotification('action_failed', `Rejected: ${item.title}`, notes || item.description, item.module_id);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/:id/edit — edit payload then approve
router.post('/approvals/:id/edit', (req, res) => {
  const wsId = req.workspace.id;
  const item = db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  const { payload } = req.body;

  db.prepare(`
    UPDATE ae_approval_queue SET status = 'approved', payload = ?, reviewed_at = datetime('now'), reviewed_by = ?, review_notes = 'edited' WHERE id = ? AND workspace_id = ?
  `).run(JSON.stringify(payload), req.user?.id || 'system', req.params.id, wsId);

  db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at, workspace_id)
    VALUES (?, ?, 'copilot', ?, 'completed', ?, datetime('now'), datetime('now'), ?)
  `).run(item.module_id, item.action_type, `Edited & approved: ${item.title}`, item.id, wsId);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/batch — batch approve/reject
router.post('/approvals/batch', (req, res) => {
  const wsId = req.workspace.id;
  const { ids, action } = req.body;
  if (!ids || !Array.isArray(ids) || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid batch request' });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const stmt = db.prepare(`
    UPDATE ae_approval_queue SET status = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ? AND status = 'pending' AND workspace_id = ?
  `);

  let updated = 0;
  for (const id of ids) {
    const result = stmt.run(newStatus, req.user?.id || 'system', id, wsId);
    updated += result.changes;
  }

  res.json({ success: true, updated });
});

module.exports = router;

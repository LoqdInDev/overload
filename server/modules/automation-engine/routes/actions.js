const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// GET /actions — action log
router.get('/actions', (req, res) => {
  const wsId = req.workspace.id;
  const { module: moduleId, status, limit = 30, offset = 0 } = req.query;

  let sql = 'SELECT * FROM ae_action_log WHERE workspace_id = ?';
  const params = [wsId];

  if (moduleId) {
    sql += ' AND module_id = ?';
    params.push(moduleId);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    ...r,
    input_data: r.input_data ? JSON.parse(r.input_data) : null,
    output_data: r.output_data ? JSON.parse(r.output_data) : null,
  })));
});

// GET /actions/stats/:moduleId — per-module stats
router.get('/actions/stats/:moduleId', (req, res) => {
  const wsId = req.workspace.id;
  const { moduleId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const todayRows = db.prepare(
    'SELECT status, COUNT(*) as count FROM ae_action_log WHERE module_id = ? AND date(created_at) = ? AND workspace_id = ? GROUP BY status'
  ).all(moduleId, today, wsId);

  let todayTotal = 0, completed = 0, failed = 0;
  for (const r of todayRows) {
    todayTotal += r.count;
    if (r.status === 'completed') completed = r.count;
    if (r.status === 'failed') failed = r.count;
  }

  res.json({
    today: todayTotal,
    completed,
    failed,
    successRate: todayTotal > 0 ? Math.round((completed / todayTotal) * 100) : 100,
  });
});

// GET /actions/stats — summary counts
router.get('/actions/stats', (req, res) => {
  const wsId = req.workspace.id;
  const today = new Date().toISOString().split('T')[0];

  const todayCount = db.prepare(
    'SELECT COUNT(*) as count FROM ae_action_log WHERE date(created_at) = ? AND workspace_id = ?'
  ).get(today, wsId);

  const byStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM ae_action_log WHERE workspace_id = ? GROUP BY status'
  ).all(wsId);

  const byModule = db.prepare(
    'SELECT module_id, COUNT(*) as count FROM ae_action_log WHERE date(created_at) = ? AND workspace_id = ? GROUP BY module_id'
  ).all(today, wsId);

  const statusMap = {};
  for (const row of byStatus) statusMap[row.status] = row.count;

  const moduleMap = {};
  for (const row of byModule) moduleMap[row.module_id] = row.count;

  res.json({
    today: todayCount.count,
    completed: statusMap.completed || 0,
    failed: statusMap.failed || 0,
    queued: statusMap.queued || 0,
    byModule: moduleMap,
  });
});

// GET /status — global automation status for Command Center
router.get('/status', (req, res) => {
  const wsId = req.workspace.id;
  const modes = db.prepare('SELECT module_id, mode FROM ae_module_modes WHERE workspace_id = ?').all(wsId);
  const modeDistribution = { manual: 0, copilot: 0, autopilot: 0 };
  const moduleStatuses = {};
  for (const row of modes) {
    modeDistribution[row.mode] = (modeDistribution[row.mode] || 0) + 1;
    moduleStatuses[row.module_id] = row.mode;
  }

  const pendingCount = db.prepare(
    'SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ?'
  ).get('pending', wsId);

  const today = new Date().toISOString().split('T')[0];
  const todayActions = db.prepare(
    'SELECT COUNT(*) as count FROM ae_action_log WHERE date(created_at) = ? AND workspace_id = ?'
  ).get(today, wsId);

  const recentActions = db.prepare(
    'SELECT * FROM ae_action_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 15'
  ).all(wsId);

  res.json({
    modes: modeDistribution,
    moduleStatuses,
    pendingApprovals: pendingCount.count,
    todayActions: todayActions.count,
    recentActions: recentActions.map(r => ({
      ...r,
      input_data: r.input_data ? JSON.parse(r.input_data) : null,
      output_data: r.output_data ? JSON.parse(r.output_data) : null,
    })),
  });
});

module.exports = router;

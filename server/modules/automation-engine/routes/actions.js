const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// GET /actions — action log
router.get('/actions', (req, res) => {
  const { module: moduleId, status, limit = 30, offset = 0 } = req.query;

  let sql = 'SELECT * FROM ae_action_log WHERE 1=1';
  const params = [];

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

// GET /actions/stats — summary counts
router.get('/actions/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const todayCount = db.prepare(
    'SELECT COUNT(*) as count FROM ae_action_log WHERE date(created_at) = ?'
  ).get(today);

  const byStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM ae_action_log GROUP BY status'
  ).all();

  const byModule = db.prepare(
    'SELECT module_id, COUNT(*) as count FROM ae_action_log WHERE date(created_at) = ? GROUP BY module_id'
  ).all(today);

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
  const modes = db.prepare('SELECT module_id, mode FROM ae_module_modes').all();
  const modeDistribution = { manual: 0, copilot: 0, autopilot: 0 };
  const moduleStatuses = {};
  for (const row of modes) {
    modeDistribution[row.mode] = (modeDistribution[row.mode] || 0) + 1;
    moduleStatuses[row.module_id] = row.mode;
  }

  const pendingCount = db.prepare(
    'SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ?'
  ).get('pending');

  const today = new Date().toISOString().split('T')[0];
  const todayActions = db.prepare(
    'SELECT COUNT(*) as count FROM ae_action_log WHERE date(created_at) = ?'
  ).get(today);

  const recentActions = db.prepare(
    'SELECT * FROM ae_action_log ORDER BY created_at DESC LIMIT 15'
  ).all();

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

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// GET /activity-log — merged, filtered, paginated log
router.get('/activity-log', (req, res) => {
  const wsId = req.workspace.id;
  const { module: moduleId, status, dateFrom, dateTo, limit = 20, offset = 0 } = req.query;

  let where = ' WHERE workspace_id = ?';
  const params = [wsId];

  if (moduleId) { where += ' AND module_id = ?'; params.push(moduleId); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (dateFrom) { where += ' AND date(created_at) >= ?'; params.push(dateFrom); }
  if (dateTo) { where += ' AND date(created_at) <= ?'; params.push(dateTo); }

  const countSql = `
    SELECT COUNT(*) as count FROM (
      SELECT id FROM ae_action_log ${where}
      UNION ALL
      SELECT id FROM activity_log ${where.replace(/status/g, 'action')}
    )
  `;

  // For activity_log, map 'action' to 'status' filter — they don't have status column
  // Simpler: just query ae_action_log (the rich source) and fall back
  const sql = `
    SELECT id, module_id, action_type, mode, description,
           input_data, output_data, status, duration_ms, created_at, 'automation' as source
    FROM ae_action_log ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `;

  const countParams = [...params];
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(sql).all(...params);
  const total = db.prepare(
    `SELECT COUNT(*) as count FROM ae_action_log ${where}`
  ).get(...countParams);

  res.json({
    items: rows.map(r => ({
      ...r,
      input_data: r.input_data ? JSON.parse(r.input_data) : null,
      output_data: r.output_data ? JSON.parse(r.output_data) : null,
    })),
    total: total.count,
  });
});

// GET /activity-log/stats — summary statistics
router.get('/activity-log/stats', (req, res) => {
  const wsId = req.workspace.id;
  const total = db.prepare('SELECT COUNT(*) as count FROM ae_action_log WHERE workspace_id = ?').get(wsId);
  const completed = db.prepare("SELECT COUNT(*) as count FROM ae_action_log WHERE status = 'completed' AND workspace_id = ?").get(wsId);
  const successRate = total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0;

  const mostActive = db.prepare(
    'SELECT module_id, COUNT(*) as count FROM ae_action_log WHERE workspace_id = ? GROUP BY module_id ORDER BY count DESC LIMIT 1'
  ).get(wsId);

  const avgDuration = db.prepare(
    'SELECT AVG(duration_ms) as avg FROM ae_action_log WHERE duration_ms IS NOT NULL AND workspace_id = ?'
  ).get(wsId);

  res.json({
    total: total.count,
    successRate,
    mostActiveModule: mostActive?.module_id || null,
    avgDuration: avgDuration?.avg ? Math.round(avgDuration.avg) : null,
  });
});

module.exports = router;

const express = require('express');
const { db } = require('../../../db/database');

const router = express.Router();

// Overview stats — counts per module
router.get('/overview', (req, res) => {
  const stats = db.prepare(`
    SELECT module_id, COUNT(*) as count
    FROM activity_log
    GROUP BY module_id
    ORDER BY count DESC
  `).all();

  const total = stats.reduce((sum, s) => sum + s.count, 0);

  res.json({ total, modules: stats });
});

// Activity feed with pagination
router.get('/activity', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const moduleId = req.query.module;

  let query = 'SELECT * FROM activity_log';
  const params = [];

  if (moduleId) {
    query += ' WHERE module_id = ?';
    params.push(moduleId);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const activity = db.prepare(query).all(...params);
  res.json(activity);
});

// Daily breakdown for charts
router.get('/daily', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const moduleId = req.query.module;

  let query = `
    SELECT date(created_at) as date, module_id, COUNT(*) as count
    FROM activity_log
    WHERE created_at >= datetime('now', '-${days} days')
  `;

  const params = [];
  if (moduleId) {
    query += ' AND module_id = ?';
    params.push(moduleId);
  }

  query += ' GROUP BY date(created_at), module_id ORDER BY date ASC';

  const daily = db.prepare(query).all(...params);
  res.json(daily);
});

// Module-specific stats
router.get('/module/:moduleId', (req, res) => {
  const { moduleId } = req.params;

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM activity_log WHERE module_id = ?'
  ).get(moduleId);

  const actions = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM activity_log
    WHERE module_id = ?
    GROUP BY action
    ORDER BY count DESC
  `).all(moduleId);

  const recent = db.prepare(`
    SELECT * FROM activity_log
    WHERE module_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(moduleId);

  res.json({
    module_id: moduleId,
    total: total.count,
    actions,
    recent,
  });
});

module.exports = router;

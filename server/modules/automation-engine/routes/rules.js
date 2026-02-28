const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');

// GET /rules — list all rules
router.get('/rules', (req, res) => {
  const wsId = req.workspace.id;
  const { module: moduleId } = req.query;
  let sql = 'SELECT * FROM ae_rules WHERE workspace_id = ?';
  const params = [wsId];
  if (moduleId) {
    sql += ' AND module_id = ?';
    params.push(moduleId);
  }
  sql += ' ORDER BY module_id, created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    ...r,
    trigger_config: r.trigger_config ? JSON.parse(r.trigger_config) : null,
    action_config: r.action_config ? JSON.parse(r.action_config) : null,
    requires_approval: !!r.requires_approval,
  })));
});

// POST /rules — create rule
router.post('/rules', (req, res) => {
  const wsId = req.workspace.id;
  const { module_id, name, trigger_type, trigger_config, action_type, action_config, requires_approval } = req.body;
  if (!module_id || !name || !trigger_type || !trigger_config || !action_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = db.prepare(`
    INSERT INTO ae_rules (module_id, name, trigger_type, trigger_config, action_type, action_config, requires_approval, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    module_id, name, trigger_type,
    JSON.stringify(trigger_config),
    action_type,
    action_config ? JSON.stringify(action_config) : null,
    requires_approval ? 1 : 0,
    wsId
  );
  logActivity(module_id, 'rule_created', name, `Created automation rule: ${name}`, null, wsId);
  res.json({ success: true, id: result.lastInsertRowid });
});

// PUT /rules/:id — update rule
router.put('/rules/:id', (req, res) => {
  const wsId = req.workspace.id;
  const rule = db.prepare('SELECT * FROM ae_rules WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  const fields = [];
  const params = [];
  const allowed = ['name', 'trigger_type', 'action_type', 'requires_approval', 'status', 'module_id'];
  const jsonFields = ['trigger_config', 'action_config'];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(key === 'requires_approval' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  for (const key of jsonFields) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(JSON.stringify(req.body[key]));
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id, wsId);
  db.prepare(`UPDATE ae_rules SET ${fields.join(', ')} WHERE id = ? AND workspace_id = ?`).run(...params);
  res.json({ success: true, id: Number(req.params.id) });
});

// DELETE /rules/:id — delete rule
router.delete('/rules/:id', (req, res) => {
  const wsId = req.workspace.id;
  const rule = db.prepare('SELECT * FROM ae_rules WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  db.prepare('DELETE FROM ae_rules WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
  logActivity(rule.module_id, 'rule_deleted', rule.name, `Deleted automation rule: ${rule.name}`, null, wsId);
  res.json({ success: true });
});

module.exports = router;

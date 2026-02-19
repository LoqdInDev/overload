const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate scheduler content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Scheduler`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('scheduler', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Scheduler generation error:', error);
    sse.sendError(error);
  }
});

// Get all scheduled tasks
router.get('/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM sc_scheduled_tasks ORDER BY created_at DESC').all();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new scheduled task
router.post('/tasks', (req, res) => {
  try {
    const { name, module, action, config, schedule_type, schedule_value, next_run } = req.body;
    const result = db.prepare(
      'INSERT INTO sc_scheduled_tasks (name, module, action, config, schedule_type, schedule_value, next_run) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, module, action, JSON.stringify(config || {}), schedule_type, schedule_value, next_run);

    logActivity('scheduler', 'create', `Created scheduled task: ${name}`, 'Task');
    res.json({ id: result.lastInsertRowid, name, schedule_type, schedule_value });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get a specific task with its logs
router.get('/tasks/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM sc_scheduled_tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const logs = db.prepare('SELECT * FROM sc_task_logs WHERE task_id = ? ORDER BY executed_at DESC LIMIT 20').all(req.params.id);
    res.json({ ...task, logs });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Delete a scheduled task
router.delete('/tasks/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM sc_scheduled_tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    db.prepare('DELETE FROM sc_task_logs WHERE task_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sc_scheduled_tasks WHERE id = ?').run(req.params.id);

    logActivity('scheduler', 'delete', `Deleted scheduled task: ${task.name}`, 'Task');
    res.json({ success: true, message: `Task "${task.name}" deleted` });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;

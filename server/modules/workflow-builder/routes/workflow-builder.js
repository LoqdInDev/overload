const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate workflow content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Workflow Builder`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('workflow-builder', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Workflow Builder generation error:', error);
    sse.sendError(error);
  }
});

// Get all workflows
router.get('/workflows', (req, res) => {
  try {
    const workflows = db.prepare('SELECT * FROM wf_workflows ORDER BY created_at DESC').all();
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Create a new workflow
router.post('/workflows', (req, res) => {
  try {
    const { name, description, trigger_type, trigger_config, steps } = req.body;
    const result = db.prepare(
      'INSERT INTO wf_workflows (name, description, trigger_type, trigger_config) VALUES (?, ?, ?, ?)'
    ).run(name, description, trigger_type, JSON.stringify(trigger_config || {}));

    const workflowId = result.lastInsertRowid;

    if (steps && Array.isArray(steps)) {
      const insertStep = db.prepare(
        'INSERT INTO wf_steps (workflow_id, step_order, module, action, config) VALUES (?, ?, ?, ?, ?)'
      );
      steps.forEach((step, index) => {
        insertStep.run(workflowId, index + 1, step.module, step.action, JSON.stringify(step.config || {}));
      });
    }

    logActivity('workflow-builder', 'create', `Created workflow: ${name}`, 'Workflow');
    res.json({ id: workflowId, name, description });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Get a specific workflow with its steps
router.get('/workflows/:id', (req, res) => {
  try {
    const workflow = db.prepare('SELECT * FROM wf_workflows WHERE id = ?').get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const steps = db.prepare('SELECT * FROM wf_steps WHERE workflow_id = ? ORDER BY step_order').all(req.params.id);
    const runs = db.prepare('SELECT * FROM wf_runs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 10').all(req.params.id);
    res.json({ ...workflow, steps, runs });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Run a workflow
router.post('/workflows/:id/run', async (req, res) => {
  try {
    const workflow = db.prepare('SELECT * FROM wf_workflows WHERE id = ?').get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const now = new Date().toISOString();
    const runResult = db.prepare(
      'INSERT INTO wf_runs (workflow_id, status, started_at) VALUES (?, ?, ?)'
    ).run(req.params.id, 'running', now);

    db.prepare('UPDATE wf_workflows SET run_count = run_count + 1, last_run = ? WHERE id = ?').run(now, req.params.id);

    const runId = runResult.lastInsertRowid;
    const steps = db.prepare('SELECT * FROM wf_steps WHERE workflow_id = ? ORDER BY step_order').all(req.params.id);

    const logs = [`Workflow "${workflow.name}" started at ${now}`, `Executing ${steps.length} step(s)...`];
    steps.forEach((step) => {
      logs.push(`Step ${step.step_order}: ${step.module} -> ${step.action}`);
    });
    logs.push('Workflow completed.');

    db.prepare('UPDATE wf_runs SET status = ?, completed_at = ?, logs = ? WHERE id = ?')
      .run('completed', new Date().toISOString(), JSON.stringify(logs), runId);

    logActivity('workflow-builder', 'run', `Ran workflow: ${workflow.name}`, 'Workflow execution');
    res.json({ runId, status: 'completed', logs });
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

module.exports = router;

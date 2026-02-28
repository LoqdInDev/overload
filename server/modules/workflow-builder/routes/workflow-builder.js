const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate workflow content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Workflow Builder`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('workflow-builder', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Workflow Builder generation error:', error);
    sse.sendError(error);
  }
});

// Get all workflows
router.get('/workflows', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflows = db.prepare('SELECT * FROM wf_workflows WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Create a new workflow
router.post('/workflows', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, description, trigger_type, trigger_config, steps } = req.body;
    const result = db.prepare(
      'INSERT INTO wf_workflows (name, description, trigger_type, trigger_config, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description, trigger_type, JSON.stringify(trigger_config || {}), wsId);

    const workflowId = result.lastInsertRowid;

    if (steps && Array.isArray(steps)) {
      const insertStep = db.prepare(
        'INSERT INTO wf_steps (workflow_id, step_order, module, action, config, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
      );
      steps.forEach((step, index) => {
        insertStep.run(workflowId, index + 1, step.module, step.action, JSON.stringify(step.config || {}), wsId);
      });
    }

    logActivity('workflow-builder', 'create', `Created workflow: ${name}`, 'Workflow', null, wsId);
    res.json({ id: workflowId, name, description });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Get a specific workflow with its steps
router.get('/workflows/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflow = db.prepare('SELECT * FROM wf_workflows WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const steps = db.prepare('SELECT * FROM wf_steps WHERE workflow_id = ? AND workspace_id = ? ORDER BY step_order').all(req.params.id, wsId);
    const runs = db.prepare('SELECT * FROM wf_runs WHERE workflow_id = ? AND workspace_id = ? ORDER BY started_at DESC LIMIT 10').all(req.params.id, wsId);
    res.json({ ...workflow, steps, runs });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Run a workflow
router.post('/workflows/:id/run', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflow = db.prepare('SELECT * FROM wf_workflows WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const now = new Date().toISOString();
    const runResult = db.prepare(
      'INSERT INTO wf_runs (workflow_id, status, started_at, workspace_id) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'running', now, wsId);

    db.prepare('UPDATE wf_workflows SET run_count = run_count + 1, last_run = ? WHERE id = ? AND workspace_id = ?').run(now, req.params.id, wsId);

    const runId = runResult.lastInsertRowid;
    const steps = db.prepare('SELECT * FROM wf_steps WHERE workflow_id = ? AND workspace_id = ? ORDER BY step_order').all(req.params.id, wsId);

    const logs = [`Workflow "${workflow.name}" started at ${now}`, `Executing ${steps.length} step(s)...`];
    steps.forEach((step) => {
      logs.push(`Step ${step.step_order}: ${step.module} -> ${step.action}`);
    });
    logs.push('Workflow completed.');

    db.prepare('UPDATE wf_runs SET status = ?, completed_at = ?, logs = ? WHERE id = ? AND workspace_id = ?')
      .run('completed', new Date().toISOString(), JSON.stringify(logs), runId, wsId);

    logActivity('workflow-builder', 'run', `Ran workflow: ${workflow.name}`, 'Workflow execution', null, wsId);
    res.json({ runId, status: 'completed', logs });
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

module.exports = router;

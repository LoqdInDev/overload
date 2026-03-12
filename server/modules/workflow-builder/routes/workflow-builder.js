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
    await logActivity('workflow-builder', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Workflow Builder generation error:', error);
    sse.sendError(error);
  }
});

// Get all workflows
router.get('/workflows', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflows = await db.prepare('SELECT * FROM wf_workflows WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Create a new workflow
router.post('/workflows', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, description, trigger_type, trigger_config, steps } = req.body;
    const workflowId = await db.transaction(async (tx) => {
      const result = await tx.prepare(
        'INSERT INTO wf_workflows (name, description, trigger_type, trigger_config, workspace_id) VALUES (?, ?, ?, ?, ?)'
      ).run(name, description, trigger_type, JSON.stringify(trigger_config || {}), wsId);

      const wfId = result.lastInsertRowid;

      if (steps && Array.isArray(steps)) {
        for (let index = 0; index < steps.length; index++) {
          const step = steps[index];
          await tx.prepare(
            'INSERT INTO wf_steps (workflow_id, step_order, module, action, config, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(wfId, index + 1, step.module, step.action, JSON.stringify(step.config || {}), wsId);
        }
      }

      return wfId;
    });

    await logActivity('workflow-builder', 'create', `Created workflow: ${name}`, 'Workflow', null, wsId);
    res.json({ id: workflowId, name, description });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update a workflow
router.put('/workflows/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, description, trigger_type, status } = req.body;
    await db.prepare(
      'UPDATE wf_workflows SET name = COALESCE(?, name), description = COALESCE(?, description), trigger_type = COALESCE(?, trigger_type), status = COALESCE(?, status) WHERE id = ? AND workspace_id = ?'
    ).run(name, description, trigger_type, status, req.params.id, wsId);
    const wf = await db.prepare('SELECT * FROM wf_workflows WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(wf || { error: 'not found' });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Get a specific workflow with its steps
router.get('/workflows/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflow = await db.prepare('SELECT * FROM wf_workflows WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const steps = await db.prepare('SELECT * FROM wf_steps WHERE workflow_id = ? AND workspace_id = ? ORDER BY step_order').all(req.params.id, wsId);
    const runs = await db.prepare('SELECT * FROM wf_runs WHERE workflow_id = ? AND workspace_id = ? ORDER BY started_at DESC LIMIT 10').all(req.params.id, wsId);
    res.json({ ...workflow, steps, runs });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Delete a workflow
router.delete('/workflows/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflow = await db.prepare('SELECT * FROM wf_workflows WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await db.transaction(async (tx) => {
      await tx.prepare('DELETE FROM wf_runs WHERE workflow_id = ? AND workspace_id = ?').run(req.params.id, wsId);
      await tx.prepare('DELETE FROM wf_steps WHERE workflow_id = ? AND workspace_id = ?').run(req.params.id, wsId);
      await tx.prepare('DELETE FROM wf_workflows WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    });

    await logActivity('workflow-builder', 'delete', `Deleted workflow: ${workflow.name}`, 'Workflow', null, wsId);
    res.json({ success: true, deleted: workflow });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ── Step executor: runs a single workflow step against its target module ──
async function executeStep(step, wsId, workflowName) {
  const config = typeof step.config === 'string' ? JSON.parse(step.config || '{}') : (step.config || {});
  const mod = step.module || 'general';
  const action = step.action || 'generate_content';

  // Build an AI prompt scoped to the module + action
  const promptParts = [`You are an expert marketing assistant executing an automated workflow step.`,
    `Workflow: ${workflowName}`,
    `Module: ${mod}`,
    `Action: ${action}`];
  if (config.topic) promptParts.push(`Topic: ${config.topic}`);
  if (config.audience) promptParts.push(`Audience: ${config.audience}`);
  if (config.tone) promptParts.push(`Tone: ${config.tone}`);
  if (config.prompt) promptParts.push(`Instructions: ${config.prompt}`);
  if (config.platforms) promptParts.push(`Platforms: ${Array.isArray(config.platforms) ? config.platforms.join(', ') : config.platforms}`);
  if (config.template_type) promptParts.push(`Template: ${config.template_type}`);
  if (config.subject) promptParts.push(`Subject: ${config.subject}`);
  if (config.budget_change) promptParts.push(`Budget adjustment: ${config.budget_change}%`);

  // Action-specific prompts
  const actionPrompts = {
    generate_content: 'Generate high-quality marketing content based on the above context. Output the complete content ready to use.',
    publish_blog: 'Write a complete blog post (title, introduction, 3-5 sections with headers, conclusion). Output in markdown.',
    schedule_post: 'Create a social media post with caption, hashtags, and optimal posting notes for the target platform.',
    send_campaign: 'Write an email campaign with subject line, preview text, and full HTML-ready email body.',
    respond_review: 'Draft a professional, empathetic response to a customer review. Keep under 100 words.',
    adjust_budget: 'Analyze and recommend specific budget adjustments with reasoning. Output as JSON: { "changes": [{ "campaign": "...", "action": "increase|decrease|pause", "amount_pct": N, "reason": "..." }] }',
    generate_report: 'Generate a comprehensive performance summary report with insights and action items.',
    update_meta: 'Generate optimized SEO meta title (60 chars), meta description (155 chars), and H1 tag.',
    optimize_keywords: 'Perform keyword gap analysis and provide ranked keyword recommendations.',
  };
  promptParts.push(actionPrompts[action] || actionPrompts.generate_content);

  const { text } = await generateTextWithClaude(promptParts.join('\n'));

  // Save generated content to the appropriate module database
  const crypto = require('crypto');
  const genId = () => crypto.randomUUID();
  const saveTargets = {
    content: { table: 'cc_projects', cols: '(id, title, content, type, workspace_id)', vals: [genId(), workflowName + ' — generated', text, action === 'publish_blog' ? 'blog' : 'brief', wsId] },
    social: { table: 'sm_posts', cols: '(platform, post_type, caption, status, workspace_id)', vals: [config.platforms || 'instagram', 'feed', text, 'draft', wsId] },
    'email-sms': { table: 'es_campaigns', cols: '(id, name, content, type, status, workspace_id)', vals: [genId(), workflowName + ' — email', text, 'email', 'draft', wsId] },
    seo: { table: 'cc_projects', cols: '(id, title, content, type, workspace_id)', vals: [genId(), workflowName + ' — SEO', text, 'seo_brief', wsId] },
    reviews: { table: 'cc_projects', cols: '(id, title, content, type, workspace_id)', vals: [genId(), workflowName + ' — review response', text, 'review_response', wsId] },
    reports: { table: 'cc_projects', cols: '(id, title, content, type, workspace_id)', vals: [genId(), workflowName + ' — report', text, 'report', wsId] },
  };

  const target = saveTargets[mod];
  if (target) {
    try {
      const placeholders = target.vals.map(() => '?').join(', ');
      await db.prepare(`INSERT INTO ${target.table} ${target.cols} VALUES (${placeholders})`).run(...target.vals);
    } catch (saveErr) {
      console.warn(`[Workflow] Could not save to ${target.table}:`, saveErr.message);
    }
  }

  return { module: mod, action, output: text.substring(0, 500), saved: !!target };
}

// Run a workflow — executes each step sequentially via AI
router.post('/workflows/:id/run', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const workflow = await db.prepare('SELECT * FROM wf_workflows WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const now = new Date().toISOString();
    const steps = await db.prepare('SELECT * FROM wf_steps WHERE workflow_id = ? AND workspace_id = ? ORDER BY step_order').all(req.params.id, wsId);

    // Create the run record
    const runResult = await db.prepare(
      'INSERT INTO wf_runs (workflow_id, status, started_at, workspace_id) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'running', now, wsId);
    const runId = runResult.lastInsertRowid;

    await db.prepare('UPDATE wf_workflows SET run_count = run_count + 1, last_run = ? WHERE id = ? AND workspace_id = ?').run(now, req.params.id, wsId);

    // Execute each step sequentially
    const logs = [`Workflow "${workflow.name}" started at ${now}`, `Executing ${steps.length} step(s)...`];
    const stepResults = [];
    let failed = false;

    for (const step of steps) {
      const stepStart = Date.now();
      try {
        logs.push(`Step ${step.step_order}: ${step.module} → ${step.action} — executing...`);
        const result = await executeStep(step, wsId, workflow.name);
        const duration = Date.now() - stepStart;
        logs.push(`Step ${step.step_order}: completed in ${duration}ms${result.saved ? ' (saved to DB)' : ''}`);
        stepResults.push({ step: step.step_order, status: 'completed', duration, ...result });
      } catch (stepErr) {
        const duration = Date.now() - stepStart;
        logs.push(`Step ${step.step_order}: FAILED after ${duration}ms — ${stepErr.message}`);
        stepResults.push({ step: step.step_order, status: 'failed', error: stepErr.message, duration });
        failed = true;
        // Continue executing remaining steps even if one fails
      }
    }

    const finalStatus = failed ? 'partial' : 'completed';
    logs.push(`Workflow ${finalStatus} at ${new Date().toISOString()}`);

    await db.prepare('UPDATE wf_runs SET status = ?, completed_at = ?, logs = ? WHERE id = ? AND workspace_id = ?')
      .run(finalStatus, new Date().toISOString(), JSON.stringify(logs), runId, wsId);

    await logActivity('workflow-builder', 'run', `Ran workflow: ${workflow.name} (${finalStatus})`, 'Workflow execution', null, wsId);
    res.json({ runId, status: finalStatus, logs, stepResults });
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

// POST /suggest-workflow — SSE: AI-suggest a workflow for a business goal
router.post('/suggest-workflow', async (req, res) => {
  const { goal_description, goal, business_type } = req.body;
  const effectiveGoal = goal_description || goal;
  if (!effectiveGoal) { res.status(400).json({ error: 'goal required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a marketing automation expert. Design a workflow for:

Business Goal: ${effectiveGoal}
Business Type: ${business_type || 'E-commerce/Marketing'}

Design a complete automation workflow:

## Trigger
(what starts this workflow — be specific: form submit, purchase, tag added, etc.)

## Conditions/Filters
(who qualifies: audience segment, behavior conditions)

## Step 1: Immediate Action
(what happens first, within minutes)

## Step 2: Day 1 Action
(follow-up within 24 hours)

## Step 3: Day 3-7 Action
(mid-sequence touchpoint)

## Step 4: Day 14+ Action
(long-term nurture)

## Exit Conditions
(what removes someone from this workflow)

## Expected Results
(realistic outcomes from this workflow)

## Integration Requirements
(what tools/modules this workflow connects to)

Be specific and actionable. Name actual actions (send email, add tag, create task, etc.).`;

  try {
    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    sse.sendResult({ content: text });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

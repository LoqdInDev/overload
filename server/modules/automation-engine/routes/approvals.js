const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { createNotification } = require('../db/schema');
const { generateTextWithClaude } = require('../../../services/claude');
const { executeAction } = require('../../../services/ruleEngine');

// GET /approvals — list queue items
router.get('/approvals', async (req, res) => {
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

  const rows = await db.prepare(sql).all(...params);
  const totalRow = await db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ?').get('pending', wsId);

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
    total: totalRow.count,
  });
});

// GET /approvals/count — pending counts
router.get('/approvals/count', async (req, res) => {
  const wsId = req.workspace.id;
  const totalRow = await db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ?').get('pending', wsId);
  const byModule = await db.prepare(
    'SELECT module_id, COUNT(*) as count FROM ae_approval_queue WHERE status = ? AND workspace_id = ? GROUP BY module_id'
  ).all('pending', wsId);

  const pendingByModule = {};
  for (const row of byModule) {
    pendingByModule[row.module_id] = row.count;
  }

  res.json({
    total: totalRow.count,
    byModule: pendingByModule,
  });
});

// GET /approvals/:id — single item
router.get('/approvals/:id', async (req, res) => {
  const wsId = req.workspace.id;
  const row = await db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
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

// POST /approvals/:id/approve — approve AND execute the action
router.post('/approvals/:id/approve', async (req, res) => {
  const wsId = req.workspace.id;
  const item = await db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  // Mark as approved
  await db.prepare(`
    UPDATE ae_approval_queue SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND workspace_id = ?
  `).run(req.user?.id || 'system', req.params.id, wsId);

  // Build a rule-like object from the approval item so executeAction can process it
  const payload = item.payload ? JSON.parse(item.payload) : {};
  const ruleObj = {
    id: payload.rule_id || null,
    name: item.title.replace(/^Rule:\s*/, ''),
    module_id: item.module_id,
    action_type: item.action_type,
    action_config: JSON.stringify(payload),
    trigger_config: payload.trigger ? JSON.stringify(payload.trigger) : '{}',
  };

  // Execute the action (generates content via Claude + saves to module DB)
  const result = await executeAction(ruleObj, wsId, 'copilot');

  await logActivity(item.module_id, 'approved', item.title, `Approved & executed: ${item.description}`, null, wsId);

  res.json({ success: true, id: Number(req.params.id), executed: result.success, content: result.content || null });
});

// POST /approvals/:id/reject
router.post('/approvals/:id/reject', async (req, res) => {
  const wsId = req.workspace.id;
  const item = await db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  const { notes } = req.body || {};

  await db.transaction(async (tx) => {
    await tx.prepare(`
      UPDATE ae_approval_queue SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, review_notes = ? WHERE id = ? AND workspace_id = ?
    `).run(req.user?.id || 'system', notes || null, req.params.id, wsId);

    await tx.prepare(`
      INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at, workspace_id)
      VALUES (?, ?, 'copilot', ?, 'cancelled', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `).run(item.module_id, item.action_type, `Rejected: ${item.title}`, item.id, wsId);
  });

  createNotification('action_failed', `Rejected: ${item.title}`, notes || item.description, item.module_id, wsId);

  res.json({ success: true, id: Number(req.params.id) });
});

// POST /approvals/:id/edit — edit payload then approve & execute
router.post('/approvals/:id/edit', async (req, res) => {
  const wsId = req.workspace.id;
  const item = await db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'pending') return res.status(400).json({ error: 'Item is not pending' });

  const { payload } = req.body;

  // Mark as approved with edited payload
  await db.prepare(`
    UPDATE ae_approval_queue SET status = 'approved', payload = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, review_notes = 'edited' WHERE id = ? AND workspace_id = ?
  `).run(JSON.stringify(payload), req.user?.id || 'system', req.params.id, wsId);

  // Execute with the edited payload
  const ruleObj = {
    id: payload.rule_id || null,
    name: item.title.replace(/^Rule:\s*/, ''),
    module_id: item.module_id,
    action_type: item.action_type,
    action_config: JSON.stringify(payload),
    trigger_config: payload.trigger ? JSON.stringify(payload.trigger) : '{}',
  };
  const result = await executeAction(ruleObj, wsId, 'copilot');

  res.json({ success: true, id: Number(req.params.id), executed: result.success, content: result.content || null });
});

// POST /approvals/:id/generate — generate full content for an approved item
router.post('/approvals/:id/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const item = await db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
  if (!item) return res.status(404).json({ error: 'Approval item not found' });
  if (item.status !== 'approved') return res.status(400).json({ error: 'Item must be approved before generating content' });

  const payload = item.payload ? JSON.parse(item.payload) : {};

  // If content was already generated, return it
  if (payload.generated_content) {
    return res.json({ success: true, content: payload.generated_content });
  }

  // Build a prompt based on the action type and payload
  const prompt = buildGeneratePrompt(item.action_type, item.title, item.description, payload);

  try {
    const { text } = await generateTextWithClaude(prompt, {
      system: 'You are a professional marketing content writer. Write polished, ready-to-publish content. Do not include any meta-commentary or instructions — just the final content.',
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Store the generated content back into the payload
    payload.generated_content = text;
    await db.prepare('UPDATE ae_approval_queue SET payload = ? WHERE id = ? AND workspace_id = ?')
      .run(JSON.stringify(payload), req.params.id, wsId);

    res.json({ success: true, content: text });
  } catch (err) {
    console.error('Content generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate content. Please try again.' });
  }
});

function buildGeneratePrompt(actionType, title, description, payload) {
  const p = payload;

  switch (actionType) {
    case 'publish_blog':
    case 'generate_content':
      return `Write a full blog post with the following details:
Title: ${p.headline || title}
Target length: ${p.word_count || 1200} words
${p.tone ? `Tone: ${p.tone}` : 'Tone: professional'}
${p.target_keyword ? `Target SEO keyword: ${p.target_keyword}` : ''}
${p.preview ? `Brief/outline: ${p.preview}` : `Topic: ${description}`}

Write the complete article in markdown format with proper headings (##, ###), paragraphs, and a conclusion. Make it engaging and SEO-optimized.`;

    case 'schedule_post':
      return `Write a complete social media post for ${p.platform || 'social media'}:
Topic: ${title}
${p.caption ? `Draft caption: ${p.caption}` : `Description: ${description}`}
${p.post_type ? `Format: ${p.post_type}` : ''}
${p.slides ? `Number of slides: ${p.slides} (write copy for each slide)` : ''}
${p.hashtags ? `Hashtags to include: ${p.hashtags.join(', ')}` : ''}

Write the full caption, slide-by-slide copy if applicable, and any call-to-action text.`;

    case 'send_campaign':
      return `Write a complete email for the following campaign:
Campaign: ${title}
${p.subject_line ? `Subject line: ${p.subject_line}` : ''}
${p.campaign_type ? `Type: ${p.campaign_type}` : ''}
${p.discount ? `Include offer: ${p.discount} discount` : ''}
Description: ${description}

Write the full email body in HTML-friendly format with a greeting, main content, call-to-action, and sign-off. Keep it concise and compelling.`;

    case 'update_meta':
      return `Generate SEO meta tag updates for the following:
Task: ${title}
${p.pages_affected ? `Pages to update: ${p.pages_affected}` : ''}
${p.changes ? `Changes needed: ${p.changes.join(', ')}` : ''}
${p.avg_current_score ? `Current avg SEO score: ${p.avg_current_score}` : ''}
Description: ${description}

For each page, provide: new meta title (under 60 chars), meta description (under 160 chars), and recommended H1. Format as a numbered list.`;

    case 'adjust_budget':
      return `Write a brief budget adjustment summary report:
Campaign: ${p.campaign || title}
Platform: ${p.platform || 'Unknown'}
Current budget: $${p.current_budget}/day
Proposed budget: $${p.proposed_budget}/day
${p.current_roas ? `Current ROAS: ${p.current_roas}x` : ''}
${p.recommendation ? `Recommendation: ${p.recommendation}` : ''}

Write a short executive summary explaining the rationale, expected impact, and any risks. Include key metrics.`;

    case 'respond_review':
      return `Draft professional review responses:
Task: ${title}
${p.reviews ? `Number of reviews: ${p.reviews}` : ''}
${p.positive ? `Positive: ${p.positive}` : ''}
${p.neutral ? `Neutral: ${p.neutral}` : ''}
${p.negative ? `Negative: ${p.negative}` : ''}
Platform: ${p.platform || 'Google'}
Description: ${description}

Write a personalized response for each review. Be genuine, reference specific details, and keep each response under 100 words.`;

    default:
      return `Generate detailed content for the following approved action:
Title: ${title}
Description: ${description}
Details: ${JSON.stringify(payload, null, 2)}

Write comprehensive, ready-to-use content based on these details.`;
  }
}

// POST /approvals/batch — batch approve/reject with execution
router.post('/approvals/batch', async (req, res) => {
  const wsId = req.workspace.id;
  const { ids, action } = req.body;
  if (!ids || !Array.isArray(ids) || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid batch request' });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const reviewer = req.user?.id || 'system';
  let updated = 0;
  const executed = [];

  for (const id of ids) {
    const item = await db.prepare('SELECT * FROM ae_approval_queue WHERE id = ? AND status = ? AND workspace_id = ?').get(id, 'pending', wsId);
    if (!item) continue;

    await db.prepare(`
      UPDATE ae_approval_queue SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND workspace_id = ?
    `).run(newStatus, reviewer, id, wsId);
    updated++;

    if (action === 'approve') {
      // Execute the approved action
      const payload = item.payload ? JSON.parse(item.payload) : {};
      const ruleObj = {
        id: payload.rule_id || null,
        name: item.title.replace(/^Rule:\s*/, ''),
        module_id: item.module_id,
        action_type: item.action_type,
        action_config: JSON.stringify(payload),
        trigger_config: payload.trigger ? JSON.stringify(payload.trigger) : '{}',
      };
      const result = await executeAction(ruleObj, wsId, 'copilot');
      executed.push({ id, success: result.success });
    } else {
      // Log rejection
      await db.prepare(`
        INSERT INTO ae_action_log (module_id, action_type, mode, description, status, approval_id, created_at, completed_at, workspace_id)
        VALUES (?, ?, 'copilot', ?, 'cancelled', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      `).run(item.module_id, item.action_type, `Rejected: ${item.title}`, id, wsId);
      createNotification('action_failed', `Rejected: ${item.title}`, item.description, item.module_id, wsId);
    }
  }

  res.json({ success: true, updated, executed });
});

module.exports = router;

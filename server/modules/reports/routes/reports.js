const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { buildCrossModuleContext, getAllModuleSummary } = require('../../../services/crossModuleData');

// SSE - AI report narrative generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { client_name, modules, dateRange, template, metrics, goals, branding, prompt: rawPrompt } = req.body;

    // Pull real live data from all connected modules
    const context = buildCrossModuleContext(wsId);

    // If a raw prompt is provided and no structured fields, append real data and use it directly
    if (rawPrompt && !client_name && !modules) {
      const { text } = await generateTextWithClaude(rawPrompt + context, {
        onChunk: (chunk) => sse.sendChunk(chunk),
        maxTokens: 8192,
      });
      logActivity('reports', 'generate', 'Generated report content', 'AI generation', null, wsId);
      sse.sendResult({ content: text });
      return;
    }

    const prompt = `You are an expert marketing analyst writing a professional client-facing report.

Client: ${client_name || 'Client'}
Modules covered: ${modules ? modules.join(', ') : 'All modules'}
Date range: ${dateRange || 'Last 30 days'}
Template style: ${template || 'executive-summary'}
${metrics ? `Key metrics provided by user: ${JSON.stringify(metrics)}` : ''}
${goals ? `Client goals: ${goals}` : ''}
${context}
Generate a professional marketing performance report in Markdown format with the following sections:
1. Executive Summary (3-4 sentences, reference actual data above where present)
2. Key Performance Indicators (use the REAL data from the context above — do NOT invent numbers)
3. Module-by-module breakdown (only for modules that have actual data in the context)
4. Wins & Highlights
5. Areas for Improvement
6. Recommendations & Next Steps (3-5 specific, actionable items based on the data)
7. Appendix (data tables summarizing the key numbers)

Critical: If real data is available in the context above, use those exact numbers. If a module has no data, note it as "No data available yet" rather than inventing figures.
Use professional language. Format tables in markdown. Use bullet points for recommendations.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 8192,
    });

    logActivity('reports', 'generate', 'Generated client report', client_name || 'AI Report', null, wsId);
    sse.sendResult({ content: text, client_name, dateRange });
  } catch (error) {
    console.error('Report generation error:', error);
    sse.sendError(error);
  }
});

// GET /data-summary — returns the current cross-module data snapshot for display
router.get('/data-summary', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const summary = getAllModuleSummary(wsId);
    res.json({ summary, hasData: summary.trim().length > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /reports
router.get('/reports', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { client_name, status } = req.query;
    let sql = 'SELECT * FROM cr_reports WHERE workspace_id = ?';
    const params = [wsId];

    if (client_name) { sql += ' AND client_name = ?'; params.push(client_name); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY created_at DESC';
    const reports = db.prepare(sql).all(...params);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /reports
router.post('/reports', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, client_name, date_range, modules, content, template, branding, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(
      'INSERT INTO cr_reports (name, client_name, date_range, modules, content, template, branding, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name,
      client_name || null,
      date_range || null,
      modules ? JSON.stringify(modules) : '[]',
      content ? JSON.stringify(content) : '{}',
      template || null,
      branding ? JSON.stringify(branding) : '{}',
      status || 'draft',
      wsId
    );

    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('reports', 'create', 'Created report', `${name} for ${client_name || 'unknown client'}`, null, wsId);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /reports/:id
router.get('/reports/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const schedules = db.prepare('SELECT * FROM cr_schedules WHERE report_id = ? AND workspace_id = ?').all(req.params.id, wsId);
    res.json({ ...report, schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /reports/:id
router.put('/reports/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM cr_reports WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { name, status, content, branding, client_name, date_range, modules, template } = req.body;

    db.prepare(
      `UPDATE cr_reports
       SET name = ?, status = ?, content = ?, branding = ?,
           client_name = ?, date_range = ?, modules = ?, template = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND workspace_id = ?`
    ).run(
      name        ?? existing.name,
      status      ?? existing.status,
      content     !== undefined ? JSON.stringify(content)  : existing.content,
      branding    !== undefined ? JSON.stringify(branding) : existing.branding,
      client_name ?? existing.client_name,
      date_range  ?? existing.date_range,
      modules     !== undefined ? JSON.stringify(modules)  : existing.modules,
      template    ?? existing.template,
      req.params.id,
      wsId
    );

    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('reports', 'update', 'Updated report', report.name, null, wsId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /reports/:id — also cascade-deletes associated schedules
router.delete('/reports/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM cr_reports WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    db.prepare('DELETE FROM cr_schedules WHERE report_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM cr_reports WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);

    logActivity('reports', 'delete', 'Deleted report', existing.name, null, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templates
router.get('/templates', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const templates = db.prepare('SELECT * FROM cr_templates WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /schedules
router.post('/schedules', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { report_id, frequency, next_run, recipients } = req.body;

    if (!report_id || !frequency) {
      return res.status(400).json({ error: 'report_id and frequency are required' });
    }

    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ? AND workspace_id = ?').get(report_id, wsId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const result = db.prepare(
      'INSERT INTO cr_schedules (report_id, frequency, next_run, recipients, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(report_id, frequency, next_run || null, recipients || null, wsId);

    const schedule = db.prepare('SELECT * FROM cr_schedules WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('reports', 'create', 'Scheduled report', `${report.name} - ${frequency}`, null, wsId);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate-executive-summary — SSE: generate executive summary with live data
router.post('/generate-executive-summary', (req, res) => {
  const { report_name, period, metrics, business_name } = req.body;
  if (!metrics?.length) { res.status(400).json({ error: 'metrics required' }); return; }

  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  const context = buildCrossModuleContext(wsId);

  const prompt = `You are a marketing analytics expert writing a professional executive summary for ${business_name || 'a client'}.

Report: ${report_name || 'Marketing Performance Report'}
Period: ${period || 'Last 30 days'}
User-provided Key Metrics: ${JSON.stringify(metrics)}
${context}
Write a polished executive summary with these sections:

## Performance Highlights
(3-4 bullet points on best wins this period — use the actual data above where available, be specific with numbers)

## Areas Requiring Attention
(2-3 bullet points on what needs improvement — be direct but diplomatic)

## Strategic Recommendations
(3 numbered, specific recommendations for next period based on the data)

## Month-Over-Month Comparison
(brief assessment of trend direction based on available data)

## Focus for Next Period
(top 1-2 priorities for the upcoming period)

Write for a business executive who doesn't know marketing deeply. Use plain language. Reference actual numbers from the data where available.`;

  generateTextWithClaude(prompt, {
    onChunk: (chunk) => sse.sendChunk(chunk),
  })
    .then(({ text }) => sse.sendResult({ content: text, done: true }))
    .catch((err) => sse.sendError(err));
});

module.exports = router;

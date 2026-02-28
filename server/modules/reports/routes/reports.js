const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// SSE - AI report narrative generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { client_name, modules, dateRange, template, metrics, goals, branding, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !client_name && !modules) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('reports', 'generate', 'Generated report content', 'AI generation', null, wsId);
      sse.sendResult({ content: text });
      return;
    }

    const prompt = `You are an expert marketing analyst. Generate a comprehensive client report.

Client: ${client_name || 'Client'}
Modules covered: ${modules ? modules.join(', ') : 'All modules'}
Date range: ${dateRange || 'Last 30 days'}
Template style: ${template || 'executive-summary'}
Key metrics to highlight: ${metrics ? JSON.stringify(metrics) : 'Overall performance'}
Client goals: ${goals || 'Growth and engagement'}

Generate a professional marketing report in Markdown format with the following sections:
1. Executive Summary
2. Key Performance Indicators (use realistic placeholder data)
3. Module-by-module breakdown (for each module listed)
4. Wins & Highlights
5. Areas for Improvement
6. Recommendations & Next Steps
7. Appendix (data tables)

Make it detailed, data-driven, and actionable. Use professional language appropriate for a client-facing document.
Format tables in markdown. Use bullet points for recommendations.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
      maxTokens: 8192,
    });

    logActivity('reports', 'generate', 'Generated client report', client_name || 'AI Report', null, wsId);
    sse.sendResult({ content: text, client_name, dateRange });
  } catch (error) {
    console.error('Report generation error:', error);
    sse.sendError(error);
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

module.exports = router;

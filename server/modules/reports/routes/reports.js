const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// SSE - AI report narrative generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { client_name, modules, dateRange, template, metrics, goals, branding, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !client_name && !modules) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('reports', 'generate', 'Generated report content', 'AI generation');
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

    logActivity('reports', 'generate', 'Generated client report', client_name || 'AI Report');
    sse.sendResult({ content: text, client_name, dateRange });
  } catch (error) {
    console.error('Report generation error:', error);
    sse.sendError(error);
  }
});

// GET /reports
router.get('/reports', (req, res) => {
  try {
    const { client_name, status } = req.query;
    let sql = 'SELECT * FROM cr_reports WHERE 1=1';
    const params = [];

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
    const { name, client_name, date_range, modules, content, template, branding, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(
      'INSERT INTO cr_reports (name, client_name, date_range, modules, content, template, branding, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name,
      client_name || null,
      date_range || null,
      modules ? JSON.stringify(modules) : '[]',
      content ? JSON.stringify(content) : '{}',
      template || null,
      branding ? JSON.stringify(branding) : '{}',
      status || 'draft'
    );

    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ?').get(result.lastInsertRowid);
    logActivity('reports', 'create', 'Created report', `${name} for ${client_name || 'unknown client'}`);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /reports/:id
router.get('/reports/:id', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ?').get(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const schedules = db.prepare('SELECT * FROM cr_schedules WHERE report_id = ?').all(req.params.id);
    res.json({ ...report, schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templates
router.get('/templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM cr_templates ORDER BY created_at DESC').all();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /schedules
router.post('/schedules', (req, res) => {
  try {
    const { report_id, frequency, next_run, recipients } = req.body;

    if (!report_id || !frequency) {
      return res.status(400).json({ error: 'report_id and frequency are required' });
    }

    const report = db.prepare('SELECT * FROM cr_reports WHERE id = ?').get(report_id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const result = db.prepare(
      'INSERT INTO cr_schedules (report_id, frequency, next_run, recipients) VALUES (?, ?, ?, ?)'
    ).run(report_id, frequency, next_run || null, recipients || null);

    const schedule = db.prepare('SELECT * FROM cr_schedules WHERE id = ?').get(result.lastInsertRowid);
    logActivity('reports', 'create', 'Scheduled report', `${report.name} - ${frequency}`);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI content generation (SSE) - used by frontend
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;
    const finalPrompt = rawPrompt || `Generate affiliate marketing content for: ${type || 'general'}`;

    const { text } = await generateTextWithClaude(finalPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('affiliates', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Affiliate generation error:', error);
    sse.sendError(error);
  }
});

// GET /programs - List all programs
router.get('/programs', (req, res) => {
  try {
    const programs = db.prepare('SELECT * FROM af_programs ORDER BY created_at DESC').all();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /programs - Create a program
router.post('/programs', (req, res) => {
  try {
    const { name, description, commissionRate, commissionType, cookieDuration, terms } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Program name is required' });
    }

    const result = db.prepare(
      'INSERT INTO af_programs (name, description, commission_rate, commission_type, cookie_duration, terms) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, description || null, commissionRate || 0, commissionType || 'percentage', cookieDuration || 30, terms || null);

    const program = db.prepare('SELECT * FROM af_programs WHERE id = ?').get(result.lastInsertRowid);
    logActivity('affiliates', 'create', `Created program: ${name}`, null);
    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /affiliates - List all affiliates
router.get('/affiliates', (req, res) => {
  try {
    const { programId } = req.query;
    let affiliates;

    if (programId) {
      affiliates = db.prepare(
        'SELECT a.*, p.name as program_name FROM af_affiliates a LEFT JOIN af_programs p ON a.program_id = p.id WHERE a.program_id = ? ORDER BY a.created_at DESC'
      ).all(programId);
    } else {
      affiliates = db.prepare(
        'SELECT a.*, p.name as program_name FROM af_affiliates a LEFT JOIN af_programs p ON a.program_id = p.id ORDER BY a.created_at DESC'
      ).all();
    }

    res.json(affiliates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /affiliates - Create an affiliate
router.post('/affiliates', (req, res) => {
  try {
    const { programId, name, email, website } = req.body;

    if (!programId || !name) {
      return res.status(400).json({ error: 'Program ID and affiliate name are required' });
    }

    const affiliateCode = `AFF-${Date.now().toString(36).toUpperCase()}`;

    const result = db.prepare(
      'INSERT INTO af_affiliates (program_id, name, email, website, affiliate_code) VALUES (?, ?, ?, ?, ?)'
    ).run(programId, name, email || null, website || null, affiliateCode);

    const affiliate = db.prepare('SELECT * FROM af_affiliates WHERE id = ?').get(result.lastInsertRowid);
    logActivity('affiliates', 'create', `Added affiliate: ${name}`, affiliateCode);
    res.status(201).json(affiliate);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Affiliate code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /commissions - List commissions
router.get('/commissions', (req, res) => {
  try {
    const { affiliateId, programId, status } = req.query;
    let query = 'SELECT c.*, a.name as affiliate_name, p.name as program_name FROM af_commissions c LEFT JOIN af_affiliates a ON c.affiliate_id = a.id LEFT JOIN af_programs p ON c.program_id = p.id WHERE 1=1';
    const params = [];

    if (affiliateId) {
      query += ' AND c.affiliate_id = ?';
      params.push(affiliateId);
    }
    if (programId) {
      query += ' AND c.program_id = ?';
      params.push(programId);
    }
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';
    const commissions = db.prepare(query).all(...params);
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

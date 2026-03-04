const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI content generation (SSE) - used by frontend
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;
    const finalPrompt = rawPrompt || `Generate affiliate marketing content for: ${type || 'general'}`;

    const { text } = await generateTextWithClaude(finalPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('affiliates', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Affiliate generation error:', error);
    sse.sendError(error);
  }
});

// GET /programs - List all programs
router.get('/programs', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const programs = db.prepare('SELECT * FROM af_programs WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /programs - Create a program
router.post('/programs', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, description, commissionRate, commissionType, cookieDuration, terms } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Program name is required' });
    }

    const result = db.prepare(
      'INSERT INTO af_programs (name, description, commission_rate, commission_type, cookie_duration, terms, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, description || null, commissionRate || 0, commissionType || 'percentage', cookieDuration || 30, terms || null, wsId);

    const program = db.prepare('SELECT * FROM af_programs WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('affiliates', 'create', `Created program: ${name}`, null, null, wsId);
    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /affiliates - List all affiliates
router.get('/affiliates', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { programId } = req.query;
    let affiliates;

    if (programId) {
      affiliates = db.prepare(
        'SELECT a.*, p.name as program_name FROM af_affiliates a LEFT JOIN af_programs p ON a.program_id = p.id WHERE a.workspace_id = ? AND a.program_id = ? ORDER BY a.created_at DESC'
      ).all(wsId, programId);
    } else {
      affiliates = db.prepare(
        'SELECT a.*, p.name as program_name FROM af_affiliates a LEFT JOIN af_programs p ON a.program_id = p.id WHERE a.workspace_id = ? ORDER BY a.created_at DESC'
      ).all(wsId);
    }

    res.json(affiliates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /affiliates - Create an affiliate
router.post('/affiliates', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { programId, name, email, website } = req.body;

    if (!programId || !name) {
      return res.status(400).json({ error: 'Program ID and affiliate name are required' });
    }

    const affiliateCode = `AFF-${Date.now().toString(36).toUpperCase()}`;

    const result = db.prepare(
      'INSERT INTO af_affiliates (program_id, name, email, website, affiliate_code, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(programId, name, email || null, website || null, affiliateCode, wsId);

    const affiliate = db.prepare('SELECT * FROM af_affiliates WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('affiliates', 'create', `Added affiliate: ${name}`, affiliateCode, null, wsId);
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
  const wsId = req.workspace.id;
  try {
    const { affiliateId, programId, status } = req.query;
    let query = 'SELECT c.*, a.name as affiliate_name, p.name as program_name FROM af_commissions c LEFT JOIN af_affiliates a ON c.affiliate_id = a.id LEFT JOIN af_programs p ON c.program_id = p.id WHERE c.workspace_id = ?';
    const params = [wsId];

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

// PUT /programs/:id - Update a program
router.put('/programs/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM af_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Program not found' });

    const { name, description, commissionRate, commissionType, cookieDuration, terms, status } = req.body;
    db.prepare(
      'UPDATE af_programs SET name = ?, description = ?, commission_rate = ?, commission_type = ?, cookie_duration = ?, terms = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(name || existing.name, description ?? existing.description, commissionRate ?? existing.commission_rate, commissionType || existing.commission_type, cookieDuration ?? existing.cookie_duration, terms ?? existing.terms, status || existing.status, req.params.id, wsId);

    const program = db.prepare('SELECT * FROM af_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('affiliates', 'update', `Updated program: ${program.name}`, null, null, wsId);
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /programs/:id - Delete a program
router.delete('/programs/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM af_programs WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Program not found' });

    db.prepare('DELETE FROM af_programs WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('affiliates', 'delete', `Deleted program: ${existing.name}`, null, null, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /affiliates/:id - Update an affiliate
router.put('/affiliates/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM af_affiliates WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Affiliate not found' });

    const { name, email, website, status } = req.body;
    db.prepare(
      'UPDATE af_affiliates SET name = ?, email = ?, website = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?'
    ).run(name || existing.name, email ?? existing.email, website ?? existing.website, status || existing.status, req.params.id, wsId);

    const affiliate = db.prepare('SELECT * FROM af_affiliates WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('affiliates', 'update', `Updated affiliate: ${affiliate.name}`, null, null, wsId);
    res.json(affiliate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /affiliates/:id - Delete an affiliate
router.delete('/affiliates/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const existing = db.prepare('SELECT * FROM af_affiliates WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Affiliate not found' });

    db.prepare('DELETE FROM af_affiliates WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('affiliates', 'delete', `Deleted affiliate: ${existing.name}`, null, null, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /optimize-commission — get AI commission structure recommendation
router.post('/optimize-commission', (req, res) => {
  const { current_rate, industry, product_margin, avg_order_value } = req.body;

  generateTextWithClaude(`You are an affiliate marketing strategist. Recommend an optimal commission structure:

Current Commission Rate: ${current_rate || '10'}%
Industry: ${industry || 'E-commerce'}
Product Margin: ${product_margin || '40'}%
Average Order Value: $${avg_order_value || '50'}

Return JSON:
{
  "recommended_base_rate": "<like 12%>",
  "tier_structure": [
    { "tier": "Bronze", "threshold": "<like $0-$1000/month sales>", "commission": "<rate>", "perks": ["<perk>"] },
    { "tier": "Silver", "threshold": "<like $1000-$5000/month>", "commission": "<rate>", "perks": ["<perk>"] },
    { "tier": "Gold", "threshold": "<like $5000+/month>", "commission": "<rate>", "perks": ["<perk>"] }
  ],
  "bonus_suggestions": ["<performance bonus idea>", "<seasonal bonus>"],
  "rationale": "<2-3 sentence explanation>",
  "competitor_benchmark": "<what competitors typically offer>"
}

Only return JSON.`)
    .then(result => {
      const text = result.text || '';
      try { res.json(JSON.parse(text.trim())); }
      catch { res.json({ recommended_base_rate: '12%', tier_structure: [{ tier: 'Bronze', threshold: '$0-$1000/month', commission: '10%', perks: ['Monthly report'] }, { tier: 'Silver', threshold: '$1000-$5000/month', commission: '15%', perks: ['Priority support', 'Monthly report'] }, { tier: 'Gold', threshold: '$5000+/month', commission: '20%', perks: ['Dedicated manager', 'Co-marketing', 'Priority support'] }], bonus_suggestions: ['10% bonus in Q4', 'New affiliate onboarding bonus'], rationale: 'Tiered structure motivates growth', competitor_benchmark: '8-15% typical in this industry' }); }
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;

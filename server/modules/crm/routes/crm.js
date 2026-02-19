const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - SSE: generate outreach emails, lead analysis, follow-ups
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, contact, deal, context, pipeline, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured data, use it directly
    if (rawPrompt && !contact && !deal) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('crm', 'generate', `Generated ${type || 'content'}`, 'AI generation');
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    let prompt;
    if (type === 'outreach') {
      prompt = `You are an expert B2B sales copywriter. Write a personalized outreach email:

Contact Name: ${contact?.name || 'the prospect'}
Company: ${contact?.company || 'their company'}
Title/Role: ${contact?.title || 'decision maker'}
Role/Status: ${contact?.status || 'lead'}
Lead Score: ${contact?.score || 0}/100
Deal Context: ${deal?.name || 'initial outreach'}
Deal Value: ${deal?.value ? '$' + deal.value : 'Not specified'}
Pipeline: ${pipeline || 'default'}
Additional Context: ${context || 'cold outreach'}

Write a compelling, personalized email that:
1. Has an attention-grabbing subject line
2. Opens with a relevant personalized hook
3. Clearly states the value proposition
4. Includes social proof or a relevant case study reference
5. Ends with a clear, low-friction CTA
6. Keeps the tone professional but conversational

Also provide:
- 2 alternative subject lines for A/B testing
- Best time to send recommendation
- Follow-up timeline suggestion

Format as:
SUBJECT: [subject line]
ALT SUBJECTS: [alt 1] | [alt 2]
BODY:
[email body]
SEND TIME: [recommendation]
FOLLOW-UP: [timeline]`;
    } else if (type === 'follow-up') {
      prompt = `You are an expert sales follow-up strategist. Write a follow-up email:

Contact Name: ${contact?.name || 'the prospect'}
Company: ${contact?.company || 'their company'}
Current Stage: ${deal?.stage || 'lead'}
Deal: ${deal?.name || 'ongoing conversation'}
Deal Value: ${deal?.value ? '$' + deal.value : 'Not specified'}
Context: ${context || 'no response to previous email'}

Write a follow-up that:
1. References the previous interaction naturally
2. Provides additional value (insight, resource, or idea)
3. Creates gentle urgency without being pushy
4. Has a specific, easy-to-answer CTA
5. Is shorter than the original outreach

Format as:
SUBJECT: [subject line]
BODY:
[email body]`;
    } else if (type === 'score') {
      prompt = `You are an expert lead scoring analyst. Analyze and score this lead:

Contact Name: ${contact?.name || 'Unknown'}
Email: ${contact?.email || 'Not provided'}
Company: ${contact?.company || 'Not provided'}
Title: ${contact?.title || 'Not provided'}
Current Status: ${contact?.status || 'lead'}
Current Score: ${contact?.score || 0}/100
Source: ${contact?.source || 'Unknown'}
Tags: ${contact?.tags || 'None'}
Notes: ${contact?.notes || 'None'}
Activities: ${context || 'None recorded'}

Provide:
1. Recommended lead score (0-100) with detailed reasoning
2. Lead quality tier (Hot, Warm, Cold)
3. Engagement level assessment
4. Purchase intent signals identified
5. Risk factors and red flags
6. Recommended next 3 actions (prioritized)
7. Ideal follow-up timing
8. Segment recommendation`;
    } else {
      prompt = `You are an expert sales intelligence analyst. Analyze this lead/contact:

Contact Name: ${contact?.name || 'Unknown'}
Email: ${contact?.email || 'Not provided'}
Company: ${contact?.company || 'Not provided'}
Title: ${contact?.title || 'Not provided'}
Current Status: ${contact?.status || 'lead'}
Lead Score: ${contact?.score || 0}/100
Tags: ${contact?.tags || 'None'}
Notes: ${contact?.notes || 'None'}
Deals: ${deal ? JSON.stringify(deal) : 'None'}
Context: ${context || 'general analysis'}

Provide:
1. Lead quality assessment with scoring breakdown
2. Recommended next actions (prioritized)
3. Suggested outreach strategy
4. Potential objections and how to handle them
5. Recommended lead score adjustment with reasoning
6. Timeline recommendation for follow-up
7. Cross-sell / upsell opportunities
8. Competitive positioning suggestions`;
    }

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('crm', 'generate', `Generated ${type || 'analysis'}`, contact?.name || 'Unknown contact');
    sse.sendResult({ content: text, type: type || 'analysis' });
  } catch (error) {
    console.error('CRM generation error:', error);
    sse.sendError(error);
  }
});

// GET /contacts - list all contacts
router.get('/contacts', (req, res) => {
  try {
    const { status, segment, search } = req.query;
    let query = 'SELECT * FROM crm_contacts';
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (segment) {
      conditions.push('segment = ?');
      params.push(segment);
    }
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const contacts = db.prepare(query).all(...params);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /contacts - create a contact
router.post('/contacts', (req, res) => {
  try {
    const { name, email, phone, company, title, status, score, tags, segment, source, notes } = req.body;
    const result = db.prepare(
      'INSERT INTO crm_contacts (name, email, phone, company, title, status, score, tags, segment, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, email || null, phone || null, company || null, title || null, status || 'lead', score || 0, tags || null, segment || null, source || null, notes || null);
    const contact = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(result.lastInsertRowid);
    logActivity('crm', 'create', 'Added contact', name);
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /contacts/:id - get a single contact with their deals and activities
router.get('/contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const contact = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const deals = db.prepare('SELECT * FROM crm_deals WHERE contact_id = ? ORDER BY created_at DESC').all(id);
    const activities = db.prepare('SELECT * FROM crm_activities WHERE contact_id = ? ORDER BY created_at DESC LIMIT 50').all(id);
    res.json({ ...contact, deals, activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /contacts/:id - update a contact
router.put('/contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const { name, email, phone, company, title, status, score, tags, segment, source, notes } = req.body;
    db.prepare(
      'UPDATE crm_contacts SET name = ?, email = ?, phone = ?, company = ?, title = ?, status = ?, score = ?, tags = ?, segment = ?, source = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      name || existing.name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      company !== undefined ? company : existing.company,
      title !== undefined ? title : existing.title,
      status || existing.status,
      score !== undefined ? score : existing.score,
      tags !== undefined ? tags : existing.tags,
      segment !== undefined ? segment : existing.segment,
      source !== undefined ? source : existing.source,
      notes !== undefined ? notes : existing.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(id);
    logActivity('crm', 'update', 'Updated contact', name || existing.name);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /contacts/:id
router.delete('/contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    db.prepare('DELETE FROM crm_contacts WHERE id = ?').run(id);
    logActivity('crm', 'delete', 'Deleted contact', existing.name);
    res.json({ success: true, deleted: existing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /deals - list all deals with contact info
router.get('/deals', (req, res) => {
  try {
    const { stage, pipeline, contact_id } = req.query;
    let query = 'SELECT d.*, c.name as contact_name, c.company as contact_company, c.email as contact_email FROM crm_deals d LEFT JOIN crm_contacts c ON d.contact_id = c.id';
    const conditions = [];
    const params = [];

    if (stage) {
      conditions.push('d.stage = ?');
      params.push(stage);
    }
    if (pipeline) {
      conditions.push('d.pipeline = ?');
      params.push(pipeline);
    }
    if (contact_id) {
      conditions.push('d.contact_id = ?');
      params.push(contact_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY d.created_at DESC';

    const deals = db.prepare(query).all(...params);
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /deals - create a deal
router.post('/deals', (req, res) => {
  try {
    const { contact_id, name, value, stage, pipeline, probability, expected_close, notes } = req.body;

    const contact = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(contact_id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const result = db.prepare(
      'INSERT INTO crm_deals (contact_id, name, value, stage, pipeline, probability, expected_close, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(contact_id, name, value || 0, stage || 'lead', pipeline || 'default', probability || 0, expected_close || null, notes || null);
    const deal = db.prepare('SELECT * FROM crm_deals WHERE id = ?').get(result.lastInsertRowid);
    logActivity('crm', 'create', 'Created deal', name);
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /deals/:id - update a deal (stage changes, etc.)
router.put('/deals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM crm_deals WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const { name, value, stage, pipeline, probability, expected_close, notes } = req.body;
    db.prepare(
      'UPDATE crm_deals SET name = ?, value = ?, stage = ?, pipeline = ?, probability = ?, expected_close = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      name || existing.name,
      value !== undefined ? value : existing.value,
      stage || existing.stage,
      pipeline || existing.pipeline,
      probability !== undefined ? probability : existing.probability,
      expected_close !== undefined ? expected_close : existing.expected_close,
      notes !== undefined ? notes : existing.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM crm_deals WHERE id = ?').get(id);

    // Log stage changes
    if (stage && stage !== existing.stage) {
      logActivity('crm', 'stage-change', `Deal moved to ${stage}`, `${existing.name}: ${existing.stage} -> ${stage}`);
      // Add activity record
      db.prepare(
        'INSERT INTO crm_activities (contact_id, deal_id, type, title, description) VALUES (?, ?, ?, ?, ?)'
      ).run(existing.contact_id, id, 'stage_change', `Deal moved to ${stage}`, `${existing.stage} -> ${stage}`);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /deals/:id
router.delete('/deals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM crm_deals WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    db.prepare('DELETE FROM crm_deals WHERE id = ?').run(id);
    logActivity('crm', 'delete', 'Deleted deal', existing.name);
    res.json({ success: true, deleted: existing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /activities - log an activity
router.post('/activities', (req, res) => {
  try {
    const { contact_id, deal_id, type, title, description } = req.body;
    const result = db.prepare(
      'INSERT INTO crm_activities (contact_id, deal_id, type, title, description) VALUES (?, ?, ?, ?, ?)'
    ).run(contact_id || null, deal_id || null, type, title, description || null);
    const activity = db.prepare('SELECT * FROM crm_activities WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /activities - list recent activities
router.get('/activities', (req, res) => {
  try {
    const { contact_id, deal_id } = req.query;
    let query = 'SELECT a.*, c.name as contact_name FROM crm_activities a LEFT JOIN crm_contacts c ON a.contact_id = c.id';
    const conditions = [];
    const params = [];

    if (contact_id) {
      conditions.push('a.contact_id = ?');
      params.push(contact_id);
    }
    if (deal_id) {
      conditions.push('a.deal_id = ?');
      params.push(deal_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY a.created_at DESC LIMIT 50';

    const activities = db.prepare(query).all(...params);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /pipeline-stats - get deal counts and values by stage
router.get('/pipeline-stats', (req, res) => {
  try {
    const { pipeline } = req.query;
    let query = 'SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM crm_deals';
    const params = [];
    if (pipeline) {
      query += ' WHERE pipeline = ?';
      params.push(pipeline);
    }
    query += ' GROUP BY stage';
    const stats = db.prepare(query).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /segments - create a segment
router.post('/segments', (req, res) => {
  try {
    const { name, rules, color } = req.body;
    const result = db.prepare(
      'INSERT INTO crm_segments (name, rules, color) VALUES (?, ?, ?)'
    ).run(name, rules ? JSON.stringify(rules) : null, color || null);
    const segment = db.prepare('SELECT * FROM crm_segments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(segment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /segments - list segments
router.get('/segments', (req, res) => {
  try {
    const segments = db.prepare('SELECT * FROM crm_segments ORDER BY created_at DESC').all();
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

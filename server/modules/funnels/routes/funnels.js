const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - SSE: AI funnel content generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, product, audience, ctaStyle, colorScheme, stages, industry, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !product && !audience) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('funnels', 'generate', `Generated ${type || 'funnel'} content`, 'AI generation');
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    const stageList = (stages || []).join(' -> ') || 'Landing Page -> Order Form -> Upsell -> Thank You';

    const prompt = `You are an expert conversion funnel strategist and copywriter. Design a complete sales funnel with persuasive copy for every stage.

Funnel Type: ${type || 'Product Launch'}
Product/Service: ${product || 'Not specified'}
Industry: ${industry || 'General'}
Target Audience: ${audience || 'General audience'}
CTA Style: ${ctaStyle || 'Direct'}
Color Scheme: ${colorScheme || 'Modern'}
Funnel Stages: ${stageList}

For each funnel stage, provide:
1. Page headline and sub-headline
2. Hero section copy (2-3 sentences)
3. Key benefits section (3-5 bullet points)
4. Social proof / testimonial suggestions
5. Specific CTA button text
6. Below-the-fold content suggestions
7. Psychological triggers to use at this stage

Also provide:
- Overall funnel strategy and flow logic
- Email follow-up sequence (3 emails per stage transition)
- A/B testing suggestions for headlines and CTAs
- Conversion optimization tips for each stage
- Expected conversion benchmarks by stage`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('funnels', 'generate', `Generated ${type || 'Product Launch'} funnel`, product || 'No product specified');
    sse.sendResult({ content: text, type: type || 'Product Launch' });
  } catch (error) {
    console.error('Funnel generation error:', error);
    sse.sendError(error);
  }
});

// GET /funnels - list all funnels
router.get('/funnels', (req, res) => {
  try {
    const funnels = db.prepare('SELECT * FROM fn_funnels ORDER BY created_at DESC').all();
    res.json(funnels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /funnels - create a funnel
router.post('/funnels', (req, res) => {
  try {
    const { name, type, stages, status } = req.body;
    const result = db.prepare(
      'INSERT INTO fn_funnels (name, type, stages, status) VALUES (?, ?, ?, ?)'
    ).run(name, type || null, stages ? JSON.stringify(stages) : null, status || 'draft');
    const funnel = db.prepare('SELECT * FROM fn_funnels WHERE id = ?').get(result.lastInsertRowid);
    logActivity('funnels', 'create', `Created funnel: ${name}`, type);
    res.status(201).json(funnel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /funnels/:id - get a single funnel with its pages
router.get('/funnels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const funnel = db.prepare('SELECT * FROM fn_funnels WHERE id = ?').get(id);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    const pages = db.prepare('SELECT * FROM fn_pages WHERE funnel_id = ? ORDER BY sort_order ASC').all(id);
    res.json({ ...funnel, pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /funnels/:id - delete a funnel
router.delete('/funnels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM fn_funnels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Funnel not found' });
    }
    db.prepare('DELETE FROM fn_funnels WHERE id = ?').run(id);
    logActivity('funnels', 'delete', 'Deleted funnel', existing.name);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

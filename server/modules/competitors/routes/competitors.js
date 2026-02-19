const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - List all competitors
router.get('/', (req, res) => {
  try {
    const competitors = db.prepare('SELECT * FROM ci_competitors ORDER BY created_at DESC').all();
    res.json(competitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - Create a competitor
router.post('/', (req, res) => {
  try {
    const { name, website, industry, description, strengths, weaknesses } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Competitor name is required' });
    }

    const result = db.prepare(
      'INSERT INTO ci_competitors (name, website, industry, description, strengths, weaknesses) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, website || null, industry || null, description || null, strengths || null, weaknesses || null);

    const competitor = db.prepare('SELECT * FROM ci_competitors WHERE id = ?').get(result.lastInsertRowid);
    logActivity('competitors', 'create', 'Added competitor', name);
    res.status(201).json(competitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - Generic AI generation (SSE) - used by frontend
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;
    const finalPrompt = rawPrompt || `Generate competitive intelligence content for: ${type || 'general analysis'}`;

    const { text } = await generateTextWithClaude(finalPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('competitors', 'generate', `Generated ${type || 'analysis'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Competitor generation error:', error);
    sse.sendError(error);
  }
});

// POST /analyze - AI competitor analysis (SSE streaming)
router.post('/analyze', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { competitorId, competitorName, website, industry, analysisType } = req.body;

    const prompt = `You are an elite competitive intelligence analyst. Perform a thorough ${analysisType || 'comprehensive'} analysis of a competitor.

Competitor: ${competitorName || 'Unknown'}
Website: ${website || 'Not provided'}
Industry: ${industry || 'general'}

Based on the analysis type, provide:

${analysisType === 'ad-spy' ? `AD INTELLIGENCE:
- Likely ad platforms and formats they use
- Estimated ad spend patterns
- Creative strategy analysis (hooks, CTAs, visual style)
- Target audience segmentation
- Winning ad formulas to learn from
- Gaps you can exploit` :
analysisType === 'content' ? `CONTENT ANALYSIS:
- Content strategy overview (topics, frequency, formats)
- Top-performing content themes
- SEO content gaps
- Social media presence and engagement patterns
- Content distribution channels
- Content opportunities they're missing` :
analysisType === 'pricing' ? `PRICING ANALYSIS:
- Pricing model breakdown
- Price point comparisons
- Value proposition at each tier
- Discount/promotion patterns
- Pricing psychology tactics used
- Opportunities for competitive pricing` :
analysisType === 'seo' ? `SEO ANALYSIS:
- Likely target keywords and ranking strategy
- On-page SEO strengths and weaknesses
- Content structure and internal linking patterns
- Backlink strategy assessment
- Technical SEO observations
- SEO opportunities to outrank them` :
`COMPREHENSIVE ANALYSIS:
- Business model overview
- Strengths and weaknesses (SWOT)
- Market positioning and unique value proposition
- Marketing channels and strategy
- Product/service comparison
- Opportunities and threats
- Actionable recommendations to compete`}

Be specific, data-driven where possible, and provide actionable insights.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    // Save as report
    const reportResult = db.prepare(
      'INSERT INTO ci_reports (competitor_id, type, title, content, raw_response) VALUES (?, ?, ?, ?, ?)'
    ).run(
      competitorId || null,
      analysisType || 'comprehensive',
      `${analysisType || 'Comprehensive'} analysis of ${competitorName || 'competitor'}`,
      text,
      text
    );

    logActivity('competitors', 'analyze', `Analyzed competitor: ${competitorName || 'Unknown'}`, analysisType || 'comprehensive');
    sse.sendResult({ reportId: reportResult.lastInsertRowid, content: text });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    sse.sendError(error);
  }
});

// GET /reports - List all reports
router.get('/reports', (req, res) => {
  try {
    const { competitorId } = req.query;
    let reports;

    if (competitorId) {
      reports = db.prepare(
        'SELECT r.*, c.name as competitor_name FROM ci_reports r LEFT JOIN ci_competitors c ON r.competitor_id = c.id WHERE r.competitor_id = ? ORDER BY r.created_at DESC'
      ).all(competitorId);
    } else {
      reports = db.prepare(
        'SELECT r.*, c.name as competitor_name FROM ci_reports r LEFT JOIN ci_competitors c ON r.competitor_id = c.id ORDER BY r.created_at DESC'
      ).all();
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

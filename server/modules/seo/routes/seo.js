const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - SSE: generate SEO analysis, meta tags, keywords
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { url, topic, type, currentContent, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !url && !topic && !currentContent) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    let prompt;
    if (type === 'meta-tags') {
      prompt = `You are an expert SEO specialist. Generate optimized meta tags for the following:

URL/Page: ${url || topic || 'homepage'}
Current Content: ${currentContent || 'Not provided'}

Provide:
1. Title tag (50-60 characters)
2. Meta description (150-160 characters)
3. Open Graph tags (title, description, type)
4. Twitter Card tags
5. Canonical URL suggestion
6. Schema markup recommendations`;
    } else if (type === 'keywords') {
      prompt = `You are an expert SEO keyword researcher. Perform keyword research for:

Topic/Niche: ${topic || url || 'general'}

Provide 15-20 keyword suggestions with:
- Primary keywords (high intent)
- Long-tail keywords
- Question-based keywords
- Estimated search volume (low/medium/high)
- Estimated difficulty (easy/medium/hard)
- Opportunity score (1-100)

Format as a structured list.`;
    } else {
      prompt = `You are an expert SEO analyst. Provide a comprehensive SEO analysis for:

URL: ${url || 'Not provided'}
Topic: ${topic || 'Not provided'}
Content: ${currentContent || 'Not provided'}

Analyze and provide recommendations for:
1. On-page SEO factors
2. Content optimization
3. Technical SEO considerations
4. Keyword targeting opportunities
5. Internal/external linking strategy
6. Page speed and Core Web Vitals tips
7. Overall SEO score (0-100) with reasoning

Be specific and actionable in your recommendations.`;
    }

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'analysis' });
  } catch (error) {
    console.error('SEO generation error:', error);
    sse.sendError(error);
  }
});

// POST /audit - create a new SEO audit
router.post('/audit', async (req, res) => {
  try {
    const { url, results, score } = req.body;
    const result = db.prepare(
      'INSERT INTO seo_audits (url, results, score) VALUES (?, ?, ?)'
    ).run(url, results || null, score || null);
    const audit = db.prepare('SELECT * FROM seo_audits WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /audits - list all audits
router.get('/audits', (req, res) => {
  try {
    const audits = db.prepare('SELECT * FROM seo_audits ORDER BY created_at DESC').all();
    res.json(audits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /keywords - list keywords, optionally filtered by audit_id
router.get('/keywords', (req, res) => {
  try {
    const { audit_id } = req.query;
    let keywords;
    if (audit_id) {
      keywords = db.prepare('SELECT * FROM seo_keywords WHERE audit_id = ? ORDER BY opportunity DESC').all(audit_id);
    } else {
      keywords = db.prepare('SELECT * FROM seo_keywords ORDER BY created_at DESC').all();
    }
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

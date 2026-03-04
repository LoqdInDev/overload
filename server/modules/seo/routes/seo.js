const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - SSE: generate SEO analysis, meta tags, keywords
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
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

    logActivity('seo', 'generate', `Generated ${type || 'analysis'}`, null, null, wsId);
    sse.sendResult({ content: text, type: type || 'analysis' });
  } catch (error) {
    console.error('SEO generation error:', error);
    sse.sendError(error);
  }
});

// POST /audit - create a new SEO audit
router.post('/audit', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { url, results, score } = req.body;
    const result = db.prepare(
      'INSERT INTO seo_audits (url, results, score, workspace_id) VALUES (?, ?, ?, ?)'
    ).run(url, results || null, score || null, wsId);
    const audit = db.prepare('SELECT * FROM seo_audits WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /audits - list all audits
router.get('/audits', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const audits = db.prepare('SELECT * FROM seo_audits WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(audits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /keywords - list keywords, optionally filtered by audit_id
router.get('/keywords', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { audit_id } = req.query;
    let keywords;
    if (audit_id) {
      keywords = db.prepare('SELECT * FROM seo_keywords WHERE project_id = ? AND workspace_id = ? ORDER BY opportunity DESC').all(audit_id, wsId);
    } else {
      keywords = db.prepare('SELECT * FROM seo_keywords WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    }
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /audits/:id - delete an audit
router.delete('/audits/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM seo_audits WHERE id = ? AND workspace_id = ?').run(req.params.id, req.workspace.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /keywords/:id - delete a keyword
router.delete('/keywords/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM seo_keywords WHERE id = ? AND workspace_id = ?').run(req.params.id, req.workspace.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /audits/:id - update an audit
router.put('/audits/:id', (req, res) => {
  try {
    const { score, issues, recommendations } = req.body;
    db.prepare(
      'UPDATE seo_audits SET score = COALESCE(?, score), issues = COALESCE(?, issues), recommendations = COALESCE(?, recommendations) WHERE id = ? AND workspace_id = ?'
    ).run(score, issues ? JSON.stringify(issues) : null, recommendations ? JSON.stringify(recommendations) : null, req.params.id, req.workspace.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /keyword-gap — SSE: analyze keyword gaps vs competitor
router.post('/keyword-gap', (req, res) => {
  const { your_keywords, competitor_domain, your_domain } = req.body;
  if (!competitor_domain) { res.status(400).json({ error: 'competitor_domain required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are an SEO strategist. Analyze the keyword gap between these sites:

Your Domain: ${your_domain || 'Unknown'}
Your Current Keywords: ${Array.isArray(your_keywords) ? your_keywords.join(', ') : your_keywords || 'Not specified'}
Competitor Domain: ${competitor_domain}

Generate a keyword gap analysis with these sections:

## Gap Overview
(2-3 sentences on the competitive keyword landscape)

## High-Opportunity Keywords
(10 keywords the competitor likely ranks for that you should target — include difficulty estimate and content type)

## Quick Wins (Low Competition)
(5 long-tail keywords you could rank for in 60-90 days)

## Content Gap Strategy
(3 content types/formats to create to close the gap)

## Priority Action Plan
(numbered list: what to do first, second, third)

Be specific. Include realistic keyword examples even if estimated.`;

  generateTextWithClaude(prompt, {
    onChunk: (chunk) => sse.sendChunk(chunk),
  })
    .then(({ text }) => sse.sendResult({ content: text, done: true }))
    .catch((err) => sse.sendError(err));
});

// POST /generate-brief — SSE: generate full SEO content brief from keyword
router.post('/generate-brief', async (req, res) => {
  const { keyword, url, niche } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword required' });

  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  // Pull related keywords from DB for context
  let relatedKeywords = [];
  try {
    relatedKeywords = db.prepare(
      'SELECT keyword, volume, difficulty, intent FROM seo_keywords WHERE workspace_id = ? AND keyword != ? LIMIT 10'
    ).all(wsId, keyword);
  } catch {}

  const prompt = `You are an expert SEO content strategist. Create a comprehensive content brief for ranking this keyword.

Target Keyword: "${keyword}"
${niche ? `Niche: ${niche}` : ''}
${url ? `Website URL: ${url}` : ''}
${relatedKeywords.length > 0 ? `Related keywords in this workspace: ${relatedKeywords.map(k => `${k.keyword} (vol: ${k.volume || 'unknown'}, difficulty: ${k.difficulty || 'unknown'}, intent: ${k.intent || 'unknown'})`).join(', ')}` : ''}

Generate a complete SEO content brief with these sections:

## 📌 Target Keyword Analysis
- Search intent (informational/navigational/commercial/transactional)
- Target audience persona
- Estimated difficulty assessment
- Recommended word count range

## 🏆 Title Options (3 variants)
(Each under 60 characters, include keyword, different angles)

## 📋 Meta Description (2 variants)
(Under 155 characters each, compelling and keyword-rich)

## 🗂️ Recommended H2 Structure
(5-8 H2 headings that cover the topic comprehensively and include LSI keywords)

## 🔑 Keywords to Include
- Primary keyword (exact match)
- 5-8 LSI/semantic keywords to weave in
- 3-5 question-format keywords (for FAQ section / People Also Ask)

## 🔗 Internal Link Opportunities
(Types of pages to link to/from — categories, related topics)

## 📊 Competitor Angle
(What top-ranking pages typically cover, and one unique angle to differentiate)

## ✅ Content Checklist
(8-10 checkbox items: schema markup, image alt text, etc.)

Be specific and actionable. Format with clear headers and bullet points.`;

  try {
    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 4096,
    });
    sse.sendResult({ content: text, keyword });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

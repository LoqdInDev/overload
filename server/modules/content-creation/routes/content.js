const express = require('express');
const { v4: uuid } = require('uuid');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { db, logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildContentPrompt } = require('../prompts/contentGenerator');
const { getSeoKeywordsForContent, getContentForSocial } = require('../../../services/crossModuleData');

const router = express.Router();

// Generate content via SSE streaming
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'type and prompt are required' });
  }

  const sse = setupSSE(res);

  try {
    // Pull top SEO keywords for context
    let seoContext = '';
    try {
      const seoKeywords = db.prepare(
        'SELECT keyword, volume, difficulty, intent FROM seo_keywords WHERE workspace_id = ? ORDER BY volume DESC LIMIT 8'
      ).all(wsId);
      if (seoKeywords.length > 0) {
        seoContext = `\n\nSEO Context (top keywords for this workspace — incorporate naturally where relevant):\n${seoKeywords.map(k => `- "${k.keyword}" (volume: ${k.volume || 'unknown'}, intent: ${k.intent || 'unknown'})`).join('\n')}`;
      }
    } catch {}

    const fullPrompt = buildContentPrompt(type, prompt) + seoContext;

    const { text } = await generateTextWithClaude(fullPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      moduleId: 'content-creation',
      maxTokens: 4096,
      temperature: 0.85,
    });

    // Save to database
    const id = uuid();
    const title = prompt.slice(0, 100);
    q.create(id, type, title, prompt, text, null);

    logActivity('content', 'generate', `Generated ${type} content`, title, id, wsId);

    sse.sendResult({ id, content: text, type });
  } catch (err) {
    console.error('Content generation error:', err);
    sse.sendError(err);
  }
});

// List all projects
router.get('/projects', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const q = getQueries(wsId);
    const type = req.query.type;
    const projects = type ? q.getByType(type) : q.getAll();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project by ID
router.get('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const q = getQueries(wsId);
    const project = q.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project
router.put('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const q = getQueries(wsId);
    const { title, content, metadata } = req.body;
    const existing = q.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    q.update(
      title || existing.title,
      content || existing.content,
      metadata ? JSON.stringify(metadata) : existing.metadata,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project
router.delete('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const q = getQueries(wsId);
    q.delete(req.params.id);
    logActivity('content', 'delete', 'Deleted content project', null, req.params.id, wsId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /suggestions - Cross-module content suggestions
router.get('/suggestions', (req, res) => {
  const wsId = req.workspace.id;
  try {
  const seoKeywords = getSeoKeywordsForContent(wsId);
  const recentContent = getContentForSocial(wsId);

  const suggestions = [];

  // Suggest content based on SEO keywords
  for (const kw of seoKeywords.slice(0, 3)) {
    suggestions.push({
      type: 'blog',
      title: `Write about "${kw.keyword}"`,
      reason: `High search volume (${kw.volume}) with ${kw.difficulty} difficulty`,
      source: 'seo',
    });
  }

  // Suggest social repurposing of recent content
  for (const content of recentContent.slice(0, 2)) {
    if (content.type !== 'social') {
      suggestions.push({
        type: 'social',
        title: `Repurpose "${content.title}" for social`,
        reason: `Turn your ${content.type} into social media posts`,
        source: 'content',
      });
    }
  }

  res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /score — score content quality
router.post('/score', async (req, res) => {
  const { content, content_type } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  try {
    const { text } = await generateTextWithClaude(`You are a content quality analyst. Score this ${content_type || 'content'} on three dimensions:

Content: """
${content.substring(0, 2000)}
"""

Return JSON with this exact structure:
{
  "seo": <number 0-100>,
  "readability": <number 0-100>,
  "engagement": <number 0-100>,
  "overall_grade": "<A/B/C/D/F>",
  "top_issue": "<single most important thing to fix>",
  "strengths": ["<strength1>", "<strength2>"]
}

Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse score result' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /repurpose — SSE: repurpose content into other formats
router.post('/repurpose', (req, res) => {
  const { content, original_type } = req.body;
  if (!content) { res.status(400).json({ error: 'content required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a content repurposing expert. Take this ${original_type || 'content'} and repurpose it into 3 different formats.

Original content:
"""
${content.substring(0, 2000)}
"""

Generate these 3 repurposed versions:
1. **Twitter/X Thread** (5-7 tweets, each starting with a number)
2. **LinkedIn Post** (professional tone, 150-200 words)
3. **Email Subject Lines** (5 compelling subject lines)

Format clearly with headers for each section. Be specific and ready to use.`;

  generateTextWithClaude(prompt, {
    onChunk: (chunk) => sse.sendChunk(chunk),
  })
    .then(({ text: full }) => {
      sse.sendResult({ content: full, done: true });
    })
    .catch((err) => sse.sendError(err));
});

module.exports = router;

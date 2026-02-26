const express = require('express');
const { v4: uuid } = require('uuid');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { logActivity } = require('../../../db/database');
const { queries } = require('../db/queries');
const { buildContentPrompt } = require('../prompts/contentGenerator');
const { getSeoKeywordsForContent, getContentForSocial } = require('../../../services/crossModuleData');

const router = express.Router();

// Generate content via SSE streaming
router.post('/generate', async (req, res) => {
  const { type, prompt } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'type and prompt are required' });
  }

  const sse = setupSSE(res);

  try {
    const fullPrompt = buildContentPrompt(type, prompt);

    const { text } = await generateTextWithClaude(fullPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 4096,
      temperature: 0.85,
    });

    // Save to database
    const id = uuid();
    const title = prompt.slice(0, 100);
    queries.create.run(id, type, title, prompt, text, null);

    logActivity('content', 'generate', `Generated ${type} content`, title, id);

    sse.sendResult({ id, content: text, type });
  } catch (err) {
    console.error('Content generation error:', err);
    sse.sendError(err);
  }
});

// List all projects
router.get('/projects', (req, res) => {
  const type = req.query.type;
  const projects = type ? queries.getByType.all(type) : queries.getAll.all();
  res.json(projects);
});

// Get project by ID
router.get('/projects/:id', (req, res) => {
  const project = queries.getById.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// Update project
router.put('/projects/:id', (req, res) => {
  const { title, content, metadata } = req.body;
  const existing = queries.getById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  queries.update.run(
    title || existing.title,
    content || existing.content,
    metadata ? JSON.stringify(metadata) : existing.metadata,
    req.params.id
  );
  res.json({ success: true });
});

// Delete project
router.delete('/projects/:id', (req, res) => {
  queries.delete.run(req.params.id);
  logActivity('content', 'delete', 'Deleted content project', null, req.params.id);
  res.json({ success: true });
});

// GET /suggestions - Cross-module content suggestions
router.get('/suggestions', (req, res) => {
  const seoKeywords = getSeoKeywordsForContent();
  const recentContent = getContentForSocial();

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
});

module.exports = router;

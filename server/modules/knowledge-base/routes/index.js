const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all articles
router.get('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { category, status } = req.query;
    let query = 'SELECT * FROM kb_articles';
    const conditions = ['workspace_id = ?'];
    const params = [wsId];
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /search?q= — FTS5 full-text search across articles
router.get('/search', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    // FTS5 search with snippet highlighting
    const results = db.prepare(`
      SELECT a.*, snippet(kb_fts, 1, '<mark>', '</mark>', '...', 32) as excerpt
      FROM kb_fts
      JOIN kb_articles a ON a.id = kb_fts.rowid
      WHERE kb_fts MATCH ? AND a.workspace_id = ? AND (a.status = 'published' OR a.status IS NULL OR a.status = 'draft')
      ORDER BY rank
      LIMIT 20
    `).all(`${q.trim()}*`, wsId);

    res.json(results);
  } catch (err) {
    // Fallback to LIKE search if FTS fails
    try {
      const wsId = req.workspace.id;
      const { q } = req.query;
      const results = db.prepare(`
        SELECT * FROM kb_articles
        WHERE workspace_id = ? AND (title LIKE ? OR content LIKE ?)
        LIMIT 20
      `).all(wsId, `%${q}%`, `%${q}%`);
      res.json(results);
    } catch (e2) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /:id - get a single article
router.get('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const item = db.prepare('SELECT * FROM kb_articles WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    // Increment view count
    db.prepare('UPDATE kb_articles SET views = views + 1 WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ ...item, views: item.views + 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create an article
router.post('/', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { title, slug, content, category, status } = req.body;
    const articleSlug = slug || title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || null;
    const result = db.prepare(
      'INSERT INTO kb_articles (title, slug, content, category, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, articleSlug, content || null, category || null, status || 'draft', wsId);
    const item = db.prepare('SELECT * FROM kb_articles WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update an article
router.put('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM kb_articles WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { title, slug, content, category, status } = req.body;
    db.prepare(
      'UPDATE kb_articles SET title = ?, slug = ?, content = ?, category = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      title || existing.title,
      slug !== undefined ? slug : existing.slug,
      content !== undefined ? content : existing.content,
      category !== undefined ? category : existing.category,
      status || existing.status,
      req.params.id,
      wsId
    );
    const updated = db.prepare('SELECT * FROM kb_articles WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete an article
router.delete('/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM kb_articles WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM kb_articles WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /helpful/:id - mark an article as helpful
router.post('/helpful/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    const item = db.prepare('SELECT * FROM kb_articles WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /categories/list - list all categories
router.get('/categories/list', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const categories = db.prepare('SELECT * FROM kb_categories WHERE workspace_id = ? ORDER BY sort_order ASC, name ASC').all(wsId);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /categories - create a category
router.post('/categories', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, description, icon, sort_order } = req.body;
    const result = db.prepare(
      'INSERT INTO kb_categories (name, description, icon, sort_order, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description || null, icon || null, sort_order || 0, wsId);
    const item = db.prepare('SELECT * FROM kb_categories WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /categories/:id - delete a category
router.delete('/categories/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM kb_categories WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI assistant specializing in knowledge base content creation. You help write clear, well-structured help articles, FAQs, tutorials, and documentation that are easy for customers to understand.`;

    const userPrompt = rawPrompt || `Generate a well-structured knowledge base article with a clear title, introduction, step-by-step instructions, and a summary section.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('knowledge-base', 'generate', `Generated ${type || 'article'}`, null, null, wsId);
    sse.sendResult({ content: text, type: type || 'article' });
  } catch (error) {
    console.error('Knowledge Base generation error:', error);
    sse.sendError(error);
  }
});

// POST /detect-gaps — analyze knowledge base for content gaps
router.post('/detect-gaps', async (req, res) => {
  const wsId = req.workspace.id;
  const { articles, workspace_type } = req.body;
  if (!articles?.length) return res.status(400).json({ error: 'articles required' });

  const articleList = articles.slice(0, 50).map((a, i) => `${i+1}. "${a.title}" (${a.category || 'General'})`).join('\n');

  try {
    const { text } = await generateTextWithClaude(`You are a knowledge base strategist. Analyze this knowledge base for content gaps:

Workspace Type: ${workspace_type || 'Marketing Platform'}
Current Articles:
${articleList}

Return JSON:
{
  "coverage_score": <number 0-100>,
  "gaps": [
    { "topic": "<missing topic>", "priority": "high|medium|low", "suggested_title": "<specific article title>", "reason": "<why this is needed>" }
  ],
  "duplicate_risks": ["<potential duplicate topic 1>"],
  "underserved_categories": ["<category with few articles>"],
  "top_missing": "<the single most important missing topic"
}

Return top 8 gaps. Only return JSON.`);
    try { res.json(JSON.parse(text.trim())); }
    catch { res.json({ coverage_score: 60, gaps: [], duplicate_risks: [], underserved_categories: [], top_missing: 'Getting started guide' }); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /improve-article — SSE: get improvement suggestions for an article
router.post('/improve-article', async (req, res) => {
  const wsId = req.workspace.id;
  const { title, content } = req.body;
  if (!content) { res.status(400).json({ error: 'content required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a content strategist and technical writer. Review this knowledge base article and provide specific improvements:

Title: ${title || 'Untitled'}
Content:
"""
${content.substring(0, 3000)}
"""

Provide structured improvement feedback:

## Clarity Score: X/10
(brief assessment of current clarity)

## Completeness Score: X/10
(what's missing, what's covered)

## Critical Improvements
(3-5 specific, actionable changes — be precise)

## Structure Suggestions
(how to reorganize or better format)

## SEO Opportunities
(keywords to add, meta description suggestion, headings to improve)

## Suggested Related Articles
(3 articles to link to from this one)

Be specific and actionable. Reference exact lines or sections when possible.`;

  try {
    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    sse.sendResult({ content: text });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

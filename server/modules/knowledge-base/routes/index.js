const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// GET / - list all articles
router.get('/', (req, res) => {
  try {
    const { category, status } = req.query;
    let query = 'SELECT * FROM kb_articles';
    const conditions = [];
    const params = [];
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

// GET /:id - get a single article
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    // Increment view count
    db.prepare('UPDATE kb_articles SET views = views + 1 WHERE id = ?').run(req.params.id);
    res.json({ ...item, views: item.views + 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create an article
router.post('/', (req, res) => {
  try {
    const { title, slug, content, category, status } = req.body;
    const articleSlug = slug || title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || null;
    const result = db.prepare(
      'INSERT INTO kb_articles (title, slug, content, category, status) VALUES (?, ?, ?, ?, ?)'
    ).run(title, articleSlug, content || null, category || null, status || 'draft');
    const item = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update an article
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { title, slug, content, category, status } = req.body;
    db.prepare(
      'UPDATE kb_articles SET title = ?, slug = ?, content = ?, category = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      title || existing.title,
      slug !== undefined ? slug : existing.slug,
      content !== undefined ? content : existing.content,
      category !== undefined ? category : existing.category,
      status || existing.status,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete an article
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM kb_articles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /helpful/:id - mark an article as helpful
router.post('/helpful/:id', (req, res) => {
  try {
    db.prepare('UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = ?').run(req.params.id);
    const item = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /categories/list - list all categories
router.get('/categories/list', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM kb_categories ORDER BY sort_order ASC, name ASC').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /categories - create a category
router.post('/categories', (req, res) => {
  try {
    const { name, description, icon, sort_order } = req.body;
    const result = db.prepare(
      'INSERT INTO kb_categories (name, description, icon, sort_order) VALUES (?, ?, ?, ?)'
    ).run(name, description || null, icon || null, sort_order || 0);
    const item = db.prepare('SELECT * FROM kb_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /categories/:id - delete a category
router.delete('/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM kb_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI assistant specializing in knowledge base content creation. You help write clear, well-structured help articles, FAQs, tutorials, and documentation that are easy for customers to understand.`;

    const userPrompt = rawPrompt || `Generate a well-structured knowledge base article with a clear title, introduction, step-by-step instructions, and a summary section.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'article' });
  } catch (error) {
    console.error('Knowledge Base generation error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

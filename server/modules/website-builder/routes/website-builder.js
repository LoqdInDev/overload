const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// SSE - AI page content/code generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, businessName, industry, pageType, description, style, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !businessName && !industry && !description) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('website-builder', 'generate', `Generated ${type || 'page'} content`, 'AI generation');
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    const prompt = `You are an expert web developer and designer. Generate a complete, modern webpage.

Business: ${businessName || 'My Business'}
Industry: ${industry || 'General'}
Page type: ${pageType || 'landing'}
Description: ${description || 'A professional landing page'}
Style preference: ${style || 'modern, clean, professional'}
Generation type: ${type || 'full-page'}

Generate a complete, responsive HTML page with inline CSS and minimal JavaScript. The page should:
- Be fully responsive with mobile-first design
- Use modern CSS (flexbox/grid, custom properties)
- Include appropriate sections for the page type
- Have professional placeholder content relevant to the business
- Include SEO-friendly meta tags

Return the full HTML code as a single string, ready to be rendered in a browser.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
      maxTokens: 8192,
    });

    logActivity('website-builder', 'generate', 'Generated page content', pageType || 'landing');
    sse.sendResult({ content: text, pageType: pageType || 'landing' });
  } catch (error) {
    console.error('Website builder generation error:', error);
    sse.sendError(error);
  }
});

// GET /sites
router.get('/sites', (req, res) => {
  try {
    const sites = db.prepare('SELECT * FROM wb_sites ORDER BY created_at DESC').all();
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sites
router.post('/sites', (req, res) => {
  try {
    const { name, domain, template, pages, settings } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(
      'INSERT INTO wb_sites (name, domain, template, pages, settings) VALUES (?, ?, ?, ?, ?)'
    ).run(name, domain || null, template || null, pages ? JSON.stringify(pages) : null, settings ? JSON.stringify(settings) : null);

    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ?').get(result.lastInsertRowid);
    logActivity('website-builder', 'create', 'Created website', name);
    res.status(201).json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sites/:id
router.get('/sites/:id', (req, res) => {
  try {
    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ?').get(req.params.id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const pages = db.prepare('SELECT * FROM wb_pages WHERE site_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ ...site, pageList: pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /pages
router.post('/pages', (req, res) => {
  try {
    const { site_id, name, slug, content, seo_title, seo_desc } = req.body;

    if (!site_id || !name) {
      return res.status(400).json({ error: 'site_id and name are required' });
    }

    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ?').get(site_id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const result = db.prepare(
      'INSERT INTO wb_pages (site_id, name, slug, content, seo_title, seo_desc) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(site_id, name, slug || name.toLowerCase().replace(/\s+/g, '-'), content || null, seo_title || null, seo_desc || null);

    const page = db.prepare('SELECT * FROM wb_pages WHERE id = ?').get(result.lastInsertRowid);
    logActivity('website-builder', 'create', 'Created page', `${name} for site ${site.name}`);
    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /pages/:id
router.put('/pages/:id', (req, res) => {
  try {
    const { name, slug, content, seo_title, seo_desc } = req.body;

    const existing = db.prepare('SELECT * FROM wb_pages WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Page not found' });
    }

    db.prepare(
      'UPDATE wb_pages SET name = ?, slug = ?, content = ?, seo_title = ?, seo_desc = ? WHERE id = ?'
    ).run(
      name || existing.name,
      slug || existing.slug,
      content !== undefined ? content : existing.content,
      seo_title !== undefined ? seo_title : existing.seo_title,
      seo_desc !== undefined ? seo_desc : existing.seo_desc,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM wb_pages WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

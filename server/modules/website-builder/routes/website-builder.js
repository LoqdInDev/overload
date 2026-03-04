const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate — SSE AI code generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { type, businessName, industry, pageType, description, style, prompt: rawPrompt } = req.body;

    if (rawPrompt && !businessName && !industry && !description) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (c) => sse.sendChunk(c),
        maxTokens: 8192,
      });
      logActivity('website-builder', 'generate', `Generated ${type || 'page'} content`, 'AI generation', null, wsId);
      return sse.sendResult({ content: text, type: type || 'custom' });
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
      onChunk: (t) => sse.sendChunk(t),
      maxTokens: 8192,
    });
    logActivity('website-builder', 'generate', 'Generated page content', pageType || 'landing', null, wsId);
    sse.sendResult({ content: text, pageType: pageType || 'landing' });
  } catch (error) {
    console.error('Website builder generation error:', error);
    sse.sendError(error);
  }
});

// GET /sites
router.get('/sites', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const sites = db.prepare('SELECT * FROM wb_sites WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sites
router.post('/sites', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, domain, template, pages, settings } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(
      'INSERT INTO wb_sites (name, domain, template, pages, settings, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, domain || null, template || null, pages ? JSON.stringify(pages) : null, settings ? JSON.stringify(settings) : null, wsId);
    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('website-builder', 'create', 'Created website', name, null, wsId);
    res.status(201).json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sites/:id
router.get('/sites/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const pages = db.prepare('SELECT * FROM wb_pages WHERE site_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    res.json({ ...site, pageList: pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /pages
router.post('/pages', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { site_id, name, slug, content, seo_title, seo_desc } = req.body;
    if (!site_id || !name) return res.status(400).json({ error: 'site_id and name are required' });
    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ? AND workspace_id = ?').get(site_id, wsId);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const result = db.prepare(
      'INSERT INTO wb_pages (site_id, name, slug, content, seo_title, seo_desc, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(site_id, name, slug || name.toLowerCase().replace(/\s+/g, '-'), content || null, seo_title || null, seo_desc || null, wsId);
    const page = db.prepare('SELECT * FROM wb_pages WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('website-builder', 'create', 'Created page', `${name} for site ${site.name}`, null, wsId);
    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /pages/:id
router.put('/pages/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, slug, content, seo_title, seo_desc } = req.body;
    const existing = db.prepare('SELECT * FROM wb_pages WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Page not found' });
    db.prepare(
      'UPDATE wb_pages SET name = ?, slug = ?, content = ?, seo_title = ?, seo_desc = ? WHERE id = ? AND workspace_id = ?'
    ).run(
      name || existing.name,
      slug || existing.slug,
      content !== undefined ? content : existing.content,
      seo_title !== undefined ? seo_title : existing.seo_title,
      seo_desc !== undefined ? seo_desc : existing.seo_desc,
      req.params.id,
      wsId
    );
    const updated = db.prepare('SELECT * FROM wb_pages WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sites/:id
router.delete('/sites/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM wb_pages WHERE site_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM wb_sites WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /pages/:id
router.delete('/pages/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    db.prepare('DELETE FROM wb_pages WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /pages/:id/duplicate
router.post('/pages/:id/duplicate', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const page = db.prepare('SELECT * FROM wb_pages WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const result = db.prepare(
      'INSERT INTO wb_pages (site_id, name, slug, content, seo_title, seo_desc, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      page.site_id,
      `${page.name} (Copy)`,
      `${page.slug}-copy-${Date.now()}`,
      page.content,
      page.seo_title,
      page.seo_desc,
      wsId
    );
    const newPage = db.prepare('SELECT * FROM wb_pages WHERE id = ?').get(result.lastInsertRowid);
    logActivity('website-builder', 'create', 'Duplicated page', page.name, null, wsId);
    res.status(201).json(newPage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sites/:id/export — download all pages as a ZIP file
router.get('/sites/:id/export', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const site = db.prepare('SELECT * FROM wb_sites WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const pages = db.prepare('SELECT * FROM wb_pages WHERE site_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    if (!pages.length) return res.status(400).json({ error: 'No pages to export' });

    const siteName = site.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'site';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${siteName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const usedNames = new Set();
    const fileMap = [];

    pages.forEach((page, i) => {
      let filename;
      if (i === 0 || page.slug === 'landing' || page.slug === 'index') {
        filename = 'index.html';
      } else {
        filename = `${page.slug.replace(/[^a-z0-9-]/g, '') || `page-${i}`}.html`;
      }
      if (usedNames.has(filename)) filename = filename.replace('.html', `-${i}.html`);
      usedNames.add(filename);
      fileMap.push({ name: page.name, file: filename });
      archive.append(page.content || '<!DOCTYPE html><html><body><h1>Empty Page</h1></body></html>', { name: filename });
    });

    const readme = `# ${site.name}

Exported from Overload on ${new Date().toLocaleDateString()}.

## Pages
${fileMap.map((f) => `- ${f.name} → ${f.file}`).join('\n')}

## Deploy options
- **Netlify Drop**: drag this folder to app.netlify.com/drop
- **Vercel**: run \`npx vercel\` in this directory
- **GitHub Pages**: push to a repo and enable Pages in Settings
- **Any host**: upload the HTML files to any static file host
`;
    archive.append(readme, { name: 'README.md' });
    archive.finalize();

    logActivity('website-builder', 'export', 'Exported site as ZIP', site.name, null, wsId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /add-section — SSE: generate a single section to inject into existing page
router.post('/add-section', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { currentHtml, sectionType, style, brandName } = req.body;
    if (!currentHtml || !sectionType) return sse.sendError(new Error('currentHtml and sectionType required'));

    const prompt = `You are a web developer. Generate ONLY a single HTML <section> element to inject into an existing webpage.

Section to generate: ${sectionType}
Brand: ${brandName || 'My Brand'}
Style: ${style || 'Minimal'}

Match the existing page's visual style. Here is a snippet of the existing page for style reference:
${currentHtml.substring(0, 1500)}

Rules:
- Return ONLY the HTML <section>...</section> element
- Match the design style of the existing page
- Do NOT include <html>, <head>, <body>, or page-level tags
- Do NOT include markdown code fences
- Include all necessary inline styles so the section looks good standalone`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (t) => sse.sendChunk(t),
      maxTokens: 2048,
    });
    sse.sendResult({ section: text, sectionType });
  } catch (error) {
    sse.sendError(error);
  }
});

// POST /swap-copy — SSE: rewrite text content only, preserve layout & styles
router.post('/swap-copy', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { currentHtml, instructions, brandName } = req.body;
    if (!currentHtml) return sse.sendError(new Error('currentHtml required'));

    const prompt = `You are a conversion copywriter. Rewrite ONLY the visible text content of this webpage. Keep ALL HTML structure, tags, classes, IDs, attributes, and styles completely identical.

Brand: ${brandName || 'My Brand'}
Instructions: ${instructions || 'Make the copy more compelling, benefit-focused, and conversion-optimized'}

Current HTML:
${currentHtml.substring(0, 6000)}

Rules:
- Keep ALL HTML markup, CSS, and attributes 100% unchanged
- Only replace visible text content between tags
- Make copy persuasive, specific, and action-oriented
- Return the complete HTML with only the text content changed
- No markdown code fences`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (t) => sse.sendChunk(t),
      maxTokens: 8192,
    });
    sse.sendResult({ content: text });
  } catch (error) {
    sse.sendError(error);
  }
});

// POST /seo-audit — real SEO analysis (no fake fallback)
router.post('/seo-audit', async (req, res) => {
  const { html, page_title } = req.body;
  if (!html) return res.status(400).json({ error: 'html required' });
  try {
    const { text } = await generateTextWithClaude(
      `You are an SEO expert. Audit this HTML for SEO quality.

Page Title: ${page_title || 'Unknown'}
HTML (first 3000 chars):
"""
${html.substring(0, 3000)}
"""

Return ONLY valid JSON (no markdown, no code fences):
{
  "overall_score": <number 0-100>,
  "checks": [
    { "name": "Title Tag", "status": "pass|fail|warning", "message": "<brief explanation>" },
    { "name": "Meta Description", "status": "pass|fail|warning", "message": "<brief explanation>" },
    { "name": "H1 Heading", "status": "pass|fail|warning", "message": "<brief explanation>" },
    { "name": "Alt Text on Images", "status": "pass|fail|warning", "message": "<brief explanation>" },
    { "name": "Mobile Friendly", "status": "pass|fail|warning", "message": "<brief explanation>" },
    { "name": "Page Speed", "status": "pass|fail|warning", "message": "<estimate based on asset count>" },
    { "name": "Semantic HTML", "status": "pass|fail|warning", "message": "<brief explanation>" }
  ],
  "top_fix": "<the single most impactful SEO improvement>"
}`,
      { maxTokens: 1024 }
    );
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (error) {
    res.status(500).json({ error: 'SEO audit failed: ' + (error.message || 'Claude returned invalid response') });
  }
});

// POST /brand-consistency — analyze all pages in a site for consistent branding
router.post('/brand-consistency', async (req, res) => {
  const wsId = req.workspace.id;
  const { site_id } = req.body;
  if (!site_id) return res.status(400).json({ error: 'site_id required' });
  try {
    const pages = db.prepare('SELECT * FROM wb_pages WHERE site_id = ? AND workspace_id = ?').all(site_id, wsId);
    if (!pages.length) return res.status(400).json({ error: 'No pages to analyze' });

    const summary = pages.map((p, i) => `Page ${i + 1} — ${p.name}:\n${(p.content || '').substring(0, 800)}`).join('\n\n---\n\n');

    const { text } = await generateTextWithClaude(
      `You are a brand consistency expert. Analyze these ${pages.length} webpage(s) for brand consistency across colors, fonts, navigation, copy tone, and spacing.

${summary}

Return ONLY valid JSON (no markdown):
{
  "score": <0-100>,
  "issues": [{ "type": "color|font|nav|tone|spacing", "severity": "high|medium|low", "message": "<what is inconsistent>", "fix": "<how to fix it>" }],
  "strengths": ["<what is consistent and good>"],
  "summary": "<1-2 sentence overall assessment>"
}`,
      { maxTokens: 1024 }
    );
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

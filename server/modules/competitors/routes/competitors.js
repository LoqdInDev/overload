const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const cheerio = require('cheerio');

// Scrape real content from a competitor's website
async function scrapeWebsite(url) {
  try {
    const normalised = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(normalised, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OverloadBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const headings = [];
    $('h1, h2, h3').each((_, el) => { const t = $(el).text().trim(); if (t && t.length < 200) headings.push(t); });
    const prices = [];
    $('*').each((_, el) => {
      const t = $(el).clone().children().remove().end().text().trim();
      if (/(\$|€|£)\d/.test(t) && t.length < 100) prices.push(t);
    });
    const ctaTexts = [];
    $('a[href], button').each((_, el) => { const t = $(el).text().trim(); if (t && t.length < 60) ctaTexts.push(t); });
    const navLinks = [];
    $('nav a, header a').each((_, el) => { const t = $(el).text().trim(); if (t && t.length < 40) navLinks.push(t); });

    return [
      title && `Page Title: ${title}`,
      metaDesc && `Meta Description: ${metaDesc}`,
      headings.slice(0, 12).length && `\nHeadings:\n${headings.slice(0, 12).map(h => `- ${h}`).join('\n')}`,
      prices.slice(0, 8).length && `\nPricing Found:\n${prices.slice(0, 8).map(p => `- ${p}`).join('\n')}`,
      ctaTexts.slice(0, 10).length && `\nCTA Buttons/Links:\n${[...new Set(ctaTexts.slice(0, 10))].map(c => `- ${c}`).join('\n')}`,
      navLinks.slice(0, 8).length && `\nNavigation:\n${[...new Set(navLinks.slice(0, 8))].map(n => `- ${n}`).join('\n')}`,
    ].filter(Boolean).join('\n');
  } catch (_) {
    return null;
  }
}

// GET / - List all competitors
router.get('/', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const competitors = db.prepare('SELECT * FROM ci_competitors WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(competitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - Create a competitor
router.post('/', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, website, industry, description, strengths, weaknesses } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Competitor name is required' });
    }

    const result = db.prepare(
      'INSERT INTO ci_competitors (name, website, industry, description, strengths, weaknesses, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, website || null, industry || null, description || null, strengths || null, weaknesses || null, wsId);

    const competitor = db.prepare('SELECT * FROM ci_competitors WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('competitors', 'create', 'Added competitor', name, null, wsId);
    res.status(201).json(competitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - Generic AI generation (SSE) - used by frontend
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;
    const finalPrompt = rawPrompt || `Generate competitive intelligence content for: ${type || 'general analysis'}`;

    const { text } = await generateTextWithClaude(finalPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('competitors', 'generate', `Generated ${type || 'analysis'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Competitor generation error:', error);
    sse.sendError(error);
  }
});

// POST /analyze - AI competitor analysis (SSE streaming)
router.post('/analyze', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { competitorId, competitorName, website, industry, analysisType } = req.body;

    // Scrape real website data if URL provided
    let scrapedData = null;
    if (website) {
      scrapedData = await scrapeWebsite(website);
    }

    const prompt = `You are an elite competitive intelligence analyst. Perform a thorough ${analysisType || 'comprehensive'} analysis of a competitor.

Competitor: ${competitorName || 'Unknown'}
Website: ${website || 'Not provided'}
Industry: ${industry || 'general'}
${scrapedData ? `\n--- LIVE DATA SCRAPED FROM THEIR WEBSITE ---\n${scrapedData}\n--- END LIVE DATA ---\n` : ''}

Based on the analysis type, provide:

${analysisType === 'ad-spy' ? `AD INTELLIGENCE:
- Likely ad platforms and formats they use
- Estimated ad spend patterns
- Creative strategy analysis (hooks, CTAs, visual style)
- Target audience segmentation
- Winning ad formulas to learn from
- Gaps you can exploit` :
analysisType === 'google-ads' ? `GOOGLE ADS INTELLIGENCE:
- Keywords they're likely bidding on (branded, generic, competitor terms)
- Estimated ad copy angles, hooks, and value propositions
- Landing page strategy inferred from their website content
- Ad extensions they likely use (sitelinks, callouts, structured snippets, review extensions)
- Campaign types in use (Search, Display, Shopping, YouTube, Performance Max)
- Budget tier estimates based on their market position and website scale
- Specific keyword gaps and bid strategy opportunities to outrank them on Google` :
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
      'INSERT INTO ci_reports (competitor_id, type, title, content, raw_response, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      competitorId || null,
      analysisType || 'comprehensive',
      `${analysisType || 'Comprehensive'} analysis of ${competitorName || 'competitor'}`,
      text,
      text,
      wsId
    );

    logActivity('competitors', 'analyze', `Analyzed competitor: ${competitorName || 'Unknown'}`, analysisType || 'comprehensive', null, wsId);
    sse.sendResult({ reportId: reportResult.lastInsertRowid, content: text });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    sse.sendError(error);
  }
});

// GET /reports - List all reports
router.get('/reports', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { competitorId } = req.query;
    let reports;

    if (competitorId) {
      reports = db.prepare(
        'SELECT r.*, c.name as competitor_name FROM ci_reports r LEFT JOIN ci_competitors c ON r.competitor_id = c.id WHERE r.workspace_id = ? AND r.competitor_id = ? ORDER BY r.created_at DESC'
      ).all(wsId, competitorId);
    } else {
      reports = db.prepare(
        'SELECT r.*, c.name as competitor_name FROM ci_reports r LEFT JOIN ci_competitors c ON r.competitor_id = c.id WHERE r.workspace_id = ? ORDER BY r.created_at DESC'
      ).all(wsId);
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /stats
router.get('/stats', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const totalCompetitors = db.prepare('SELECT COUNT(*) as count FROM ci_competitors WHERE workspace_id = ?').get(wsId).count;
    const totalReports = db.prepare('SELECT COUNT(*) as count FROM ci_reports WHERE workspace_id = ?').get(wsId).count;
    const byType = db.prepare('SELECT type, COUNT(*) as count FROM ci_reports WHERE workspace_id = ? GROUP BY type').all(wsId);
    const recentReports = db.prepare('SELECT COUNT(*) as count FROM ci_reports WHERE workspace_id = ? AND created_at > datetime("now", "-30 days")').get(wsId).count;
    res.json({ totalCompetitors, totalReports, byType, recentReports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /alerts - list recent alerts
router.get('/alerts', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const alerts = db.prepare('SELECT * FROM ci_alerts WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 20').all(wsId);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /reports/:id - delete a report
router.delete('/reports/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    db.prepare('DELETE FROM ci_reports WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a competitor
router.put('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, website, industry, description, strengths, weaknesses } = req.body;
    db.prepare(
      'UPDATE ci_competitors SET name = COALESCE(?, name), website = COALESCE(?, website), industry = COALESCE(?, industry), description = COALESCE(?, description), strengths = COALESCE(?, strengths), weaknesses = COALESCE(?, weaknesses) WHERE id = ? AND workspace_id = ?'
    ).run(name, website, industry, description, strengths, weaknesses, req.params.id, wsId);
    res.json(db.prepare('SELECT * FROM ci_competitors WHERE id = ?').get(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /ads - Fetch live ads from Meta Ad Library
router.get('/ads', async (req, res) => {
  const token = process.env.META_AD_LIBRARY_TOKEN;
  if (!token) return res.status(503).json({ error: 'META_AD_LIBRARY_TOKEN not configured' });

  const { name, country } = req.query;
  if (!name) return res.status(400).json({ error: 'name query param required' });

  try {
    const params = new URLSearchParams({
      search_terms: name,
      ad_reached_countries: JSON.stringify([country || 'US']),
      ad_active_status: 'ALL',
      fields: 'id,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,ad_snapshot_url,page_name,impressions,ad_delivery_start_time,ad_delivery_stop_time,funding_entity,publisher_platforms',
      limit: '25',
      access_token: token,
    });
    const apiRes = await fetch(`https://graph.facebook.com/v21.0/ads_archive?${params}`);
    const data = await apiRes.json();
    if (data.error) return res.status(400).json({ error: data.error.message || data.error.type || JSON.stringify(data.error) });
    res.json(data);
  } catch (error) {
    console.error('Meta Ad Library error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a competitor and cascade its reports and alerts
router.delete('/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    db.prepare('DELETE FROM ci_reports WHERE competitor_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM ci_alerts WHERE competitor_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    db.prepare('DELETE FROM ci_competitors WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

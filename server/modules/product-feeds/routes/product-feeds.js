const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI product description optimization
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { products, channel, tone, keywords, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !products && !channel) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      await logActivity('product-feeds', 'generate', 'Generated product content', 'AI generation', null, wsId);
      sse.sendResult({ content: text });
      return;
    }

    const productList = (products || []).map((p, i) =>
      `${i + 1}. "${p.title}" - Description: "${p.description || 'None'}" - Price: $${p.price || 'N/A'} - Brand: ${p.brand || 'N/A'} - Category: ${p.category || 'N/A'}`
    ).join('\n');

    const prompt = `You are an expert e-commerce copywriter specializing in product feed optimization.

Channel: ${channel || 'Google Shopping'}
Tone: ${tone || 'Professional and conversion-focused'}
Target keywords: ${keywords || 'Not specified'}

Products to optimize:
${productList}

For each product, generate an optimized title and description that:
- Follows ${channel || 'Google Shopping'} best practices and character limits
- Includes relevant keywords naturally
- Highlights key selling points and benefits
- Is optimized for search and conversion
- Uses proper formatting for the target channel

Return a JSON array:
[
  {
    "original_title": "Original title",
    "optimized_title": "New optimized title (max 150 chars for Google, 200 for Meta)",
    "optimized_description": "New optimized description",
    "keywords": ["keyword1", "keyword2"],
    "score": 85,
    "tips": "Brief optimization note"
  }
]`;

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    await logActivity('product-feeds', 'generate', 'Optimized product descriptions', `${(products || []).length} products`, null, wsId);
    sse.sendResult({ optimizations: parsed });
  } catch (error) {
    console.error('Product feed generation error:', error);
    sse.sendError(error);
  }
});

// GET /feeds
router.get('/feeds', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const feeds = await db.prepare('SELECT * FROM pf_feeds WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);

    const feedsWithCounts = feeds.map(feed => {
      const count = db.prepare('SELECT COUNT(*) as count FROM pf_products WHERE feed_id = ? AND workspace_id = ?').get(feed.id, wsId);
      const rules = db.prepare('SELECT COUNT(*) as count FROM pf_rules WHERE feed_id = ? AND workspace_id = ?').get(feed.id, wsId);
      return { ...feed, product_count: count.count, rule_count: rules.count };
    });

    res.json(feedsWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /feeds
router.post('/feeds', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, channel, format, status } = req.body;

    if (!name || !channel) {
      return res.status(400).json({ error: 'Name and channel are required' });
    }

    const result = db.prepare(
      'INSERT INTO pf_feeds (name, channel, format, status, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, channel, format || 'csv', status || 'active', wsId);

    const feed = await db.prepare('SELECT * FROM pf_feeds WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    await logActivity('product-feeds', 'create', 'Created product feed', `${name} (${channel})`, null, wsId);
    res.status(201).json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /feeds/:id
router.get('/feeds/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const feed = await db.prepare('SELECT * FROM pf_feeds WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    const products = await db.prepare('SELECT * FROM pf_products WHERE feed_id = ? AND workspace_id = ? ORDER BY created_at DESC').all(req.params.id, wsId);
    const rules = await db.prepare('SELECT * FROM pf_rules WHERE feed_id = ? AND workspace_id = ? ORDER BY created_at ASC').all(req.params.id, wsId);
    res.json({ ...feed, products, rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products
router.get('/products', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { feed_id, category, brand, search } = req.query;
    let sql = 'SELECT p.*, f.name as feed_name, f.channel FROM pf_products p JOIN pf_feeds f ON p.feed_id = f.id WHERE p.workspace_id = ?';
    const params = [wsId];

    if (feed_id) { sql += ' AND p.feed_id = ?'; params.push(feed_id); }
    if (category) { sql += ' AND p.category = ?'; params.push(category); }
    if (brand) { sql += ' AND p.brand = ?'; params.push(brand); }
    if (search) { sql += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY p.created_at DESC';
    const products = await db.prepare(sql).all(...params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products
router.post('/products', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { feed_id, title, description, price, sale_price, image_url, category, brand, sku, availability } = req.body;

    if (!feed_id || !title) {
      return res.status(400).json({ error: 'feed_id and title are required' });
    }

    const feed = await db.prepare('SELECT * FROM pf_feeds WHERE id = ? AND workspace_id = ?').get(feed_id, wsId);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    const result = db.prepare(
      'INSERT INTO pf_products (feed_id, title, description, price, sale_price, image_url, category, brand, sku, availability, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(feed_id, title, description || null, price || null, sale_price || null, image_url || null, category || null, brand || null, sku || null, availability || 'in_stock', wsId);

    // Update feed product count
    const count = db.prepare('SELECT COUNT(*) as count FROM pf_products WHERE feed_id = ? AND workspace_id = ?').get(feed_id, wsId);
    await db.prepare('UPDATE pf_feeds SET product_count = ? WHERE id = ? AND workspace_id = ?').run(count.count, feed_id, wsId);

    const product = await db.prepare('SELECT * FROM pf_products WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    await logActivity('product-feeds', 'create', 'Added product', `${title} to ${feed.name}`, null, wsId);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /feeds/:id - Update a feed
router.put('/feeds/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, channel, format, status } = req.body;
    db.prepare(
      'UPDATE pf_feeds SET name = COALESCE(?, name), channel = COALESCE(?, channel), format = COALESCE(?, format), status = COALESCE(?, status) WHERE id = ? AND workspace_id = ?'
    ).run(name, channel, format, status, req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /feeds/:id - Delete a feed and cascade its products and rules
router.delete('/feeds/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    await db.prepare('DELETE FROM pf_rules WHERE feed_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    await db.prepare('DELETE FROM pf_products WHERE feed_id = ? AND workspace_id = ?').run(req.params.id, wsId);
    await db.prepare('DELETE FROM pf_feeds WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /products/:id - Update a product
router.put('/products/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { title, description, price, sale_price, availability } = req.body;
    db.prepare(
      'UPDATE pf_products SET title = COALESCE(?, title), description = COALESCE(?, description), price = COALESCE(?, price), sale_price = COALESCE(?, sale_price), availability = COALESCE(?, availability) WHERE id = ? AND workspace_id = ?'
    ).run(title, description, price, sale_price, availability, req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /products/:id - Delete a product
router.delete('/products/:id', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    await db.prepare('DELETE FROM pf_products WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /optimize - Bulk optimize existing products
router.post('/optimize', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { feed_id, product_ids, channel } = req.body;

    let products;
    if (product_ids && product_ids.length > 0) {
      // Validate all IDs are integers, then query individually and merge
      const safeIds = product_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      products = [];
      for (const id of safeIds) {
        const row = await db.prepare('SELECT * FROM pf_products WHERE id = ? AND workspace_id = ?').get(id, wsId);
        if (row) products.push(row);
      }
    } else if (feed_id) {
      products = await db.prepare('SELECT * FROM pf_products WHERE feed_id = ? AND workspace_id = ? LIMIT 20').all(feed_id, wsId);
    } else {
      return sse.sendError({ message: 'feed_id or product_ids required' });
    }

    if (products.length === 0) {
      return sse.sendError({ message: 'No products found to optimize' });
    }

    const feed = feed_id ? await db.prepare('SELECT * FROM pf_feeds WHERE id = ? AND workspace_id = ?').get(feed_id, wsId) : null;
    const targetChannel = channel || feed?.channel || 'Google Shopping';

    const productList = products.map((p, i) =>
      `${i + 1}. [ID:${p.id}] "${p.title}" - Description: "${p.description || 'None'}" - Price: $${p.price || 'N/A'} - Brand: ${p.brand || 'N/A'} - Category: ${p.category || 'N/A'}`
    ).join('\n');

    const prompt = `You are an expert e-commerce copywriter. Optimize these product listings for ${targetChannel}.

Products:
${productList}

For each product, return an optimized version following ${targetChannel} best practices.

Return a JSON array:
[
  {
    "product_id": ${products[0]?.id || 0},
    "optimized_title": "Optimized title",
    "optimized_description": "Optimized description",
    "score": 88,
    "suggestions": ["Suggestion 1", "Suggestion 2"]
  }
]

Include the correct product_id for each entry. Product IDs in order: ${products.map(p => p.id).join(', ')}`;

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    await logActivity('product-feeds', 'optimize', 'Bulk optimized products', `${products.length} products on ${targetChannel}`, null, wsId);
    sse.sendResult({ optimizations: parsed });
  } catch (error) {
    console.error('Product optimization error:', error);
    sse.sendError(error);
  }
});

// POST /audit-feed — audit product feed quality
router.post('/audit-feed', async (req, res) => {
  const { product_count, sample_product } = req.body;

  generateTextWithClaude(`You are a product feed optimization expert. Audit this feed configuration:

Product Count: ${product_count || 'Unknown'}
Sample Product: ${JSON.stringify(sample_product || {})}

Return JSON:
{
  "health_score": <number 0-100>,
  "checks": [
    { "name": "Title Quality", "status": "pass|fail|warning", "issue": "<specific problem if not pass>", "fix": "<specific fix>" },
    { "name": "Description Quality", "status": "pass|fail|warning", "issue": "<issue>", "fix": "<fix>" },
    { "name": "Image Count", "status": "pass|fail|warning", "issue": "<issue>", "fix": "<fix>" },
    { "name": "Price & Currency", "status": "pass|fail|warning", "issue": "<issue>", "fix": "<fix>" },
    { "name": "Category Mapping", "status": "pass|fail|warning", "issue": "<issue>", "fix": "<fix>" },
    { "name": "GTIN/MPN/Brand", "status": "pass|fail|warning", "issue": "<issue>", "fix": "<fix>" },
    { "name": "Condition & Availability", "status": "pass|fail|warning", "issue": "<issue>", "fix": "<fix>" }
  ],
  "critical_fixes": ["<most urgent fix>", "<second most urgent>"],
  "estimated_reach_improvement": "<like 25% more impressions after fixes>"
}

Only return JSON.`)
    .then(result => {
      const text = result.text || '';
      try { res.json(JSON.parse(text.trim())); }
      catch { res.json({ health_score: 65, checks: [], critical_fixes: ['Add GTINs', 'Improve titles'], estimated_reach_improvement: '~20% improvement' }); }
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;

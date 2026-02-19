const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI product description optimization
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { products, channel, tone, keywords, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !products && !channel) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('product-feeds', 'generate', 'Generated product content', 'AI generation');
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

    logActivity('product-feeds', 'generate', 'Optimized product descriptions', `${(products || []).length} products`);
    sse.sendResult({ optimizations: parsed });
  } catch (error) {
    console.error('Product feed generation error:', error);
    sse.sendError(error);
  }
});

// GET /feeds
router.get('/feeds', (req, res) => {
  try {
    const feeds = db.prepare('SELECT * FROM pf_feeds ORDER BY created_at DESC').all();

    const feedsWithCounts = feeds.map(feed => {
      const count = db.prepare('SELECT COUNT(*) as count FROM pf_products WHERE feed_id = ?').get(feed.id);
      const rules = db.prepare('SELECT COUNT(*) as count FROM pf_rules WHERE feed_id = ?').get(feed.id);
      return { ...feed, product_count: count.count, rule_count: rules.count };
    });

    res.json(feedsWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /feeds
router.post('/feeds', (req, res) => {
  try {
    const { name, channel, format, status } = req.body;

    if (!name || !channel) {
      return res.status(400).json({ error: 'Name and channel are required' });
    }

    const result = db.prepare(
      'INSERT INTO pf_feeds (name, channel, format, status) VALUES (?, ?, ?, ?)'
    ).run(name, channel, format || 'csv', status || 'active');

    const feed = db.prepare('SELECT * FROM pf_feeds WHERE id = ?').get(result.lastInsertRowid);
    logActivity('product-feeds', 'create', 'Created product feed', `${name} (${channel})`);
    res.status(201).json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /feeds/:id
router.get('/feeds/:id', (req, res) => {
  try {
    const feed = db.prepare('SELECT * FROM pf_feeds WHERE id = ?').get(req.params.id);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    const products = db.prepare('SELECT * FROM pf_products WHERE feed_id = ? ORDER BY created_at DESC').all(req.params.id);
    const rules = db.prepare('SELECT * FROM pf_rules WHERE feed_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ ...feed, products, rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products
router.get('/products', (req, res) => {
  try {
    const { feed_id, category, brand, search } = req.query;
    let sql = 'SELECT p.*, f.name as feed_name, f.channel FROM pf_products p JOIN pf_feeds f ON p.feed_id = f.id WHERE 1=1';
    const params = [];

    if (feed_id) { sql += ' AND p.feed_id = ?'; params.push(feed_id); }
    if (category) { sql += ' AND p.category = ?'; params.push(category); }
    if (brand) { sql += ' AND p.brand = ?'; params.push(brand); }
    if (search) { sql += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY p.created_at DESC';
    const products = db.prepare(sql).all(...params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products
router.post('/products', (req, res) => {
  try {
    const { feed_id, title, description, price, sale_price, image_url, category, brand, sku, availability } = req.body;

    if (!feed_id || !title) {
      return res.status(400).json({ error: 'feed_id and title are required' });
    }

    const feed = db.prepare('SELECT * FROM pf_feeds WHERE id = ?').get(feed_id);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    const result = db.prepare(
      'INSERT INTO pf_products (feed_id, title, description, price, sale_price, image_url, category, brand, sku, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(feed_id, title, description || null, price || null, sale_price || null, image_url || null, category || null, brand || null, sku || null, availability || 'in_stock');

    // Update feed product count
    const count = db.prepare('SELECT COUNT(*) as count FROM pf_products WHERE feed_id = ?').get(feed_id);
    db.prepare('UPDATE pf_feeds SET product_count = ? WHERE id = ?').run(count.count, feed_id);

    const product = db.prepare('SELECT * FROM pf_products WHERE id = ?').get(result.lastInsertRowid);
    logActivity('product-feeds', 'create', 'Added product', `${title} to ${feed.name}`);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /optimize - Bulk optimize existing products
router.post('/optimize', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { feed_id, product_ids, channel } = req.body;

    let products;
    if (product_ids && product_ids.length > 0) {
      const placeholders = product_ids.map(() => '?').join(',');
      products = db.prepare(`SELECT * FROM pf_products WHERE id IN (${placeholders})`).all(...product_ids);
    } else if (feed_id) {
      products = db.prepare('SELECT * FROM pf_products WHERE feed_id = ? LIMIT 20').all(feed_id);
    } else {
      return sse.sendError({ message: 'feed_id or product_ids required' });
    }

    if (products.length === 0) {
      return sse.sendError({ message: 'No products found to optimize' });
    }

    const feed = feed_id ? db.prepare('SELECT * FROM pf_feeds WHERE id = ?').get(feed_id) : null;
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

    logActivity('product-feeds', 'optimize', 'Bulk optimized products', `${products.length} products on ${targetChannel}`);
    sse.sendResult({ optimizations: parsed });
  } catch (error) {
    console.error('Product optimization error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

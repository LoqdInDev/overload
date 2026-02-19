const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const pm = require('../../../services/platformManager');

// GET / - list all stores
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM eh_stores ORDER BY created_at DESC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - get a single store with orders and products
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM eh_stores WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const orders = db.prepare('SELECT * FROM eh_orders WHERE store_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
    const products = db.prepare('SELECT * FROM eh_products WHERE store_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ ...item, orders, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST / - create a store
router.post('/', (req, res) => {
  try {
    const { platform, store_name, store_url, api_key, status } = req.body;
    const result = db.prepare(
      'INSERT INTO eh_stores (platform, store_name, store_url, api_key, status) VALUES (?, ?, ?, ?, ?)'
    ).run(platform || null, store_name, store_url || null, api_key || null, status || 'connected');
    const item = db.prepare('SELECT * FROM eh_stores WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - update a store
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM eh_stores WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { platform, store_name, store_url, api_key, status, last_sync } = req.body;
    db.prepare(
      'UPDATE eh_stores SET platform = ?, store_name = ?, store_url = ?, api_key = ?, status = ?, last_sync = ? WHERE id = ?'
    ).run(
      platform !== undefined ? platform : existing.platform,
      store_name || existing.store_name,
      store_url !== undefined ? store_url : existing.store_url,
      api_key !== undefined ? api_key : existing.api_key,
      status || existing.status,
      last_sync !== undefined ? last_sync : existing.last_sync,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM eh_stores WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - delete a store and related data
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM eh_stores WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM eh_orders WHERE store_id = ?').run(req.params.id);
    db.prepare('DELETE FROM eh_products WHERE store_id = ?').run(req.params.id);
    db.prepare('DELETE FROM eh_stores WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders/list - list all orders
router.get('/orders/list', (req, res) => {
  try {
    const { store_id, status } = req.query;
    let query = 'SELECT o.*, s.store_name FROM eh_orders o LEFT JOIN eh_stores s ON o.store_id = s.id';
    const conditions = [];
    const params = [];
    if (store_id) { conditions.push('o.store_id = ?'); params.push(store_id); }
    if (status) { conditions.push('o.status = ?'); params.push(status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY o.created_at DESC';
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /orders - create an order
router.post('/orders', (req, res) => {
  try {
    const { store_id, order_number, customer, total, status, platform } = req.body;
    const result = db.prepare(
      'INSERT INTO eh_orders (store_id, order_number, customer, total, status, platform) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(store_id || null, order_number || null, customer || null, total || 0, status || 'pending', platform || null);
    const item = db.prepare('SELECT * FROM eh_orders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/list - list all products
router.get('/products/list', (req, res) => {
  try {
    const { store_id, status } = req.query;
    let query = 'SELECT p.*, s.store_name FROM eh_products p LEFT JOIN eh_stores s ON p.store_id = s.id';
    const conditions = [];
    const params = [];
    if (store_id) { conditions.push('p.store_id = ?'); params.push(store_id); }
    if (status) { conditions.push('p.status = ?'); params.push(status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.created_at DESC';
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products - create a product
router.post('/products', (req, res) => {
  try {
    const { store_id, name, sku, price, stock, status } = req.body;
    const result = db.prepare(
      'INSERT INTO eh_products (store_id, name, sku, price, stock, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(store_id || null, name, sku || null, price || 0, stock || 0, status || 'active');
    const item = db.prepare('SELECT * FROM eh_products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate - AI generation with SSE
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt: rawPrompt } = req.body;

    const systemPrompt = `You are an AI assistant specializing in e-commerce operations. You help optimize product listings, analyze order trends, manage inventory, and improve store performance across platforms.`;

    const userPrompt = rawPrompt || `Analyze the e-commerce store data and provide recommendations for improving sales, optimizing product listings, and managing inventory more effectively.`;

    const { text } = await generateTextWithClaude(userPrompt, {
      system: systemPrompt,
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    sse.sendResult({ content: text, type: type || 'analysis' });
  } catch (error) {
    console.error('E-Commerce Hub generation error:', error);
    sse.sendError(error);
  }
});

// ══════════════════════════════════════════════════════
// Real Platform Integration Routes (Shopify)
// ══════════════════════════════════════════════════════

// GET /platforms/products - pull products from connected Shopify
router.get('/platforms/products', async (req, res) => {
  try {
    if (!pm.isConnected('shopify')) {
      return res.status(400).json({ success: false, error: 'Shopify not connected. Go to Integrations to connect.' });
    }
    const { limit, sinceId } = req.query;
    const products = await pm.ecommerceProducts('shopify', { limit: parseInt(limit) || 50, sinceId });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Shopify products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/orders - pull orders from connected Shopify
router.get('/platforms/orders', async (req, res) => {
  try {
    if (!pm.isConnected('shopify')) {
      return res.status(400).json({ success: false, error: 'Shopify not connected. Go to Integrations to connect.' });
    }
    const { limit, status, createdAtMin, createdAtMax } = req.query;
    const orders = await pm.ecommerceOrders('shopify', {
      limit: parseInt(limit) || 50,
      status: status || 'any',
      createdAtMin, createdAtMax,
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Shopify orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /platforms/sync - sync products and orders from Shopify into local DB
router.post('/platforms/sync', async (req, res) => {
  try {
    if (!pm.isConnected('shopify')) {
      return res.status(400).json({ success: false, error: 'Shopify not connected' });
    }

    const conn = pm.getConnection('shopify');
    const shop = conn?.account_id || req.body.shop;

    // Find or create the store record
    let store = db.prepare("SELECT * FROM eh_stores WHERE platform = 'shopify' AND store_name = ?").get(shop || 'Shopify');
    if (!store) {
      const r = db.prepare("INSERT INTO eh_stores (platform, store_name, status) VALUES ('shopify', ?, 'connected')").run(shop || 'Shopify');
      store = db.prepare('SELECT * FROM eh_stores WHERE id = ?').get(r.lastInsertRowid);
    }

    // Sync products
    const products = await pm.ecommerceProducts('shopify', { limit: 50 });
    for (const p of products) {
      const existing = db.prepare('SELECT id FROM eh_products WHERE store_id = ? AND sku = ?').get(store.id, String(p.id));
      if (existing) {
        db.prepare('UPDATE eh_products SET name = ?, price = ?, stock = ?, status = ? WHERE id = ?')
          .run(p.title, p.price || 0, p.inventory || 0, p.status || 'active', existing.id);
      } else {
        db.prepare('INSERT INTO eh_products (store_id, name, sku, price, stock, status) VALUES (?, ?, ?, ?, ?, ?)')
          .run(store.id, p.title, String(p.id), p.price || 0, p.inventory || 0, p.status || 'active');
      }
    }

    // Sync orders
    const orders = await pm.ecommerceOrders('shopify', { limit: 50 });
    for (const o of orders) {
      const existing = db.prepare('SELECT id FROM eh_orders WHERE store_id = ? AND order_number = ?').get(store.id, String(o.orderNumber));
      if (existing) {
        db.prepare('UPDATE eh_orders SET customer = ?, total = ?, status = ? WHERE id = ?')
          .run(o.customerName, o.totalPrice, o.financialStatus || 'pending', existing.id);
      } else {
        db.prepare('INSERT INTO eh_orders (store_id, order_number, customer, total, status, platform) VALUES (?, ?, ?, ?, ?, ?)')
          .run(store.id, String(o.orderNumber), o.customerName, o.totalPrice, o.financialStatus || 'pending', 'shopify');
      }
    }

    db.prepare("UPDATE eh_stores SET last_sync = datetime('now') WHERE id = ?").run(store.id);

    res.json({ success: true, synced: { products: products.length, orders: orders.length } });
  } catch (error) {
    console.error('Shopify sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /platforms/connected - check if Shopify is connected
router.get('/platforms/connected', (req, res) => {
  try {
    const connected = pm.getConnectedProviders()
      .filter(p => ['shopify', 'bigcommerce', 'amazon'].includes(p.provider_id));
    res.json({ success: true, data: connected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

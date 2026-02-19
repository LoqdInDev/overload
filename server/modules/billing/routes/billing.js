const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate billing content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Billing`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('billing', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Billing generation error:', error);
    sse.sendError(error);
  }
});

// Get current subscription
router.get('/subscription', (req, res) => {
  try {
    const subscription = db.prepare('SELECT * FROM bl_subscriptions ORDER BY created_at DESC LIMIT 1').get();
    res.json(subscription || { plan: 'free', status: 'active', billing_cycle: 'monthly', amount: 0 });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Get invoices
router.get('/invoices', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM bl_invoices';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const invoices = db.prepare(query).all(...params);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get usage data
router.get('/usage', (req, res) => {
  try {
    const { module, date } = req.query;
    let query = 'SELECT * FROM bl_usage WHERE 1=1';
    const params = [];
    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const usage = db.prepare(query).all(...params);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

module.exports = router;

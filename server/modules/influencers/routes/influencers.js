const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /search - AI influencer discovery (SSE)
router.post('/search', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { niche, platform, followerMin, followerMax, engagementRate, budget } = req.body;

    const prompt = `You are an expert influencer marketing researcher. Find and recommend influencers matching these criteria:

Niche: ${niche || 'general'}
Platform: ${platform || 'Instagram'}
Follower Range: ${followerMin || '10000'} - ${followerMax || '500000'}
Minimum Engagement Rate: ${engagementRate || '2'}%
Budget: ${budget ? '$' + budget : 'Flexible'}

Provide a list of 8-12 influencer profiles with:
1. Suggested influencer name/handle (realistic examples for the niche)
2. Estimated follower count
3. Estimated engagement rate
4. Content style description
5. Why they're a good fit for this niche
6. Estimated cost per post
7. Best collaboration format (sponsored post, story, reel, unboxing, etc.)
8. Audience demographic match score (1-10)

Also provide:
- Overall niche analysis (competition level, saturation, trending topics)
- Recommended influencer tier mix (nano, micro, mid, macro)
- Budget allocation strategy
- Red flags to watch for in this niche`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    // Save search to database
    const result = db.prepare(
      'INSERT INTO inf_searches (niche, platform, criteria, results) VALUES (?, ?, ?, ?)'
    ).run(niche, platform, JSON.stringify({ followerMin, followerMax, engagementRate, budget }), text);

    logActivity('influencers', 'search', `Searched ${platform || 'Instagram'} influencers`, niche || 'general');
    sse.sendResult({ content: text, searchId: result.lastInsertRowid });
  } catch (error) {
    console.error('Influencer search error:', error);
    sse.sendError(error);
  }
});

// POST /generate-outreach - AI outreach template generation (SSE)
router.post('/generate-outreach', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { templateType, influencerName, niche, platform, product, budget, campaignGoal } = req.body;

    const typeLabels = {
      'initial': 'Initial Contact / Introduction DM',
      'collaboration': 'Collaboration Proposal',
      'gifting': 'Product Gifting Offer',
      'paid': 'Paid Partnership Proposal',
    };

    const prompt = `You are an expert influencer outreach specialist. Write a ${typeLabels[templateType] || 'outreach'} message:

Template Type: ${typeLabels[templateType] || templateType || 'Initial Contact'}
Influencer: ${influencerName || 'the influencer'}
Platform: ${platform || 'Instagram'}
Niche: ${niche || 'general'}
Product/Brand: ${product || 'our brand'}
Campaign Goal: ${campaignGoal || 'brand awareness'}
Budget Range: ${budget ? '$' + budget : 'To be discussed'}

Write 3 variations of the outreach message:
1. Casual / DM-friendly version
2. Professional / Email version
3. Brief / Follow-up version

For each, provide:
- Subject line (for email versions)
- Message body
- Key personalization hooks to customize
- Best time to send
- Follow-up timeline

Also include:
- Negotiation talking points
- Common objections and responses
- Rate card benchmarks for this tier
- Contract terms to include`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('influencers', 'outreach', `Generated ${templateType || 'outreach'} template`, influencerName || 'general');
    sse.sendResult({ content: text, templateType: templateType || 'initial' });
  } catch (error) {
    console.error('Outreach generation error:', error);
    sse.sendError(error);
  }
});

// POST /generate - Generic AI generation (SSE) - used by frontend for all tool types
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, prompt } = req.body;
    const finalPrompt = prompt || `Generate influencer marketing content for: ${type || 'general'}`;

    const { text } = await generateTextWithClaude(finalPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('influencers', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Influencer generation error:', error);
    sse.sendError(error);
  }
});

// GET /campaigns - List all campaigns
router.get('/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM inf_campaigns ORDER BY created_at DESC').all();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /campaigns - Create a campaign
router.post('/campaigns', (req, res) => {
  try {
    const { name, influencers, budget, status } = req.body;

    const result = db.prepare(
      'INSERT INTO inf_campaigns (name, influencers, budget, status) VALUES (?, ?, ?, ?)'
    ).run(name, influencers ? JSON.stringify(influencers) : null, budget || 0, status || 'planning');

    const campaign = db.prepare('SELECT * FROM inf_campaigns WHERE id = ?').get(result.lastInsertRowid);
    logActivity('influencers', 'create', 'Created campaign', name);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /searches - List recent searches
router.get('/searches', (req, res) => {
  try {
    const searches = db.prepare('SELECT * FROM inf_searches ORDER BY created_at DESC LIMIT 20').all();
    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

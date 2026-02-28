const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI brand strategy generation (SSE)
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);

  try {
    const { brandName, industry, targetAudience, elementType, currentBrand } = req.body;

    const prompt = `You are a world-class brand strategist. Generate a detailed ${elementType || 'comprehensive brand strategy'} for a brand.

Brand: ${brandName || 'the brand'}
Industry: ${industry || 'general'}
Target Audience: ${targetAudience || 'Not specified'}
${currentBrand ? `Current Brand Context: ${JSON.stringify(currentBrand)}` : ''}

${elementType === 'voice' ? `BRAND VOICE GUIDE:
- Core voice attributes (3-5 defining characteristics)
- Tone spectrum (how voice adjusts for different contexts: social, support, marketing, crisis)
- Vocabulary guidelines (words to use, words to avoid)
- Grammar and style rules
- Example messages for each channel (social media, email, website, ads)
- Do's and Don'ts with real examples` :
elementType === 'positioning' ? `BRAND POSITIONING:
- Positioning statement (classic format: For [target], [brand] is the [category] that [key benefit] because [reason to believe])
- Unique Value Proposition (UVP)
- Competitive differentiators
- Brand promise
- Elevator pitches (5-second, 30-second, 2-minute versions)
- Category definition and ownership strategy
- Perceptual map description` :
elementType === 'guidelines' ? `BRAND GUIDELINES:
- Mission and vision statements
- Core values (3-5 with descriptions)
- Visual identity direction (color psychology, typography personality, imagery style)
- Logo usage rules
- Brand architecture
- Communication standards across channels
- Brand storytelling framework
- Cultural considerations` :
elementType === 'persona' ? `BUYER PERSONAS:
- 3-4 detailed buyer personas including:
  - Name, age, role, demographics
  - Psychographics (values, interests, lifestyle)
  - Pain points and challenges
  - Goals and motivations
  - Buying behavior and decision factors
  - Preferred channels and content types
  - Objections and how to overcome them
  - A day-in-the-life narrative` :
elementType === 'messaging' ? `MESSAGING FRAMEWORK:
- Core brand message / tagline options (3-5)
- Key messages for each audience segment
- Message hierarchy (primary, secondary, supporting)
- Proof points and evidence
- Story arcs for different marketing funnels
- Objection handling scripts
- Social proof integration strategy
- Emotional triggers and rational appeals` :
`COMPREHENSIVE BRAND STRATEGY:
- Brand purpose and mission
- Vision statement
- Core values
- Brand voice and personality
- Positioning statement
- Key messaging pillars
- Target audience personas (brief)
- Competitive differentiation
- Brand story narrative
- Implementation roadmap`}

Be thorough, strategic, and provide ready-to-implement content.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    logActivity('brand-strategy', 'generate', 'Generated brand strategy', `${brandName || 'brand'} - ${elementType || 'comprehensive'}`, null, wsId);
    sse.sendResult({ content: text });
  } catch (error) {
    console.error('Brand strategy generation error:', error);
    sse.sendError(error);
  }
});

// GET /brands - List all brands
router.get('/brands', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const brands = db.prepare('SELECT * FROM bs_brands WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId);
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /brands - Create a brand
router.post('/brands', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const { name, voice, positioning, guidelines, personas } = req.body;

    const result = db.prepare(
      'INSERT INTO bs_brands (name, voice, positioning, guidelines, personas, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, voice || null, positioning || null, guidelines || null, personas || null, wsId);

    const brand = db.prepare('SELECT * FROM bs_brands WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('brand-strategy', 'create', 'Created brand', name, null, wsId);
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /brands/:id - Get a specific brand with assets
router.get('/brands/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const brand = db.prepare('SELECT * FROM bs_brands WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const assets = db.prepare('SELECT * FROM bs_assets WHERE brand_id = ? AND workspace_id = ? ORDER BY created_at DESC').all(req.params.id, wsId);
    res.json({ ...brand, assets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /brands/:id - Update a brand
router.put('/brands/:id', (req, res) => {
  const wsId = req.workspace.id;
  try {
    const brand = db.prepare('SELECT * FROM bs_brands WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const { name, voice, positioning, guidelines, personas } = req.body;

    db.prepare(
      'UPDATE bs_brands SET name = ?, voice = ?, positioning = ?, guidelines = ?, personas = ?, updated_at = datetime(\'now\') WHERE id = ? AND workspace_id = ?'
    ).run(
      name || brand.name,
      voice !== undefined ? voice : brand.voice,
      positioning !== undefined ? positioning : brand.positioning,
      guidelines !== undefined ? guidelines : brand.guidelines,
      personas !== undefined ? personas : brand.personas,
      req.params.id, wsId
    );

    const updated = db.prepare('SELECT * FROM bs_brands WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    logActivity('brand-strategy', 'update', 'Updated brand', updated.name, null, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

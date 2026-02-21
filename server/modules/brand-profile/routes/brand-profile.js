const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { getBrandContext, buildBrandSystemPrompt, invalidateCache } = require('../../../services/brandContext');

// Generate brand profile content with AI
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const brand = getBrandContext();
    const brandBlock = buildBrandSystemPrompt(brand);
    const fullPrompt = `${prompt || `Generate ${type || 'content'} for Brand Profile`}${brandBlock}`;
    const { text } = await generateTextWithClaude(fullPrompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    logActivity('brand-profile', 'generate', `Generated ${type || 'content'}`, 'AI generation');
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Brand Profile generation error:', error);
    sse.sendError(error);
  }
});

// Get the brand profile
router.get('/profile', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM bp_profiles ORDER BY created_at DESC LIMIT 1').get();
    res.json(profile || {});
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch brand profile' });
  }
});

// Create a new brand profile
router.post('/profile', (req, res) => {
  try {
    const {
      brand_name, tagline, mission, vision, values, voice_tone, voice_personality,
      target_audience, competitors, colors, fonts, logo_url, guidelines, keywords,
      industry, website, social_links, words_to_use, words_to_avoid
    } = req.body;

    const result = db.prepare(
      `INSERT INTO bp_profiles (brand_name, tagline, mission, vision, values, voice_tone, voice_personality,
        target_audience, competitors, colors, fonts, logo_url, guidelines, keywords, industry, website, social_links,
        words_to_use, words_to_avoid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      brand_name, tagline, mission, vision, JSON.stringify(values || []),
      voice_tone, voice_personality, JSON.stringify(target_audience || {}),
      JSON.stringify(competitors || []), JSON.stringify(colors || {}),
      JSON.stringify(fonts || {}), logo_url, guidelines,
      JSON.stringify(keywords || []), industry, website,
      JSON.stringify(social_links || {}), words_to_use, words_to_avoid
    );

    invalidateCache();
    logActivity('brand-profile', 'create', `Created brand profile: ${brand_name}`, 'Profile');
    res.json({ id: result.lastInsertRowid, brand_name });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create brand profile' });
  }
});

// Update an existing brand profile
router.put('/profile/:id', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM bp_profiles WHERE id = ?').get(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const {
      brand_name, tagline, mission, vision, values, voice_tone, voice_personality,
      target_audience, competitors, colors, fonts, logo_url, guidelines, keywords,
      industry, website, social_links, words_to_use, words_to_avoid
    } = req.body;

    db.prepare(
      `UPDATE bp_profiles SET brand_name = ?, tagline = ?, mission = ?, vision = ?, values = ?,
        voice_tone = ?, voice_personality = ?, target_audience = ?, competitors = ?, colors = ?,
        fonts = ?, logo_url = ?, guidelines = ?, keywords = ?, industry = ?, website = ?,
        social_links = ?, words_to_use = ?, words_to_avoid = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      brand_name || profile.brand_name, tagline || profile.tagline,
      mission || profile.mission, vision || profile.vision,
      values ? JSON.stringify(values) : profile.values,
      voice_tone || profile.voice_tone, voice_personality || profile.voice_personality,
      target_audience ? JSON.stringify(target_audience) : profile.target_audience,
      competitors ? JSON.stringify(competitors) : profile.competitors,
      colors ? JSON.stringify(colors) : profile.colors,
      fonts ? JSON.stringify(fonts) : profile.fonts,
      logo_url || profile.logo_url, guidelines || profile.guidelines,
      keywords ? JSON.stringify(keywords) : profile.keywords,
      industry || profile.industry, website || profile.website,
      social_links ? JSON.stringify(social_links) : profile.social_links,
      words_to_use !== undefined ? words_to_use : profile.words_to_use,
      words_to_avoid !== undefined ? words_to_avoid : profile.words_to_avoid,
      req.params.id
    );

    invalidateCache();
    logActivity('brand-profile', 'update', `Updated brand profile: ${brand_name || profile.brand_name}`, 'Profile');
    res.json({ id: req.params.id, updated: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update brand profile' });
  }
});

module.exports = router;

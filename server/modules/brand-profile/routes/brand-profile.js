const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { getBrandContext, buildBrandSystemPrompt, invalidateCache } = require('../../../services/brandContext');

// Media upload config
const mediaDir = path.join(process.cwd(), 'uploads', 'brand-media');
fs.mkdirSync(mediaDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files (JPG, PNG, GIF, SVG, WebP, ICO) and PDFs are allowed'));
  },
});

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

// ══════════════════════════════════════════════════════
// Media Assets Routes
// ══════════════════════════════════════════════════════

// POST /media - upload media files
router.post('/media', upload.array('files', 20), (req, res) => {
  try {
    const category = req.body.category || 'other';
    const inserted = [];
    for (const file of req.files) {
      const result = db.prepare(
        'INSERT INTO bp_media (filename, original_name, category, mimetype, size) VALUES (?, ?, ?, ?, ?)'
      ).run(file.filename, file.originalname, category, file.mimetype, file.size);
      inserted.push({
        id: result.lastInsertRowid,
        filename: file.filename,
        original_name: file.originalname,
        category,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/brand-media/${file.filename}`,
      });
    }
    logActivity('brand-profile', 'upload', `Uploaded ${inserted.length} media file(s)`, category);
    res.json({ success: true, data: inserted });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /media - list all media
router.get('/media', (req, res) => {
  try {
    const { category } = req.query;
    let rows;
    if (category && category !== 'all') {
      rows = db.prepare('SELECT * FROM bp_media WHERE category = ? ORDER BY created_at DESC').all(category);
    } else {
      rows = db.prepare('SELECT * FROM bp_media ORDER BY created_at DESC').all();
    }
    const data = rows.map(r => ({ ...r, url: `/uploads/brand-media/${r.filename}` }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /media/:id - update media category
router.put('/media/:id', (req, res) => {
  try {
    const { category } = req.body;
    const existing = db.prepare('SELECT * FROM bp_media WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Media not found' });
    db.prepare('UPDATE bp_media SET category = ? WHERE id = ?').run(category, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /media/:id - delete a media file
router.delete('/media/:id', (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM bp_media WHERE id = ?').get(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    const filepath = path.join(mediaDir, media.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    db.prepare('DELETE FROM bp_media WHERE id = ?').run(req.params.id);
    logActivity('brand-profile', 'delete', `Deleted media: ${media.original_name}`, media.category);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

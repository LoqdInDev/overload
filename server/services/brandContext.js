const { db } = require('../db/database');

// In-memory cache to avoid repeated DB hits on every generation call
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60000; // 60 seconds

function getBrandContext() {
  const now = Date.now();
  if (_cache !== undefined && _cache !== null && (now - _cacheTime) < CACHE_TTL) return _cache;
  if (_cache === null && (now - _cacheTime) < CACHE_TTL) return null;

  try {
    const profile = db.prepare(
      'SELECT * FROM bp_profiles ORDER BY updated_at DESC LIMIT 1'
    ).get();

    if (!profile || !profile.brand_name) {
      _cache = null;
      _cacheTime = now;
      return null;
    }

    const parse = (val) => {
      if (!val) return null;
      try { return JSON.parse(val); } catch { return val; }
    };

    _cache = {
      brandName: profile.brand_name,
      tagline: profile.tagline,
      mission: profile.mission,
      vision: profile.vision,
      values: parse(profile.values),
      voiceTone: profile.voice_tone,
      voicePersonality: profile.voice_personality,
      targetAudience: parse(profile.target_audience),
      competitors: parse(profile.competitors),
      keywords: parse(profile.keywords),
      industry: profile.industry,
      guidelines: profile.guidelines,
      wordsToUse: profile.words_to_use,
      wordsToAvoid: profile.words_to_avoid,
    };
    _cacheTime = now;
    return _cache;
  } catch (e) {
    console.error('Failed to fetch brand context:', e);
    return null;
  }
}

function buildBrandSystemPrompt(brand) {
  if (!brand) return '';

  const parts = [
    '\n--- BRAND CONTEXT (apply to all generated content) ---',
    brand.brandName && `Brand: ${brand.brandName}`,
    brand.tagline && `Tagline: ${brand.tagline}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.mission && `Mission: ${brand.mission}`,
    brand.voiceTone && `Voice Tone: ${brand.voiceTone}`,
    brand.voicePersonality && `Voice Personality: ${brand.voicePersonality}`,
    brand.guidelines && `Writing Guidelines: ${brand.guidelines}`,
    brand.targetAudience && `Target Audience: ${
      typeof brand.targetAudience === 'string'
        ? brand.targetAudience
        : JSON.stringify(brand.targetAudience)
    }`,
    brand.values && Array.isArray(brand.values) && brand.values.length > 0
      && `Brand Values: ${brand.values.join(', ')}`,
    brand.keywords && Array.isArray(brand.keywords) && brand.keywords.length > 0
      && `Key Terms to Use: ${brand.keywords.join(', ')}`,
    brand.wordsToUse && `Words to Use: ${brand.wordsToUse}`,
    brand.wordsToAvoid && `Words to Avoid: ${brand.wordsToAvoid}`,
    brand.competitors && Array.isArray(brand.competitors) && brand.competitors.length > 0
      && `Key Competitors (differentiate from): ${brand.competitors.join(', ')}`,
    '--- END BRAND CONTEXT ---',
  ];

  return parts.filter(Boolean).join('\n');
}

function invalidateCache() {
  _cache = null;
  _cacheTime = 0;
}

module.exports = { getBrandContext, buildBrandSystemPrompt, invalidateCache };

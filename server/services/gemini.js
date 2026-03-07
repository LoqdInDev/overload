const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Resolve uploads directory (volume-aware for Railway)
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '..', '..');
const uploadsDir = path.join(dataDir, 'uploads', 'creatives');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Map dimension strings like "1080x1920" to Gemini aspect ratio strings
function dimensionToAspectRatio(dimension) {
  const MAP = {
    '1080x1080': '1:1',
    '1500x1500': '1:1',
    '2000x2000': '1:1',
    '1080x1350': '4:5',
    '800x1000':  '4:5',
    '1200x628':  '16:9',
    '1200x630':  '16:9',
    '1920x600':  '16:9',
    '1500x500':  '4:1',
    '1080x1920': '9:16',
    '728x90':    '16:9',
    '300x250':   '4:3',
    '160x600':   '9:16',
  };
  return MAP[dimension] || '1:1';
}

// Build a strong dimension instruction prefix for the image prompt text
// Gemini Flash's generateContent API does not accept aspectRatio in generationConfig,
// so we must convey the ratio via text instruction.
function buildDimensionInstruction(aspectRatio) {
  const DESCRIPTIONS = {
    '1:1':  'STRICT REQUIREMENT: Generate a perfectly SQUARE image (1:1 aspect ratio, equal width and height). Do NOT generate a wide or landscape image.',
    '4:5':  'STRICT REQUIREMENT: Generate a PORTRAIT image (4:5 aspect ratio, slightly taller than wide, like a mobile phone screen).',
    '9:16': 'STRICT REQUIREMENT: Generate a TALL VERTICAL image (9:16 aspect ratio, much taller than wide, full phone screen story/reel format).',
    '16:9': 'STRICT REQUIREMENT: Generate a WIDE LANDSCAPE image (16:9 aspect ratio, much wider than tall, like a widescreen banner).',
    '4:3':  'STRICT REQUIREMENT: Generate a LANDSCAPE image (4:3 aspect ratio, wider than tall).',
    '3:4':  'STRICT REQUIREMENT: Generate a PORTRAIT image (3:4 aspect ratio, taller than wide).',
    '4:1':  'STRICT REQUIREMENT: Generate an ULTRA-WIDE BANNER image (4:1 aspect ratio, very wide and short).',
  };
  return DESCRIPTIONS[aspectRatio] || '';
}

/**
 * Generate a single image using Gemini's image generation API.
 * Returns { url, dataUrl, mimeType } — dataUrl is a base64 data URL for immediate display.
 */
async function generateImage(prompt, aspectRatio = '1:1') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const dimensionInstruction = buildDimensionInstruction(aspectRatio);
  const fullPrompt = dimensionInstruction ? `${dimensionInstruction}\n\n${prompt}` : prompt;

  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini API error ${res.status}`;
    console.error('[gemini] API error:', res.status, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);

  if (!imagePart) {
    // Log what we actually got back so we can debug
    const textPart = parts.find(p => p.text);
    console.error('[gemini] No inlineData in response. Parts:', JSON.stringify(parts.map(p => ({ hasInlineData: !!p.inlineData, hasText: !!p.text, textPreview: p.text?.slice(0, 100) }))));
    if (textPart) {
      throw new Error(`Gemini returned text instead of image: ${textPart.text?.slice(0, 120)}`);
    }
    throw new Error('No image returned from Gemini — check model name and API key permissions');
  }

  const { data: base64, mimeType } = imagePart.inlineData;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));

  console.log(`[gemini] Saved image: ${filename} (${mimeType}, ${aspectRatio})`);

  return {
    url: `/uploads/creatives/${filename}`,
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
  };
}

/**
 * Generate multiple images in parallel.
 * @param {string[]} prompts - Array of image prompts
 * @param {string} [aspectRatio] - Gemini aspect ratio string e.g. '1:1', '9:16'
 * @param {string} [dimension] - Raw dimension string like '1080x1080' (converted automatically)
 */
async function generateImages(prompts, { aspectRatio, dimension } = {}) {
  const ratio = aspectRatio || (dimension ? dimensionToAspectRatio(dimension) : '1:1');

  const results = await Promise.allSettled(
    prompts.map(async (prompt) => {
      const result = await generateImage(prompt, ratio);
      return { ...result, prompt };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.error(`[gemini] Image ${i + 1}/${prompts.length} failed:`, r.reason?.message);
    return { url: null, mimeType: null, prompt: prompts[i], error: r.reason?.message };
  });
}

/**
 * Generate an image variation based on a reference image + text instruction.
 * @param {string} promptText - Variation instruction / description
 * @param {string} referenceBase64 - Base64-encoded reference image (no data URL prefix)
 * @param {string} referenceMimeType - e.g. 'image/jpeg' or 'image/png'
 * @param {string} [aspectRatio] - Gemini aspect ratio e.g. '1:1'
 */
async function generateImageFromReference(promptText, referenceImages, aspectRatio = '1:1') {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  // Accept either a single {base64,mimeType} object or an array
  const images = Array.isArray(referenceImages) ? referenceImages : [{ base64: referenceImages, mimeType: arguments[2] }];
  // If called with old signature (promptText, base64string, mimeType, ratio) detect and normalise
  const isLegacy = typeof referenceImages === 'string';
  const imgs = isLegacy
    ? [{ base64: referenceImages, mimeType: aspectRatio }]
    : images;
  const ratio = isLegacy ? (arguments[3] || '1:1') : (aspectRatio || '1:1');

  const dimensionInstruction = buildDimensionInstruction(ratio);
  const fullPromptText = dimensionInstruction ? `${dimensionInstruction}\n\n${promptText}` : promptText;

  const body = {
    contents: [{
      parts: [
        ...imgs.map(img => ({ inlineData: { data: img.base64, mimeType: img.mimeType } })),
        { text: fullPromptText },
      ],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini API error ${res.status}`;
    console.error('[gemini] API error (reference):', res.status, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);

  if (!imagePart) {
    const textPart = parts.find(p => p.text);
    if (textPart) throw new Error(`Gemini returned text instead of image: ${textPart.text?.slice(0, 120)}`);
    throw new Error('No image returned from Gemini for reference variation');
  }

  const { data: base64, mimeType } = imagePart.inlineData;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
  console.log(`[gemini] Saved variation image: ${filename} (${mimeType})`);

  return {
    url: `/uploads/creatives/${filename}`,
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
  };
}

module.exports = { generateImage, generateImages, generateImageFromReference, dimensionToAspectRatio };

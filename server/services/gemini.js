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
    // Square
    '1080x1080': '1:1',
    '1500x1500': '1:1',
    '2000x2000': '1:1',
    // Portrait 4:5
    '1080x1350': '4:5',
    '800x1000':  '4:5',
    '864x1080':  '4:5',
    // Portrait 2:3
    '1000x1500': '3:4',
    // Tall portrait 9:16
    '1080x1920': '9:16',
    '160x600':   '9:16',
    // Landscape 16:9
    '1280x720':  '16:9',
    '1600x900':  '16:9',
    '1200x628':  '16:9',
    '1200x627':  '16:9',
    '1200x630':  '16:9',
    '1080x608':  '16:9',
    '970x600':   '16:9',
    // Landscape 4:3
    '300x250':   '4:3',
    // Ultra-wide / banner
    '1920x600':  '4:1',
    '1500x500':  '4:1',
    '1584x396':  '4:1',
    '1440x400':  '4:1',
    '970x250':   '4:1',
    '600x200':   '4:1',
    '728x90':    '4:1',
    '320x50':    '4:1',
  };
  return MAP[dimension] || '1:1';
}

// Build a strong dimension instruction prefix for the image prompt text
// Gemini Flash's generateContent API does not accept aspectRatio in generationConfig,
// so we must convey the ratio via text instruction.
function buildDimensionInstruction(aspectRatio) {
  const DESCRIPTIONS = {
    '1:1':  'CRITICAL OUTPUT REQUIREMENT — aspect ratio 1:1 (SQUARE). The canvas must be perfectly square with equal width and height. Do NOT produce a landscape or portrait image.',
    '4:5':  'CRITICAL OUTPUT REQUIREMENT — aspect ratio 4:5 (PORTRAIT). The canvas must be taller than wide (width × 1.25 = height), like an Instagram feed portrait post. Do NOT produce a square or landscape image.',
    '3:4':  'CRITICAL OUTPUT REQUIREMENT — aspect ratio 3:4 (PORTRAIT). The canvas must be taller than wide (width × 1.33 = height), like a Pinterest pin. Do NOT produce a square or landscape image.',
    '9:16': 'CRITICAL OUTPUT REQUIREMENT — aspect ratio 9:16 (TALL VERTICAL). The canvas must be much taller than wide, like a smartphone screen story or reel. Do NOT produce a square or landscape image.',
    '16:9': 'CRITICAL OUTPUT REQUIREMENT — aspect ratio 16:9 (WIDESCREEN LANDSCAPE). The canvas must be much wider than tall, like a YouTube thumbnail or widescreen video frame. Width is approximately 1.78× the height. Do NOT produce a square or portrait image.',
    '4:3':  'CRITICAL OUTPUT REQUIREMENT — aspect ratio 4:3 (LANDSCAPE). The canvas must be wider than tall (width × 0.75 = height). Do NOT produce a square or portrait image.',
    '4:1':  'CRITICAL OUTPUT REQUIREMENT — aspect ratio 4:1 (ULTRA-WIDE BANNER). The canvas must be extremely wide and very short, like a horizontal website banner or leaderboard ad. Width is 4× the height. Do NOT produce a square or portrait image.',
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

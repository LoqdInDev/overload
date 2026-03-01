const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Resolve uploads directory (volume-aware for Railway)
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '..', '..');
const uploadsDir = path.join(dataDir, 'uploads', 'creatives');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * Generate an image using Gemini's image generation API.
 * Returns { url, mimeType } where url is a relative path for static serving.
 */
async function generateImage(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);

  if (!imagePart) {
    throw new Error('No image returned from Gemini');
  }

  const { data: base64, mimeType } = imagePart.inlineData;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));

  return {
    url: `/uploads/creatives/${filename}`,
    mimeType,
  };
}

/**
 * Generate multiple images in parallel.
 * Returns array of { url, mimeType, prompt, error? }
 */
async function generateImages(prompts) {
  const results = await Promise.allSettled(
    prompts.map(async (prompt) => {
      const result = await generateImage(prompt);
      return { ...result, prompt };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { url: null, mimeType: null, prompt: prompts[i], error: r.reason?.message };
  });
}

module.exports = { generateImage, generateImages };

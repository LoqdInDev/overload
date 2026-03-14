/**
 * Pollinations.ai — Free fallback image generation
 *
 * Uses the Pollinations open-source API (no key required).
 * Intended as a fallback when Gemini is unavailable or fails.
 *
 * API: GET https://image.pollinations.ai/prompt/{prompt}?width=W&height=H&model=flux&nologo=true&enhance=true
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

// Resolve uploads directory (volume-aware for Railway)
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '..', '..');
const uploadsDir = path.join(dataDir, 'uploads', 'creatives');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const BASE_URL = 'https://image.pollinations.ai/prompt';

// Map aspect ratio strings to pixel dimensions
function aspectRatioToSize(aspectRatio) {
  const MAP = {
    '1:1':  { width: 1024, height: 1024 },
    '4:5':  { width: 1024, height: 1280 },
    '3:4':  { width: 1024, height: 1365 },
    '9:16': { width: 768,  height: 1365 },
    '16:9': { width: 1365, height: 768 },
    '4:3':  { width: 1365, height: 1024 },
    '4:1':  { width: 1536, height: 384 },
  };
  return MAP[aspectRatio] || MAP['1:1'];
}

/**
 * Generate a single image using Pollinations.
 * Returns { url, dataUrl, mimeType, provider } — same shape as gemini.generateImage
 */
async function generateImagePollinations(prompt, aspectRatio = '1:1') {
  const { width, height } = aspectRatioToSize(aspectRatio);
  const seed = Math.floor(Math.random() * 2147483647);

  const encodedPrompt = encodeURIComponent(prompt);
  const apiUrl = `${BASE_URL}/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&enhance=true&seed=${seed}`;

  console.log(`[pollinations] Generating image (${width}x${height}, ${aspectRatio})...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  let res;
  try {
    res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Pollinations image generation timed out');
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Pollinations API error ${res.status}: ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // Compress to JPEG same as Gemini pipeline
  const filename = `${crypto.randomUUID()}.jpg`;
  const filepath = path.join(uploadsDir, filename);
  const compressed = await sharp(buffer).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  fs.writeFileSync(filepath, compressed);

  const compressedBase64 = compressed.toString('base64');
  const savedMime = 'image/jpeg';

  console.log(`[pollinations] Saved image: ${filename} (${(buffer.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB, ${aspectRatio})`);

  return {
    url: `/uploads/creatives/${filename}`,
    dataUrl: `data:${savedMime};base64,${compressedBase64}`,
    mimeType: savedMime,
    provider: 'pollinations',
  };
}

/**
 * Generate multiple images in parallel via Pollinations.
 */
async function generateImagesPollinations(prompts, { aspectRatio, dimension } = {}) {
  const { dimensionToAspectRatio } = require('./gemini');
  const ratio = aspectRatio || (dimension ? dimensionToAspectRatio(dimension) : '1:1');
  const CONCURRENCY = 3;
  const results = new Array(prompts.length);

  for (let i = 0; i < prompts.length; i += CONCURRENCY) {
    const batch = prompts.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (prompt) => {
        const result = await generateImagePollinations(prompt, ratio);
        return { ...result, prompt };
      })
    );
    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      const idx = i + j;
      if (r.status === 'fulfilled') {
        results[idx] = r.value;
      } else {
        console.error(`[pollinations] Image ${idx + 1}/${prompts.length} failed:`, r.reason?.message);
        results[idx] = { url: null, mimeType: null, prompt: prompts[idx], error: r.reason?.message, provider: 'pollinations' };
      }
    }
    if (i + CONCURRENCY < prompts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

module.exports = { generateImagePollinations, generateImagesPollinations, aspectRatioToSize };

const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { generateImages, generateImage, generateImageFromReference, dimensionToAspectRatio } = require('../../../services/gemini');
const { db, logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildImagePromptOptimizer } = require('../prompts/imagePrompt');

const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '..', '..', '..', '..');

const router = express.Router();

// Test Gemini connection — dev/debug only
router.get('/test-gemini', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const { generateImage } = require('../../../services/gemini');
  try {
    const result = await generateImage('A simple red circle on a white background');
    res.json({ success: true, url: result.url, mimeType: result.mimeType });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate creative — creates optimized prompts via Claude, then generates images via Gemini
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt, style, palette, paletteColors, useBrand, noText } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'type and prompt are required' });
  }

  // Extract dimension and quantity prefixes from prompt if present
  // Format: "[Dimensions: 1080x1920] [Quantity: 4] actual prompt..."
  let cleanPrompt = prompt;
  let dimension = null;
  let quantity = 3;

  const dimMatch = prompt.match(/\[Dimensions:\s*([^\]]+)\]/i);
  const qtyMatch = prompt.match(/\[Quantity:\s*(\d+)\]/i);
  if (dimMatch) {
    dimension = dimMatch[1].trim();
    cleanPrompt = cleanPrompt.replace(dimMatch[0], '').trim();
  }
  if (qtyMatch) {
    quantity = Math.min(Math.max(parseInt(qtyMatch[1], 10) || 3, 1), 8);
    cleanPrompt = cleanPrompt.replace(qtyMatch[0], '').trim();
  }

  try {
    // Step 1: Use Claude to optimize and create prompt variations
    const optimizerPrompt = buildImagePromptOptimizer(type, cleanPrompt, quantity, { style, palette, paletteColors, workspaceId: wsId, useBrand, noText });
    const { parsed } = await generateWithClaude(optimizerPrompt, { temperature: 0.8 });

    const projectId = uuid();
    const title = cleanPrompt.slice(0, 100);
    await q.createProject(projectId, type, title, cleanPrompt, JSON.stringify(parsed));

    const imagePrompts = (parsed.prompts || []).map(p => p.prompt);

    // Step 2: Generate actual images via Gemini
    let generatedImages;
    try {
      generatedImages = await generateImages(imagePrompts, { dimension });
    } catch (genErr) {
      console.error('Image generation failed, returning prompts only:', genErr.message);
      // Fall back to prompt-only mode if Gemini is unavailable
      const images = [];
      for (const p of (parsed.prompts || [])) {
        const imgId = uuid();
        await q.createImage(imgId, projectId, null, p.alt, 'pending', 'prompt_ready', JSON.stringify(p));
        images.push({ id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status: 'prompt_ready', url: null });
      }
      await logActivity('creative', 'generate', `Generated ${type} creative (prompts only)`, title, projectId, wsId);
      return res.json({ projectId, images, prompts: parsed.prompts, warning: genErr.message });
    }

    // Step 3: Save results to database
    const images = [];
    for (let i = 0; i < (parsed.prompts || []).length; i++) {
      const p = parsed.prompts[i];
      const imgId = uuid();
      const genResult = generatedImages[i];
      const url = genResult?.url || null;
      const status = url ? 'completed' : 'failed';
      await q.createImage(imgId, projectId, url, p.alt, 'gemini', status, JSON.stringify({ ...p, error: genResult?.error }));
      images.push({ id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status, url, dataUrl: genResult?.dataUrl || null, error: genResult?.error });
    }

    await logActivity('creative', 'generate', `Generated ${type} creative`, title, projectId, wsId);
    res.json({ projectId, images, prompts: parsed.prompts });
  } catch (err) {
    console.error('Creative generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all projects with nested image arrays
router.get('/projects', async (req, res) => {
  const wsId = req.workspace.id;
  const projects = await db.prepare(
    `SELECT * FROM cd_projects WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 30`
  ).all(wsId);
  const images = await db.prepare(
    `SELECT * FROM cd_images WHERE workspace_id = ? ORDER BY created_at DESC`
  ).all(wsId);
  const imagesByProject = {};
  for (const img of images) {
    if (!imagesByProject[img.project_id]) imagesByProject[img.project_id] = [];
    imagesByProject[img.project_id].push(img);
  }
  const result = projects.map(p => ({
    ...p,
    images: imagesByProject[p.id] || [],
  }));
  res.json({ projects: result });
});

// Create project (with optional image URLs)
router.post('/projects', async (req, res) => {
  const { type, title, prompt, urls, metadata } = req.body;
  const wsId = req.workspace.id;
  const projectId = uuid();
  await db.prepare(
    'INSERT INTO cd_projects (id, workspace_id, type, title, prompt, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(projectId, wsId, type || 'ad-creative', title || 'Untitled', prompt || '', JSON.stringify(metadata || {}));
  if (Array.isArray(urls)) {
    const insertImg = await db.prepare(
      'INSERT INTO cd_images (id, workspace_id, project_id, url, provider, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const url of urls) {
      await insertImg.run(uuid(), wsId, projectId, url, 'gemini', 'completed');
    }
  }
  await logActivity('creative', 'create', `Saved ${type || 'creative'} project`, title || 'Untitled', projectId, wsId);
  res.json({ id: projectId, success: true });
});

// Get project with images
router.get('/projects/:id', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const project = await q.getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const images = await q.getImagesByProject(req.params.id);
  res.json({ ...project, images });
});

// Delete project — also removes image files from disk to free storage
router.delete('/projects/:id', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  // Delete files from disk before removing DB records
  const images = await q.getImagesByProject(req.params.id);
  for (const img of images) {
    if (img.url && img.url.startsWith('/uploads/creatives/')) {
      const filepath = path.join(dataDir, img.url);
      try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch { /* ignore */ }
    }
  }

  await q.deleteProject(req.params.id);
  await logActivity('creative', 'delete', 'Deleted creative project', null, req.params.id, wsId);
  res.json({ success: true });
});

// POST /generate-stream — streams images one-by-one as they complete (fixes timeout)
router.post('/generate-stream', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt, style, palette, paletteColors, useBrand, noText } = req.body;
  if (!type || !prompt) return res.status(400).json({ error: 'type and prompt are required' });

  const sse = setupSSE(res);

  let cleanPrompt = prompt;
  let dimension = null;
  let quantity = 3;
  const dimMatch = prompt.match(/\[Dimensions:\s*([^\]]+)\]/i);
  const qtyMatch = prompt.match(/\[Quantity:\s*(\d+)\]/i);
  if (dimMatch) { dimension = dimMatch[1].trim(); cleanPrompt = cleanPrompt.replace(dimMatch[0], '').trim(); }
  if (qtyMatch) { quantity = Math.min(Math.max(parseInt(qtyMatch[1], 10) || 3, 1), 8); cleanPrompt = cleanPrompt.replace(qtyMatch[0], '').trim(); }

  try {
    const ratio = dimension ? dimensionToAspectRatio(dimension) : '1:1';
    const optimizerPrompt = buildImagePromptOptimizer(type, cleanPrompt, quantity, { style, palette, paletteColors, workspaceId: wsId, useBrand, noText, dimension, aspectRatio: ratio });
    const { parsed } = await generateWithClaude(optimizerPrompt, { temperature: 0.8 });

    const projectId = uuid();
    const title = cleanPrompt.slice(0, 100);
    await q.createProject(projectId, type, title, cleanPrompt, JSON.stringify(parsed));

    // Immediately send prompts so client shows pending cards
    sse.sendChunk(JSON.stringify({ step: 'prompts_ready', projectId, prompts: parsed.prompts || [] }));

    // Append no-text instruction directly to each prompt for Gemini
    const noTextSuffix = noText ? '\n\nNo text, no words, no letters, no logos, no watermarks. Fill the entire canvas with the visual — no empty space or blank areas reserved for text.' : '';

    // Generate images sequentially with retry to avoid Gemini rate limits
    for (let i = 0; i < (parsed.prompts || []).length; i++) {
      const p = parsed.prompts[i];
      const imgId = uuid();
      let gen = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          gen = await generateImage(p.prompt + noTextSuffix, ratio);
          break;
        } catch (err) {
          lastErr = err;
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (gen) {
        await q.createImage(imgId, projectId, gen.url, p.alt, 'gemini', 'completed', JSON.stringify(p));
        sse.sendChunk(JSON.stringify({
          step: 'image', index: i,
          image: { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status: 'completed', url: gen.url, dataUrl: gen.dataUrl },
        }));
      } else {
        await q.createImage(imgId, projectId, null, p.alt, 'gemini', 'failed', JSON.stringify({ ...p, error: lastErr?.message }));
        sse.sendChunk(JSON.stringify({
          step: 'image', index: i,
          image: { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status: 'failed', url: null, error: lastErr?.message },
        }));
      }
    }

    await logActivity('creative', 'generate', `Generated ${type} creative`, title, projectId, wsId);
    sse.sendResult({ step: 'done', projectId });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /regenerate — regenerate a single image from an existing prompt
router.post('/regenerate', async (req, res) => {
  const sse = setupSSE(res);
  const { prompt, dimension } = req.body;
  if (!prompt) return sse.sendError(new Error('prompt is required'));
  try {
    const ratio = dimension ? dimensionToAspectRatio(dimension) : '1:1';
    const gen = await generateImage(prompt, ratio);
    sse.sendResult({ url: gen.url, dataUrl: gen.dataUrl, mimeType: gen.mimeType });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /caption — generate social captions for a creative
router.post('/caption', async (req, res) => {
  const { prompt, alt, type } = req.body;
  if (!prompt && !alt) return res.status(400).json({ error: 'prompt or alt required' });
  const sse = setupSSE(res);
  const captionPrompt = `Generate 3 social media captions for this ${type || 'ad creative'}.

Image description: ${alt || prompt}
Creative prompt: ${prompt || alt}

Write 3 distinct caption variations:
**Instagram** — engaging, 1-2 sentences + 5 relevant hashtags (max 150 chars before hashtags)
**Twitter/X** — punchy, under 200 chars, no hashtags
**LinkedIn** — professional tone, insight-driven, 1-2 sentences

Format each with the platform name bolded. Be specific, compelling, and conversion-focused.`;
  try {
    await generateTextWithClaude(captionPrompt, { onChunk: (chunk) => sse.sendChunk(chunk) });
    sse.sendResult({ done: true });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /generate-from-image-stream — generate variations of an uploaded reference image
router.post('/generate-from-image-stream', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt, imageData, imageMimeType, images: rawImages, style, palette, paletteColors, useBrand, noText, quantity: rawQty, dimension: rawDim } = req.body;

  // Support both legacy single-image and new multi-image format
  const refImages = rawImages?.length
    ? rawImages
    : (imageData && imageMimeType ? [{ base64: imageData, mimeType: imageMimeType }] : null);

  if (!refImages) return res.status(400).json({ error: 'At least one reference image is required' });

  const sse = setupSSE(res);

  const quantity = Math.min(Math.max(parseInt(rawQty, 10) || 3, 1), 8);
  const dimension = rawDim || null;
  const ratio = dimension ? dimensionToAspectRatio(dimension) : '1:1';
  const typeContext = {
    'ad-creative': 'high-converting social media advertisement',
    'product-photo': 'professional product photography',
    'social-graphic': 'eye-catching social media graphic',
    'banner': 'web banner or display advertisement',
  }[type] || 'marketing visual';

  // Build N variation angle descriptions
  const VARIATION_ANGLES = [
    'alternative color treatment — shift to a warmer palette and softer lighting while preserving the core composition',
    'different lighting and atmosphere — dramatic studio lighting with deep shadows and high contrast',
    'fresh composition and framing — reframe the subject from a different angle with a cleaner background',
    'minimal and clean interpretation — strip back visual complexity, increase white space, focus on the hero element',
    'bold and dynamic version — stronger typography treatment, more saturated colors, higher visual energy',
    'lifestyle context — place the subject in an aspirational real-world environment',
    'dark mode / night aesthetic — deep blacks, glowing accents, premium dark background treatment',
    'flat graphic style — geometric shapes, simplified illustration, bold outlines',
  ];

  const styleInstruction = style ? `Visual style: ${style}.` : '';
  const colorInstruction = palette && paletteColors?.length
    ? `Color palette: ${palette} (${paletteColors.join(', ')}).`
    : '';

  const userContext = prompt?.trim() ? `\nAdditional instructions: ${prompt.trim()}` : '';
  const noTextInstruction = noText ? ' No text, no words, no letters, no logos, no watermarks. Fill the entire canvas with the visual — no empty space or blank areas reserved for text.' : '';

  const variations = VARIATION_ANGLES.slice(0, quantity).map((angle, i) => ({
    prompt: `Generate a variation of the reference image for use as a ${typeContext}. Variation approach: ${angle}. ${styleInstruction} ${colorInstruction}${userContext}${noTextInstruction} Keep the core subject recognizable but apply a distinctly different visual treatment.`,
    alt: `Variation ${i + 1} — ${angle.split('—')[0].trim()}`,
    style_notes: angle.split('—')[0].trim(),
  }));

  try {
    const projectId = uuid();
    const title = (prompt?.trim() || 'Image variation').slice(0, 100);
    await q.createProject(projectId, type || 'ad-creative', title, prompt || '', JSON.stringify({ variations: true }));

    sse.sendChunk(JSON.stringify({ step: 'prompts_ready', projectId, prompts: variations }));

    // Generate variations sequentially with retry
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      const imgId = uuid();
      let gen = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          gen = await generateImageFromReference(v.prompt, refImages, ratio);
          break;
        } catch (err) {
          lastErr = err;
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (gen) {
        await q.createImage(imgId, projectId, gen.url, v.alt, 'gemini', 'completed', JSON.stringify(v));
        sse.sendChunk(JSON.stringify({
          step: 'image', index: i,
          image: { id: imgId, prompt: v.prompt, alt: v.alt, style_notes: v.style_notes, status: 'completed', url: gen.url, dataUrl: gen.dataUrl },
        }));
      } else {
        await q.createImage(imgId, projectId, null, v.alt, 'gemini', 'failed', JSON.stringify({ ...v, error: lastErr?.message }));
        sse.sendChunk(JSON.stringify({
          step: 'image', index: i,
          image: { id: imgId, prompt: v.prompt, alt: v.alt, style_notes: v.style_notes, status: 'failed', url: null, error: lastErr?.message },
        }));
      }
    }

    await logActivity('creative', 'generate', `Generated ${type} variations from reference image`, title, projectId, wsId);
    sse.sendResult({ step: 'done', projectId });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /generate-brief — generate a creative brief
router.post('/generate-brief', async (req, res) => {
  const { product, goal, audience, keyMessage, tone, scale, refStyle, brand } = req.body;
  if (!product) return res.status(400).json({ error: 'product required' });

  const sse = setupSSE(res);

  let brandBlock = '';
  if (brand?.name) {
    brandBlock = `\n\nBrand Context (use this to inform the brief):
Brand: ${brand.name}${brand.tagline ? ` — "${brand.tagline}"` : ''}
${brand.mission ? `Mission: ${brand.mission}` : ''}
${brand.voice_tone ? `Voice & Tone: ${brand.voice_tone}` : ''}
${brand.colors?.primary ? `Primary Color: ${brand.colors.primary}${brand.colors.secondary ? `, Secondary: ${brand.colors.secondary}` : ''}` : ''}
${brand.keywords ? `Brand Keywords: ${brand.keywords}` : ''}
${brand.words_to_use ? `Words to Use: ${brand.words_to_use}` : ''}
${brand.words_to_avoid ? `Words to Avoid: ${brand.words_to_avoid}` : ''}`.replace(/\n+/g, '\n').trim();
  }

  const { shotType, productPlacement, modelDirection, platform, referenceImageUrl, referenceImageBase64, referenceImageMediaType } = req.body;

  // Load reference image as base64 — try local disk first, fall back to HTTP fetch from own server
  let briefImages = [];
  if (referenceImageBase64 && referenceImageMediaType) {
    briefImages.push({ base64: referenceImageBase64, mediaType: referenceImageMediaType });
  } else if (referenceImageUrl) {
    if (referenceImageUrl.startsWith('/uploads/')) {
      const imgPath = path.join(dataDir, referenceImageUrl);
      const ext = path.extname(imgPath).toLowerCase();
      const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
      let loaded = false;
      // Try local file first
      try {
        if (fs.existsSync(imgPath)) {
          const imgBuf = fs.readFileSync(imgPath);
          briefImages.push({ base64: imgBuf.toString('base64'), mediaType: mimeMap[ext] || 'image/jpeg' });
          loaded = true;
        }
      } catch {}
      // Fall back: fetch from own server via HTTP (handles production/Railway where files are on a volume)
      if (!loaded) {
        try {
          const proto = req.protocol || 'http';
          const host = req.get('host');
          const fetchUrl = `${proto}://${host}${referenceImageUrl}`;
          const imgRes = await fetch(fetchUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            briefImages.push({ base64: buf.toString('base64'), mediaType: imgRes.headers.get('content-type') || mimeMap[ext] || 'image/jpeg' });
          }
        } catch (err) {
          console.error('[brief] Failed to fetch reference image via HTTP:', err.message);
        }
      }
    } else if (referenceImageUrl.startsWith('http')) {
      // External URL — try to download and convert to base64 for Claude
      try {
        const imgRes = await fetch(referenceImageUrl);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const ct = imgRes.headers.get('content-type') || 'image/jpeg';
          briefImages.push({ base64: buf.toString('base64'), mediaType: ct });
        }
      } catch (err) {
        console.error('[brief] Failed to fetch external reference image:', err.message);
      }
    }
  }
  const hasRefImage = briefImages.length > 0;

  const imageBlock = hasRefImage ? `
REFERENCE IMAGE ATTACHED — THIS IS THE MOST IMPORTANT INPUT.
First, carefully study the attached image. Identify:
1. The EXACT product shown (what it is, its material, color, size, distinguishing features)
2. The setting, lighting, composition, and mood
3. The model's pose, styling, and how the product is being worn/displayed

Your entire brief MUST be built around THIS SPECIFIC PRODUCT as seen in the image. Do not generalize — describe the actual item you see. Every shot suggestion must feature this exact product.
` : '';

  const prompt = `You are a senior creative director specializing in product photography and lifestyle campaigns.
${imageBlock}
Product: ${product}
Goal: ${goal || 'Brand Awareness'}
Target Audience: ${audience || 'General consumers'}
${keyMessage ? `Key Message: ${keyMessage}` : ''}
${tone ? `Tone of Voice: ${tone}` : ''}
${scale ? `Campaign Scale: ${scale}` : ''}
${refStyle ? `Reference Style: ${refStyle}` : ''}
${shotType ? `Shot Type: ${shotType}` : ''}
${productPlacement ? `Product Placement: ${productPlacement}` : ''}
${modelDirection ? `Model Direction: ${modelDirection}` : ''}
${platform ? `Target Platform: ${platform}` : ''}${brandBlock}

Generate a detailed creative brief with these sections:
${hasRefImage ? `## Product Analysis
(describe the EXACT product you see in the reference image — material, color, design details, how it looks when worn)\n` : ''}
## Visual Direction
(specific visual style, mood, composition — describe the exact scene, camera angle, and feel${hasRefImage ? '. Build on what works in the reference image' : ''})

## Model & Styling Direction
(how the model should pose, what they're wearing, how the product is featured — be specific about body language, expression, and product visibility)

## Color Palette
(3-5 specific colors with hex codes and rationale${brand?.colors?.primary ? ` — incorporate brand color ${brand.colors.primary}` : ''}${hasRefImage ? '. Pull colors from the reference image where appropriate' : ''})

## Typography
(recommended fonts and hierarchy)

## Messaging Hierarchy
(primary message, secondary, CTA)

## Shot List
(3-5 specific shot descriptions that would make a cohesive campaign — describe each shot in detail including pose, angle, lighting, and product placement${hasRefImage ? '. Each shot must feature the exact product from the reference image' : ''})

## Do's and Don'ts
(specific creative guidelines${hasRefImage ? '. Include what the reference image gets right and what to improve' : ''})

## Reference Aesthetic
(describe the visual world — be specific and evocative, reference real-world campaigns or visual styles)

Be specific, actionable, and inspiring. Focus on creating shots that feel authentic and aspirational — think lifestyle editorial, not stock photography.`;

  try {
    await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      images: briefImages.length > 0 ? briefImages : undefined,
    });
    sse.sendResult({ done: true });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

const express = require('express');
const { v4: uuid } = require('uuid');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { generateImages, generateImage, generateImageFromReference, dimensionToAspectRatio } = require('../../../services/gemini');
const { db, logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildImagePromptOptimizer } = require('../prompts/imagePrompt');

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
  const { type, prompt, style, palette, paletteColors, useBrand } = req.body;

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
    const optimizerPrompt = buildImagePromptOptimizer(type, cleanPrompt, quantity, { style, palette, paletteColors, workspaceId: wsId, useBrand });
    const { parsed } = await generateWithClaude(optimizerPrompt, { temperature: 0.8 });

    const projectId = uuid();
    const title = cleanPrompt.slice(0, 100);
    q.createProject(projectId, type, title, cleanPrompt, JSON.stringify(parsed));

    const imagePrompts = (parsed.prompts || []).map(p => p.prompt);

    // Step 2: Generate actual images via Gemini
    let generatedImages;
    try {
      generatedImages = await generateImages(imagePrompts, { dimension });
    } catch (genErr) {
      console.error('Image generation failed, returning prompts only:', genErr.message);
      // Fall back to prompt-only mode if Gemini is unavailable
      const images = (parsed.prompts || []).map((p) => {
        const imgId = uuid();
        q.createImage(imgId, projectId, null, p.alt, 'pending', 'prompt_ready', JSON.stringify(p));
        return { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status: 'prompt_ready', url: null };
      });
      logActivity('creative', 'generate', `Generated ${type} creative (prompts only)`, title, projectId, wsId);
      return res.json({ projectId, images, prompts: parsed.prompts, warning: genErr.message });
    }

    // Step 3: Save results to database
    const images = (parsed.prompts || []).map((p, i) => {
      const imgId = uuid();
      const genResult = generatedImages[i];
      const url = genResult?.url || null;
      const status = url ? 'completed' : 'failed';
      q.createImage(imgId, projectId, url, p.alt, 'gemini', status, JSON.stringify({ ...p, error: genResult?.error }));
      return { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status, url, dataUrl: genResult?.dataUrl || null, error: genResult?.error };
    });

    logActivity('creative', 'generate', `Generated ${type} creative`, title, projectId, wsId);
    res.json({ projectId, images, prompts: parsed.prompts });
  } catch (err) {
    console.error('Creative generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all projects (with image URLs joined)
router.get('/projects', (req, res) => {
  const wsId = req.workspace.id;
  const projects = db.prepare(
    `SELECT p.*, GROUP_CONCAT(i.url) as image_urls FROM cd_projects p
     LEFT JOIN cd_images i ON i.project_id = p.id AND i.workspace_id = p.workspace_id
     WHERE p.workspace_id = ? GROUP BY p.id ORDER BY p.created_at DESC LIMIT 30`
  ).all(wsId);
  res.json(projects);
});

// Create project (with optional image URLs)
router.post('/projects', (req, res) => {
  const { type, title, prompt, urls, metadata } = req.body;
  const wsId = req.workspace.id;
  const projectId = uuid();
  db.prepare(
    'INSERT INTO cd_projects (id, workspace_id, type, title, prompt, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(projectId, wsId, type || 'ad-creative', title || 'Untitled', prompt || '', JSON.stringify(metadata || {}));
  if (Array.isArray(urls)) {
    const insertImg = db.prepare(
      'INSERT INTO cd_images (id, workspace_id, project_id, url, provider, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    urls.forEach(url => insertImg.run(uuid(), wsId, projectId, url, 'gemini', 'completed'));
  }
  logActivity('creative', 'create', `Saved ${type || 'creative'} project`, title || 'Untitled', projectId, wsId);
  res.json({ id: projectId, success: true });
});

// Get project with images
router.get('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const project = q.getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const images = q.getImagesByProject(req.params.id);
  res.json({ ...project, images });
});

// Delete project
router.delete('/projects/:id', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  q.deleteProject(req.params.id);
  logActivity('creative', 'delete', 'Deleted creative project', null, req.params.id, wsId);
  res.json({ success: true });
});

// POST /generate-stream — streams images one-by-one as they complete (fixes timeout)
router.post('/generate-stream', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt, style, palette, paletteColors, useBrand } = req.body;
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
    const optimizerPrompt = buildImagePromptOptimizer(type, cleanPrompt, quantity, { style, palette, paletteColors, workspaceId: wsId, useBrand, dimension, aspectRatio: ratio });
    const { parsed } = await generateWithClaude(optimizerPrompt, { temperature: 0.8 });

    const projectId = uuid();
    const title = cleanPrompt.slice(0, 100);
    q.createProject(projectId, type, title, cleanPrompt, JSON.stringify(parsed));

    // Immediately send prompts so client shows pending cards
    sse.sendChunk(JSON.stringify({ step: 'prompts_ready', projectId, prompts: parsed.prompts || [] }));

    // Generate all images in parallel — stream each result as it completes
    await Promise.allSettled(
      (parsed.prompts || []).map(async (p, i) => {
        const imgId = uuid();
        try {
          const gen = await generateImage(p.prompt, ratio);
          q.createImage(imgId, projectId, gen.url, p.alt, 'gemini', 'completed', JSON.stringify(p));
          sse.sendChunk(JSON.stringify({
            step: 'image', index: i,
            image: { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status: 'completed', url: gen.url, dataUrl: gen.dataUrl },
          }));
        } catch (err) {
          q.createImage(imgId, projectId, null, p.alt, 'gemini', 'failed', JSON.stringify({ ...p, error: err.message }));
          sse.sendChunk(JSON.stringify({
            step: 'image', index: i,
            image: { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status: 'failed', url: null, error: err.message },
          }));
        }
      })
    );

    logActivity('creative', 'generate', `Generated ${type} creative`, title, projectId, wsId);
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
  const { type, prompt, imageData, imageMimeType, style, palette, paletteColors, useBrand, quantity: rawQty, dimension: rawDim } = req.body;

  if (!imageData || !imageMimeType) return res.status(400).json({ error: 'imageData and imageMimeType are required' });

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

  const variations = VARIATION_ANGLES.slice(0, quantity).map((angle, i) => ({
    prompt: `Generate a variation of the reference image for use as a ${typeContext}. Variation approach: ${angle}. ${styleInstruction} ${colorInstruction}${userContext} Keep the core subject recognizable but apply a distinctly different visual treatment.`,
    alt: `Variation ${i + 1} — ${angle.split('—')[0].trim()}`,
    style_notes: angle.split('—')[0].trim(),
  }));

  try {
    const projectId = uuid();
    const title = (prompt?.trim() || 'Image variation').slice(0, 100);
    q.createProject(projectId, type || 'ad-creative', title, prompt || '', JSON.stringify({ variations: true }));

    sse.sendChunk(JSON.stringify({ step: 'prompts_ready', projectId, prompts: variations }));

    await Promise.allSettled(
      variations.map(async (v, i) => {
        const imgId = uuid();
        try {
          const gen = await generateImageFromReference(v.prompt, imageData, imageMimeType, ratio);
          q.createImage(imgId, projectId, gen.url, v.alt, 'gemini', 'completed', JSON.stringify(v));
          sse.sendChunk(JSON.stringify({
            step: 'image', index: i,
            image: { id: imgId, prompt: v.prompt, alt: v.alt, style_notes: v.style_notes, status: 'completed', url: gen.url, dataUrl: gen.dataUrl },
          }));
        } catch (err) {
          q.createImage(imgId, projectId, null, v.alt, 'gemini', 'failed', JSON.stringify({ ...v, error: err.message }));
          sse.sendChunk(JSON.stringify({
            step: 'image', index: i,
            image: { id: imgId, prompt: v.prompt, alt: v.alt, style_notes: v.style_notes, status: 'failed', url: null, error: err.message },
          }));
        }
      })
    );

    logActivity('creative', 'generate', `Generated ${type} variations from reference image`, title, projectId, wsId);
    sse.sendResult({ step: 'done', projectId });
  } catch (err) {
    sse.sendError(err);
  }
});

// POST /generate-brief — generate a creative brief
router.post('/generate-brief', async (req, res) => {
  const { product, goal, audience, brand } = req.body;
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

  const prompt = `You are a senior creative director. Generate a detailed creative brief for:

Product: ${product}
Goal: ${goal || 'Brand Awareness'}
Target Audience: ${audience || 'General consumers'}${brandBlock}

Create a comprehensive creative brief with these sections:
## Visual Direction
(specific visual style, mood, composition)

## Color Palette
(3-5 specific colors with hex codes and rationale${brand?.colors?.primary ? ` — incorporate brand color ${brand.colors.primary}` : ''})

## Typography
(recommended fonts and hierarchy)

## Messaging Hierarchy
(primary message, secondary, CTA)

## Do's and Don'ts
(specific creative guidelines)

## Reference Aesthetic
(describe the visual world — be specific and evocative)

Be specific, actionable, and inspiring.`;

  try {
    await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    sse.sendResult({ done: true });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

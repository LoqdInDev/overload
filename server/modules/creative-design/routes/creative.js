const express = require('express');
const { v4: uuid } = require('uuid');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { generateImages } = require('../../../services/gemini');
const { db, logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildImagePromptOptimizer } = require('../prompts/imagePrompt');

const router = express.Router();

// Generate creative — creates optimized prompts via Claude, then generates images via Gemini
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt } = req.body;

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
    const optimizerPrompt = buildImagePromptOptimizer(type, cleanPrompt, quantity);
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
      return { id: imgId, prompt: p.prompt, alt: p.alt, style_notes: p.style_notes, status, url, error: genResult?.error };
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

// POST /generate-brief — generate a creative brief
router.post('/generate-brief', async (req, res) => {
  const { product, goal, audience } = req.body;
  if (!product) return res.status(400).json({ error: 'product required' });

  const sse = setupSSE(res);
  const prompt = `You are a senior creative director. Generate a detailed creative brief for:

Product: ${product}
Goal: ${goal || 'Brand Awareness'}
Target Audience: ${audience || 'General consumers'}

Create a comprehensive creative brief with these sections:
## Visual Direction
(specific visual style, mood, composition)

## Color Palette
(3-5 specific colors with hex codes and rationale)

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

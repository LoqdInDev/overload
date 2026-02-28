const express = require('express');
const { v4: uuid } = require('uuid');
const { generateWithClaude } = require('../../../services/claude');
const { logActivity } = require('../../../db/database');
const { getQueries } = require('../db/queries');
const { buildImagePromptOptimizer } = require('../prompts/imagePrompt');

const router = express.Router();

// Generate creative — returns optimized prompts (and images if provider available)
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const { type, prompt } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'type and prompt are required' });
  }

  try {
    const optimizerPrompt = buildImagePromptOptimizer(type, prompt);
    const { parsed } = await generateWithClaude(optimizerPrompt, { temperature: 0.8 });

    const projectId = uuid();
    const title = prompt.slice(0, 100);
    q.createProject(projectId, type, title, prompt, JSON.stringify(parsed));

    // Store generated prompt variations as image entries (pending generation)
    const images = (parsed.prompts || []).map((p) => {
      const imgId = uuid();
      q.createImage(imgId, projectId, null, p.alt, 'pending', 'prompt_ready', JSON.stringify(p));
      return {
        id: imgId,
        prompt: p.prompt,
        alt: p.alt,
        style_notes: p.style_notes,
        status: 'prompt_ready',
        url: null,
      };
    });

    logActivity('creative', 'generate', `Generated ${type} creative`, title, projectId, wsId);

    res.json({ projectId, images, prompts: parsed.prompts });
  } catch (err) {
    console.error('Creative generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all projects
router.get('/projects', (req, res) => {
  const wsId = req.workspace.id;
  const q = getQueries(wsId);
  const projects = q.getAllProjects();
  res.json(projects);
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

module.exports = router;

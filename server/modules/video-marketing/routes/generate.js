const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { generateWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { getQueries } = require('../db/queries');
const { logActivity } = require('../../../db/database');
const { buildAnglePrompt } = require('../prompts/angleGenerator');
const { buildScriptPrompt } = require('../prompts/scriptWriter');
const { buildHookPrompt } = require('../prompts/hookFactory');
const { buildStoryboardPrompt } = require('../prompts/storyboarder');
const { buildUGCPrompt } = require('../prompts/ugcBrief');
const { buildIteratePrompt } = require('../prompts/iterateWinner');

router.post('/angles', async (req, res) => {
  const { campaignId, productProfile } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const prompt = buildAnglePrompt(productProfile);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    const genId = uuidv4();
    q.createGeneration(genId, campaignId, 'angles', JSON.stringify(parsed), raw);
    logActivity('video-marketing', 'generate', 'Generated ad angles', `${parsed.length} angles`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('Angle generation error:', error);
    sse.sendError(error);
  }
});

router.post('/scripts', async (req, res) => {
  const { campaignId, productProfile, selectedAngles, duration = 30, platform = 'tiktok' } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const scripts = [];
    for (const angle of selectedAngles) {
      const prompt = buildScriptPrompt(productProfile, angle, { duration, platform });
      const { parsed, raw } = await generateWithClaude(prompt, {
        onChunk: (text) => sse.sendChunk(text),
      });
      scripts.push(parsed);
    }

    const genId = uuidv4();
    q.createGeneration(genId, campaignId, 'scripts', JSON.stringify(scripts), JSON.stringify(scripts));
    logActivity('video-marketing', 'generate', 'Generated scripts', `${scripts.length} scripts`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: scripts });
  } catch (error) {
    console.error('Script generation error:', error);
    sse.sendError(error);
  }
});

router.post('/hooks', async (req, res) => {
  const { campaignId, productProfile } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const prompt = buildHookPrompt(productProfile);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    const genId = uuidv4();
    q.createGeneration(genId, campaignId, 'hooks', JSON.stringify(parsed), raw);
    logActivity('video-marketing', 'generate', 'Generated hooks', `${parsed.length} hooks`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('Hook generation error:', error);
    sse.sendError(error);
  }
});

router.post('/storyboard', async (req, res) => {
  const { campaignId, scripts } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const storyboards = [];
    for (const script of scripts) {
      const prompt = buildStoryboardPrompt(script);
      const { parsed, raw } = await generateWithClaude(prompt, {
        onChunk: (text) => sse.sendChunk(text),
      });
      storyboards.push(parsed);
    }

    const genId = uuidv4();
    q.createGeneration(genId, campaignId, 'storyboard', JSON.stringify(storyboards), JSON.stringify(storyboards));
    logActivity('video-marketing', 'generate', 'Generated storyboards', `${storyboards.length} storyboards`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: storyboards });
  } catch (error) {
    console.error('Storyboard generation error:', error);
    sse.sendError(error);
  }
});

router.post('/ugc', async (req, res) => {
  const { campaignId, productProfile, scripts } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const prompt = buildUGCPrompt(productProfile, scripts);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    const genId = uuidv4();
    q.createGeneration(genId, campaignId, 'ugc', JSON.stringify(parsed), raw);
    logActivity('video-marketing', 'generate', 'Generated UGC briefs', `${parsed.length} briefs`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('UGC generation error:', error);
    sse.sendError(error);
  }
});

router.post('/iterate', async (req, res) => {
  const { campaignId, winners, productProfile } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const prompt = buildIteratePrompt(winners, productProfile);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    const genId = uuidv4();
    q.createGeneration(genId, campaignId, 'iteration', JSON.stringify(parsed), raw);
    logActivity('video-marketing', 'generate', 'Iterated on winners', `${parsed.length} variations`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('Iteration error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { generateWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const { getQueries } = require('../db/queries');
const { logActivity } = require('../../../db/database');
const { getBrandContext } = require('../../../services/brandContext');
const { buildAnglePrompt } = require('../prompts/angleGenerator');
const { buildScriptPrompt } = require('../prompts/scriptWriter');
const { buildHookPrompt } = require('../prompts/hookFactory');
const { buildStoryboardPrompt } = require('../prompts/storyboarder');
const { buildUGCPrompt } = require('../prompts/ugcBrief');
const { buildIteratePrompt } = require('../prompts/iterateWinner');

const MODULE_ID = 'video-marketing';

router.post('/angles', async (req, res) => {
  const { campaignId, productProfile, useBrandHub } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const brandCtx = useBrandHub ? getBrandContext(wsId) : null;
    const prompt = buildAnglePrompt(productProfile, brandCtx);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
      moduleId: MODULE_ID,
    });

    const genId = uuidv4();
    const angles = parsed || [];
    q.createGeneration(genId, campaignId, 'angles', JSON.stringify(angles), raw);
    logActivity('video-marketing', 'generate', 'Generated ad angles', `${angles.length} angles`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('Angle generation error:', error);
    sse.sendError(error);
  }
});

router.post('/scripts', async (req, res) => {
  const { campaignId, productProfile, selectedAngles, duration = 30, platform = 'tiktok', useBrandHub } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const brandCtx = useBrandHub ? getBrandContext(wsId) : null;
    const scripts = [];
    for (const angle of selectedAngles) {
      const prompt = buildScriptPrompt(productProfile, angle, { duration, platform }, brandCtx);
      const { parsed, raw } = await generateWithClaude(prompt, {
        onChunk: (text) => sse.sendChunk(text),
        moduleId: MODULE_ID,
      });
      scripts.push(parsed);
    }

    const genId = uuidv4();
    const safeScripts = scripts.map(s => s || {});
    q.createGeneration(genId, campaignId, 'scripts', JSON.stringify(safeScripts), JSON.stringify(safeScripts));
    logActivity('video-marketing', 'generate', 'Generated scripts', `${safeScripts.length} scripts`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: safeScripts });
  } catch (error) {
    console.error('Script generation error:', error);
    sse.sendError(error);
  }
});

router.post('/hooks', async (req, res) => {
  const { campaignId, productProfile, useBrandHub } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const brandCtx = useBrandHub ? getBrandContext(wsId) : null;
    const prompt = buildHookPrompt(productProfile, brandCtx);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
      moduleId: MODULE_ID,
      maxTokens: 16384,
    });

    const genId = uuidv4();
    const hooks = parsed || [];
    q.createGeneration(genId, campaignId, 'hooks', JSON.stringify(hooks), raw);
    logActivity('video-marketing', 'generate', 'Generated hooks', `${hooks.length} hooks`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('Hook generation error:', error);
    sse.sendError(error);
  }
});

router.post('/storyboard', async (req, res) => {
  const { campaignId, scripts, useBrandHub } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const brandCtx = useBrandHub ? getBrandContext(wsId) : null;
    const storyboards = [];
    for (const script of scripts) {
      const prompt = buildStoryboardPrompt(script, brandCtx);
      const { parsed, raw } = await generateWithClaude(prompt, {
        onChunk: (text) => sse.sendChunk(text),
        moduleId: MODULE_ID,
        maxTokens: 16384,
      });
      storyboards.push(parsed);
    }

    const genId = uuidv4();
    const safeBoards = storyboards.map(s => s || {});
    q.createGeneration(genId, campaignId, 'storyboard', JSON.stringify(safeBoards), JSON.stringify(safeBoards));
    logActivity('video-marketing', 'generate', 'Generated storyboards', `${safeBoards.length} storyboards`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: storyboards });
  } catch (error) {
    console.error('Storyboard generation error:', error);
    sse.sendError(error);
  }
});

router.post('/ugc', async (req, res) => {
  const { campaignId, productProfile, scripts, useBrandHub } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const brandCtx = useBrandHub ? getBrandContext(wsId) : null;
    const prompt = buildUGCPrompt(productProfile, scripts, brandCtx);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
      moduleId: MODULE_ID,
      maxTokens: 16384,
    });

    const genId = uuidv4();
    const ugcBriefs = parsed || [];
    q.createGeneration(genId, campaignId, 'ugc', JSON.stringify(ugcBriefs), raw);
    logActivity('video-marketing', 'generate', 'Generated UGC briefs', `${ugcBriefs.length} briefs`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('UGC generation error:', error);
    sse.sendError(error);
  }
});

router.post('/iterate', async (req, res) => {
  const { campaignId, winners, productProfile, useBrandHub } = req.body;
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  const q = getQueries(wsId);

  try {
    const brandCtx = useBrandHub ? getBrandContext(wsId) : null;
    const prompt = buildIteratePrompt(winners, productProfile, brandCtx);
    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
      moduleId: MODULE_ID,
      maxTokens: 16384,
    });

    const genId = uuidv4();
    const iterations = parsed || [];
    q.createGeneration(genId, campaignId, 'iteration', JSON.stringify(iterations), raw);
    logActivity('video-marketing', 'generate', 'Iterated on winners', `${iterations.length} variations`, campaignId, wsId);
    sse.sendResult({ generationId: genId, data: parsed });
  } catch (error) {
    console.error('Iteration error:', error);
    sse.sendError(error);
  }
});

module.exports = router;

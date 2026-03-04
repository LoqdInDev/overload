const express = require('express');
const router = express.Router();
const { logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// Generate autopilot content with AI (SSE streaming)
router.post('/generate', async (req, res) => {
  const wsId = req.workspace.id;
  const sse = setupSSE(res);
  try {
    const { type, prompt } = req.body;
    const { text } = await generateTextWithClaude(prompt || `Generate ${type || 'content'} for Autopilot`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      moduleId: 'autopilot',
    });
    logActivity('autopilot', 'generate', `Generated ${type || 'content'}`, 'AI generation', null, wsId);
    sse.sendResult({ content: text, type });
  } catch (error) {
    console.error('Autopilot generation error:', error);
    sse.sendError(error);
  }
});

// POST /generate-strategy — SSE: generate 30-day autopilot strategy
router.post('/generate-strategy', async (req, res) => {
  const { business_type, main_goal, goal, active_channels } = req.body;
  const effectiveGoal = main_goal || goal || 'Drive sales';
  if (!business_type && !effectiveGoal) { res.status(400).json({ error: 'business_type or goal required' }); return; }

  const sse = setupSSE(res);
  const prompt = `You are a marketing automation strategist. Create a 30-day autopilot strategy for:

Business Type: ${business_type || 'General Business'}
Main Goal: ${effectiveGoal}
Active Channels: ${active_channels?.join(', ') || 'Email, Social, Ads'}

Create a comprehensive 30-day autopilot plan:

# 30-Day Autopilot Strategy

## Week 1: Foundation
(what automations to set up first — be specific)

## Week 2: Content Engine
(content cadence to automate — platforms, frequency, types)

## Week 3: Lead Nurturing
(email sequences and nurture flows to activate)

## Week 4: Optimization
(A/B tests to run, campaigns to analyze and optimize)

## Budget Allocation
(recommended % split across channels)

## Key KPIs to Track
(5 metrics to monitor daily)

## Estimated Results
(realistic outcomes after 30 days)

Be specific about actual automations and workflows. Name exact actions.`;

  try {
    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });
    sse.sendResult({ content: text });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;

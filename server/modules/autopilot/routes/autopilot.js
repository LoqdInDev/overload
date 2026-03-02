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

module.exports = router;

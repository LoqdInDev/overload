const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

function buildImagePromptOptimizer(type, userPrompt) {
  const typeContext = {
    'ad-creative': 'high-converting social media advertisement image',
    'product-photo': 'professional product photography on a clean background',
    'social-graphic': 'eye-catching social media graphic with bold design',
    'banner': 'web banner or display advertisement image',
  };

  const context = typeContext[type] || 'marketing visual';

  const brandBlock = buildBrandSystemPrompt(getBrandContext());

  return `You are an expert AI image prompt engineer. Convert the user's description into an optimized image generation prompt.

TYPE: ${context}
${brandBlock}

USER DESCRIPTION:
${userPrompt}

Return a JSON object with this structure:
{
  "prompts": [
    {
      "prompt": "detailed optimized prompt for image generation...",
      "negative_prompt": "things to avoid...",
      "alt": "short accessible description of the intended image",
      "style_notes": "brief description of the visual style"
    }
  ]
}

Generate 3 prompt variations. Each should be highly detailed, specifying:
- Composition and layout
- Lighting and color palette
- Style (photorealistic, flat design, 3D render, etc.)
- Mood and atmosphere
- Any text overlay suggestions (describe, don't include actual text in the image prompt)

Return ONLY the JSON object.`;
}

module.exports = { buildImagePromptOptimizer };

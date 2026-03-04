const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

function buildImagePromptOptimizer(type, userPrompt, count = 3, { style, palette, paletteColors, workspaceId, useBrand } = {}) {
  const typeContext = {
    'ad-creative': 'high-converting social media advertisement image',
    'product-photo': 'professional product photography on a clean background',
    'social-graphic': 'eye-catching social media graphic with bold design',
    'banner': 'web banner or display advertisement image',
  };

  const context = typeContext[type] || 'marketing visual';

  const brand = getBrandContext(workspaceId);
  const brandBlock = buildBrandSystemPrompt(brand);

  // Color requirement — brand colors take priority when useBrand is set
  let colorInstruction = '';
  if (useBrand && brand?.colors && typeof brand.colors === 'object') {
    const colorList = Object.entries(brand.colors)
      .filter(([, v]) => v)
      .map(([k, v]) => `${v} (${k})`)
      .join(', ');
    if (colorList) {
      colorInstruction = `\nCOLOR REQUIREMENT — MANDATORY: Use these exact brand colors in every generated image: ${colorList}. These colors must be visually dominant in the composition — backgrounds, accents, highlights, and product elements should all reflect this palette.`;
    }
  } else if (palette && paletteColors && paletteColors.length) {
    colorInstruction = `\nCOLOR REQUIREMENT — MANDATORY: The "${palette}" palette must dominate every image. Use these specific hex colors: ${paletteColors.join(', ')}. Describe these colors explicitly in each prompt for backgrounds, primary elements, and accents.`;
  }

  // Visual style requirement
  const styleInstruction = style
    ? `\nSTYLE REQUIREMENT — MANDATORY: Visual style is "${style}". Every prompt must explicitly describe composition, lighting, textures, and treatment that embody the "${style}" aesthetic.`
    : '';

  // Brand typography hint
  let fontInstruction = '';
  if (useBrand && brand?.fonts && typeof brand.fonts === 'object') {
    const fontList = Object.entries(brand.fonts)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (fontList) {
      fontInstruction = `\nTYPOGRAPHY: When suggesting text overlays, describe typography in the style of these brand fonts: ${fontList}.`;
    }
  }

  return `You are an expert AI image prompt engineer. Convert the user's description into optimized image generation prompts.

TYPE: ${context}
${styleInstruction}${colorInstruction}${fontInstruction}
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
      "style_notes": "brief description of the visual style and colors used"
    }
  ]
}

Generate ${count} prompt variation${count === 1 ? '' : 's'}. Each must be highly detailed and explicitly include:
- Composition and layout
- Lighting and atmosphere
- Visual style: ${style || 'appropriate for the content type'}
- Color palette: ${palette ? `${palette} (${(paletteColors || []).join(', ')})` : 'natural, fitting colors'} — MENTION THESE SPECIFIC COLORS
- Mood and tone
- Any text overlay suggestions (describe placement and style, NOT the actual text content)

Return ONLY the JSON object.`;
}

module.exports = { buildImagePromptOptimizer };

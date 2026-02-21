const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

function buildContentPrompt(type, prompt) {
  const typeInstructions = {
    blog: `You are an expert SEO blog writer. Write a comprehensive, engaging blog post based on the user's request. Include:
- A compelling headline
- Introduction with a hook
- Well-structured sections with subheadings (use ## for headings)
- Actionable insights and examples
- A conclusion with a call to action
- Target 800-1200 words
- Naturally incorporate relevant keywords`,

    adcopy: `You are an expert advertising copywriter. Write high-converting ad copy based on the user's request. Include:
- 3-5 headline variations (short, punchy, attention-grabbing)
- 2-3 primary text variations (compelling body copy)
- 2-3 call-to-action variations
- Format each variation clearly with labels

Focus on benefits over features, use power words, and create urgency.`,

    product: `You are an expert e-commerce copywriter. Write compelling product descriptions based on the user's request. Include:
- A captivating product title
- A short tagline (one line)
- Feature highlights (bullet points)
- Detailed description (2-3 paragraphs) focusing on benefits
- Technical specifications if applicable

Make it persuasive, sensory, and customer-focused.`,

    social: `You are a social media expert. Write platform-optimized social media captions based on the user's request. Include:
- Instagram caption (engaging, with line breaks, emoji suggestions, and 5-10 hashtags)
- Twitter/X post (under 280 characters, punchy)
- LinkedIn post (professional tone, thought-leadership style)
- TikTok caption (casual, trending, with hashtags)

Each should match the platform's voice and best practices.`,

    email: `You are an email marketing expert. Write a complete email based on the user's request. Include:
- Subject line (3 variations, optimized for open rates)
- Preview text
- Email body with:
  - Attention-grabbing opening
  - Value-driven middle section
  - Clear call-to-action
  - Professional sign-off
- Keep it concise and scannable with short paragraphs`,
  };

  const instruction = typeInstructions[type] || typeInstructions.blog;
  const brandBlock = buildBrandSystemPrompt(getBrandContext());

  return `${instruction}
${brandBlock}

USER REQUEST:
${prompt}

Write the content now. Output only the content itself — no meta-commentary.`;
}

module.exports = { buildContentPrompt };

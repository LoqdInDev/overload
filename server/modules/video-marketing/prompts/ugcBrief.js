const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

function buildUGCPrompt(productProfile, scripts) {
  const brandBlock = buildBrandSystemPrompt(getBrandContext());

  return `You are a UGC (User Generated Content) strategist for e-commerce brands.
${brandBlock}

PRODUCT PROFILE:
${JSON.stringify(productProfile, null, 2)}

WINNING SCRIPTS:
${JSON.stringify(scripts, null, 2)}

Create 10 UGC-style video briefs. These should feel like REAL people organically sharing their experience — not ads.

UGC FORMATS (2 each):

1. UNBOXING REACTION
2. GET READY WITH ME (using product)
3. HONEST REVIEW (balanced, with minor "con" for credibility)
4. DAY IN MY LIFE (product naturally integrated)
5. STITCHED RESPONSE (reacting to a "question" about the product category)

For each brief:
{
  "brief_id": "uuid",
  "format": "string",
  "creator_persona": {
    "age_range": "string",
    "vibe": "string — e.g., 'chill millennial mom', 'skeptical tech bro', 'aesthetic college student'",
    "setting": "string — where they're filming",
    "authenticity_markers": ["specific details that make it feel real, not scripted"]
  },
  "script_outline": {
    "opening": "how they start (NOT 'Hey guys')",
    "middle": "key points they hit",
    "close": "how they end — should NOT feel like a CTA"
  },
  "spoken_tone": "string — casual / excited / skeptical-turned-believer / matter-of-fact",
  "do_list": ["things that make UGC perform"],
  "dont_list": ["things that make UGC feel fake"],
  "video_generation_prompt": "Complete Higgsfield/Kling prompt to generate this UGC video"
}

Return valid JSON only.`;
}

module.exports = { buildUGCPrompt };

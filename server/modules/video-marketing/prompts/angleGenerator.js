function buildAnglePrompt(productProfile) {
  return `You are an elite Direct Response Copywriter who has generated $50M+ in DTC e-commerce revenue.

PRODUCT PROFILE:
${JSON.stringify(productProfile, null, 2)}

Generate exactly 10 video ad angles for this product. Each angle must use a DIFFERENT psychological framework:

FRAMEWORKS TO USE (use each at least once, repeat your best picks for 10 total):

1. PROBLEM-AGITATION-SOLUTION — Identify a painful problem, twist the knife on consequences, then present the product as the hero
2. BEFORE-AFTER-BRIDGE — Paint the struggle state, show the dream state, bridge with the product
3. STORY-DEMONSTRATION-PROOF — Tell a relatable mini-story, show the product in action, prove results
4. OBJECTION-DESTROYER — Name the #1 reason someone WOULDN'T buy, reframe it, prove them wrong
5. URGENCY-SCARCITY-ACTION — Create genuine time/quantity pressure with a specific CTA
6. CURIOSITY GAP — Open a loop the viewer MUST close ("I can't believe this $12 thing replaced my...")
7. IDENTITY PLAY — Frame the product as what [type of person] uses ("Smart moms don't waste time on...")
8. ENEMY-COMMON — Unite viewer against a shared enemy (big brands, outdated methods, wasted money)

For EACH angle, output this exact JSON structure:
{
  "angle_name": "string — catchy 3-5 word name",
  "framework": "string — which framework",
  "target_emotion": "string — primary emotion to trigger",
  "hook": "string — exact words for first 3 seconds of video. This MUST stop the scroll. Use pattern interrupts, bold claims, or visual shock descriptions.",
  "concept": "string — 2-3 sentence description of the full video concept",
  "why_it_works": "string — 1 sentence on the conversion psychology",
  "estimated_strength": "string — HIGH / MEDIUM / SLEEPER HIT",
  "target_audience_segment": "string — who this angle hits hardest"
}

Return a JSON array of exactly 10 angles. No markdown, no explanation, just valid JSON.`;
}

module.exports = { buildAnglePrompt };

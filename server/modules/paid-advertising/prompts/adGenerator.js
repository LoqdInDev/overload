const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

const PLATFORM_INSTRUCTIONS = {
  google: `Generate a complete Google Ads campaign with:
- 5 responsive search ad headlines (max 30 chars each, no punctuation at end)
- 4 responsive search ad descriptions (max 90 chars each)
- 5 keyword suggestions with match types (Broad, Phrase, Exact)
- 2 sitelink extension suggestions (title + 2-line description each)
- Recommended bidding strategy with justification
- Ad group structure recommendation`,

  meta: `Generate a complete Meta (Facebook/Instagram) ad campaign with:
- 3 primary text variations (engaging, conversational, under 125 chars each)
- 3 headline variations (short, impactful, under 40 chars each)
- 2 description variations (under 30 chars)
- Call-to-action button recommendation
- Audience targeting suggestions (interests, behaviors, demographics)
- Placement recommendations (Feed, Stories, Reels)`,

  tiktok: `Generate a complete TikTok ad campaign with:
- 3 ad text variations (casual, native TikTok voice — not corporate)
- Hook suggestions (first 3 seconds — the make-or-break moment)
- 3 trending sound/music style suggestions
- 5 hashtag recommendations (mix of niche and trending)
- Targeting suggestions (interests, behaviors, demographics)
- Ad format recommendation (In-Feed, TopView, Spark Ads) with reasoning`,

  linkedin: `Generate a complete LinkedIn Ads campaign with:
- 3 introductory text variations (professional tone, max 150 chars each, value-focused)
- 3 headline variations (results-focused, max 70 chars each)
- 2 description variations (supporting the offer)
- Call-to-action recommendation (Apply Now, Download, Get Quote, Learn More, Register, Sign Up, Subscribe)
- Audience targeting suggestions (job titles, seniority levels, industries, company size, skills)
- Campaign format recommendation (Sponsored Content, Lead Gen Form, Conversation Ad, Thought Leader) with reasoning
- 2 lead gen form question suggestions if objective involves lead generation`,
};

function buildAdCampaignPrompt(platform, campaign) {
  const instruction = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.meta;
  const brandBlock = buildBrandSystemPrompt(getBrandContext());

  return `You are an expert paid media strategist. ${instruction}
${brandBlock}

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.name}
- Objective: ${campaign.objective}
- Daily Budget: $${campaign.budget}/day
- Target Audience: ${campaign.audience}

Return a JSON object with this exact structure:
{
  "campaign_name": "...",
  "platform": "${platform}",
  "ad_content": {
    "headlines": ["..."],
    "descriptions": ["..."],
    "primary_texts": ["..."],
    "cta": "...",
    "extras": {}
  },
  "targeting": {
    "audience_segments": ["..."],
    "interests": ["..."],
    "demographics": "...",
    "placements": ["..."]
  },
  "strategy": {
    "bidding": "...",
    "optimization": "...",
    "recommendations": ["..."]
  }
}

Return ONLY the JSON object, no markdown fences.`;
}

module.exports = { buildAdCampaignPrompt, PLATFORM_INSTRUCTIONS };

const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

function buildAdCampaignPrompt(platform, campaign) {
  const platformInstructions = {
    google: `Generate a complete Google Ads campaign with:
- 5 responsive search ad headlines (max 30 chars each)
- 4 responsive search ad descriptions (max 90 chars each)
- 5 keyword suggestions with match types
- 2 sitelink extension suggestions
- Recommended bidding strategy
- Ad group structure recommendation`,

    meta: `Generate a complete Meta (Facebook/Instagram) ad campaign with:
- 3 primary text variations (engaging, conversational)
- 3 headline variations (short, impactful)
- 2 description variations
- Call-to-action button recommendation
- Audience targeting suggestions (interests, behaviors, demographics)
- Placement recommendations (Feed, Stories, Reels)`,

    tiktok: `Generate a complete TikTok ad campaign with:
- 3 ad text variations (casual, native TikTok voice)
- Hook suggestions (first 3 seconds concepts)
- 3 trending sound/music style suggestions
- Hashtag recommendations
- Targeting suggestions
- Ad format recommendation (In-Feed, TopView, Spark Ads)`,
  };

  const instruction = platformInstructions[platform] || platformInstructions.meta;

  const brandBlock = buildBrandSystemPrompt(getBrandContext());

  return `You are an expert paid media strategist. ${instruction}
${brandBlock}

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.name}
- Objective: ${campaign.objective}
- Daily Budget: ${campaign.budget}
- Target Audience: ${campaign.audience}

Return a JSON object with the structure:
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

Return ONLY the JSON object.`;
}

module.exports = { buildAdCampaignPrompt };

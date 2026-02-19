function buildHookPrompt(productProfile) {
  const topBenefit = productProfile.features?.[0] || productProfile.description?.slice(0, 100) || 'key benefit';

  return `You are a hook specialist. You've studied 10,000 viral TikTok ads and know exactly what makes people stop scrolling.

PRODUCT: ${productProfile.name}
KEY BENEFIT: ${topBenefit}
TARGET AUDIENCE: ${productProfile.targetAudience || 'general consumers'}
PRICE: ${productProfile.price || 'N/A'}

Generate 50 unique hooks (first 3 seconds of a video ad). Organize them by type:

HOOK TYPES (10 each):

1. BOLD CLAIM HOOKS
   "This ${productProfile.price || '$XX'} [product] replaced my $[expensive alternative]"
   Pattern: Specific number + surprising comparison

2. QUESTION HOOKS
   "Why are [target audience] switching to [product]?"
   Pattern: Create curiosity gap

3. NEGATIVE HOOKS
   "Stop buying [competitor/old way] — here's why"
   Pattern: Pattern interrupt through negativity

4. STORY HOOKS
   "I almost didn't buy this, but..."
   Pattern: Personal narrative opening

5. RESULT HOOKS
   "Day 1 vs Day 30 with [product]"
   Pattern: Show transformation upfront

For EACH hook provide:
{
  "hook_text": "exact words spoken",
  "hook_type": "category",
  "visual_suggestion": "what viewer sees during these 3 seconds",
  "scroll_stop_rating": 1-10,
  "best_paired_with_angle": "which angle framework this works best with"
}

Return as JSON array. No markdown.`;
}

module.exports = { buildHookPrompt };

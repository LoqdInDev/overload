function getVideoPromptOptimizerPrompt(sceneDescription, productProfile, videoProvider) {
  return `You are an AI Video Prompt Engineer for ${videoProvider}.

SCENE TO CONVERT:
${sceneDescription}

PRODUCT:
- Name: ${productProfile.name}
- Description: ${productProfile.description}

Rewrite this as an optimized video generation prompt. Rules:
1. Be visually specific — describe subject appearance, clothing, setting, lighting
2. Describe the product PHYSICALLY (the AI model doesn't know the product name)
3. Include camera keywords: "slow zoom in", "tracking shot", "static wide", "handheld close-up"
4. Specify mood via lighting: "warm golden hour", "cool fluorescent", "dramatic side lighting"
5. Keep under 150 words
6. Do NOT include text overlay instructions — video AI can't render text
7. End with style keywords: "cinematic, shallow depth of field, 9:16 vertical"

Return ONLY the optimized prompt text.`;
}

module.exports = { getVideoPromptOptimizerPrompt };

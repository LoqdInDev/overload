function buildStoryboardPrompt(script) {
  return `You are a video storyboard artist for social media ads.

SCRIPT:
${JSON.stringify(script, null, 2)}

Create a detailed storyboard for this script. For each scene/segment, provide:

{
  "scenes": [
    {
      "scene_number": 1,
      "timestamp": "0-3s",
      "visual_description": "Detailed description of what's shown — specific enough to generate with AI video tools (Higgsfield, Kling, Runway). Include: subject, action, camera angle, lighting, setting, mood.",
      "camera_direction": "close-up / medium / wide / POV / overhead",
      "camera_movement": "static / pan left / zoom in / tracking / handheld shake",
      "subject_action": "what the person/product is doing",
      "text_overlay": {
        "text": "on-screen text",
        "position": "top / center / bottom",
        "style": "bold impact / handwritten / subtitle"
      },
      "transition_to_next": "cut / swipe / zoom / morph",
      "ai_video_prompt": "Ready-to-paste prompt for Higgsfield/Kling video generation. Be specific about subject, action, camera, lighting, and style.",
      "reference_style": "what existing TikTok/ad style this should look like"
    }
  ],
  "overall_pacing": "fast cuts / medium / slow cinematic",
  "color_grade": "warm / cool / neutral / high contrast",
  "aspect_ratio": "9:16",
  "total_scenes": number
}

The ai_video_prompt field is CRITICAL — it should be a complete, self-contained prompt that someone can paste directly into Higgsfield or Kling to generate that exact scene.

Return valid JSON only.`;
}

module.exports = { buildStoryboardPrompt };

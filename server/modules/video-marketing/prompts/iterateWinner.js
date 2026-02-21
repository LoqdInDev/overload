const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

function buildIteratePrompt(winners, productProfile) {
  const brandBlock = buildBrandSystemPrompt(getBrandContext());

  return `You are an ad creative iteration specialist. Your job: take what's working and multiply it.
${brandBlock}

WINNING CONCEPTS (user selected these as best):
${JSON.stringify(winners, null, 2)}

PRODUCT PROFILE:
${JSON.stringify(productProfile, null, 2)}

Analyze WHY these won (what patterns, hooks, emotions, structures). Then generate 10 NEW variations that:

1. Keep the CORE psychology that made the winners work
2. Change the SURFACE (different words, scenarios, visuals)
3. Test ONE new variable per variation (different hook type, different CTA, different emotional angle)

For each variation, output the full script + storyboard in the same format as the originals, PLUS:
{
  "based_on": "which winner this iterates on",
  "what_changed": "specific variable being tested",
  "hypothesis": "why this change might improve performance",
  "script": {
    "angle_name": "string",
    "total_duration": 30,
    "platform": "tiktok",
    "segments": [
      {
        "timestamp": "0-3s",
        "section": "HOOK",
        "spoken_words": "exact dialogue",
        "visual_direction": "what camera shows",
        "text_overlay": "on-screen text if any",
        "music_note": "music/sound direction",
        "editing_note": "cut style, transition, etc."
      }
    ],
    "thumbnail_concept": "string",
    "hashtag_suggestions": ["hashtags"]
  },
  "storyboard": {
    "scenes": [
      {
        "scene_number": 1,
        "timestamp": "0-3s",
        "visual_description": "detailed visual",
        "camera_direction": "string",
        "camera_movement": "string",
        "subject_action": "string",
        "ai_video_prompt": "ready-to-paste prompt for video generation"
      }
    ],
    "overall_pacing": "string",
    "color_grade": "string"
  }
}

Return a JSON array of exactly 10 variations. No markdown.`;
}

module.exports = { buildIteratePrompt };

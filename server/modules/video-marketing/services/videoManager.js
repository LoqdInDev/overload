const wavespeedService = require('./wavespeed');
const klingService = require('./kling');
const fs = require('fs');
const path = require('path');

// Use the same volume-aware dataDir as server/index.js so files land
// in the persistent volume on Railway instead of the ephemeral app dir.
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();

class VideoManager {
  constructor() {
    this.videoDir = path.join(dataDir, 'videos');
    if (!fs.existsSync(this.videoDir)) {
      fs.mkdirSync(this.videoDir, { recursive: true });
    }
  }

  get provider() {
    return process.env.VIDEO_PROVIDER || 'wavespeed';
  }

  getService(override) {
    const p = override || this.provider;
    return p === 'kling' ? klingService : wavespeedService;
  }

  async generateScene(scene, productImages = [], providerOverride = null) {
    const service = this.getService(providerOverride);
    let result;

    if (
      scene.generation_method === 'image-to-video' &&
      scene.source_image_index !== null &&
      scene.source_image_index !== undefined &&
      productImages[scene.source_image_index]
    ) {
      result = await service.generateFromImage(
        productImages[scene.source_image_index],
        scene.ai_video_prompt,
        scene.ai_video_settings || {}
      );
    } else {
      result = await service.generateFromText(
        scene.ai_video_prompt,
        scene.ai_video_settings || {}
      );
    }

    if (result.success && result.videoUrl) {
      const filename = `campaign_scene${scene.scene_number}_${Date.now()}.mp4`;
      const filepath = path.join(this.videoDir, filename);
      try {
        await this.downloadVideo(result.videoUrl, filepath);
        result.localPath = `/videos/${filename}`;
        result.filename = filename;
      } catch (downloadErr) {
        // Download failed (CDN unreachable, expired URL, etc.) but video WAS generated.
        // Keep result.success = true and expose the remote URL so the client can use it.
        console.error('[VideoManager] Video download failed, using remote URL:', downloadErr.message, result.videoUrl);
        result.localPath = null;
        result.filename = null;
        // result.videoUrl is already set — client will fall back to it
      }
    }

    return result;
  }

  async generateBatch(scenes, productImages, campaignId, dbQueries, providerOverride = null) {
    const results = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const jobId = await dbQueries.createVideoJob(
        campaignId,
        scene.scene_number,
        'processing',
        scene.ai_video_prompt,
        providerOverride || this.provider
      );

      try {
        if (i > 0) await new Promise((r) => setTimeout(r, 3000));
        const result = await this.generateScene(scene, productImages, providerOverride);
        await dbQueries.updateVideoJob(jobId, result.success ? 'completed' : 'failed', result);
        results.push({ scene: scene.scene_number, jobId, ...result });
      } catch (error) {
        await dbQueries.updateVideoJob(jobId, 'failed', { error: error.message });
        results.push({ scene: scene.scene_number, jobId, success: false, error: error.message });
      }
    }
    return results;
  }

  async downloadVideo(url, filepath) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video from provider: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error('Provider returned an empty video file');
    }
    fs.writeFileSync(filepath, buffer);
  }
}

module.exports = new VideoManager();

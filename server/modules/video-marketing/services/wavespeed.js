const BASE_URL = 'https://api.wavespeed.ai/api/v3';

const MODELS = {
  'kling-v3.0-pro': {
    t2v: 'kwaivgi/kling-v3.0-pro/text-to-video',
    i2v: 'kwaivgi/kling-v3.0-pro/image-to-video',
  },
  'kling-v2.6-pro': {
    t2v: 'kwaivgi/kling-v2.6-pro/text-to-video',
    i2v: 'kwaivgi/kling-v2.6-pro/image-to-video',
  },
};

const DEFAULT_MODEL = 'kling-v3.0-pro';

class WaveSpeedService {
  get apiKey() {
    return process.env.WAVESPEED_API_KEY;
  }

  headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generateFromText(prompt, settings = {}) {
    const { duration = 5, aspectRatio = '9:16', model = DEFAULT_MODEL } = settings;
    const endpoint = MODELS[model]?.t2v || MODELS[DEFAULT_MODEL].t2v;

    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          prompt,
          negative_prompt: 'blurry, distorted, low quality, watermark, text overlay',
          duration: Math.min(Math.max(duration, 3), 15),
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : '16:9',
          cfg_scale: 0.5,
        }),
      });

      const data = await response.json();

      if (data.code !== 200 || !data.data?.id) {
        return { success: false, error: data.message || `API error (${data.code})` };
      }

      return this.pollForResult(data.data.id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateFromImage(imageUrl, prompt, settings = {}) {
    const { duration = 5, model = DEFAULT_MODEL } = settings;
    const endpoint = MODELS[model]?.i2v || MODELS[DEFAULT_MODEL].i2v;

    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          prompt,
          image: imageUrl,
          negative_prompt: 'blurry, distorted, low quality, watermark, text overlay',
          duration: Math.min(Math.max(duration, 3), 15),
          cfg_scale: 0.5,
        }),
      });

      const data = await response.json();

      if (data.code !== 200 || !data.data?.id) {
        return { success: false, error: data.message || `API error (${data.code})` };
      }

      return this.pollForResult(data.data.id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async pollForResult(taskId, maxAttempts = 120, interval = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      try {
        const res = await fetch(`${BASE_URL}/predictions/${taskId}/result`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });

        const data = await res.json();
        const status = data.data?.status;

        if (status === 'completed') {
          const videoUrl = data.data?.outputs?.[0];
          if (videoUrl) {
            return { success: true, videoUrl, taskId };
          }
          return { success: false, error: 'Completed but no output URL' };
        }

        if (status === 'failed') {
          return { success: false, error: data.data?.error || 'Generation failed' };
        }
      } catch (error) {
        // Ignore transient poll errors
      }
    }

    return { success: false, error: 'Polling timed out after 10 minutes' };
  }
}

module.exports = new WaveSpeedService();

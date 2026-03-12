const BASE_URL = 'https://api.wavespeed.ai/api/v3';

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

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
    const { duration = 5, aspectRatio = '9:16', sound = false } = settings;
    // kling-v2.6-pro has documented native audio support via sound:true
    const modelKey = sound ? 'kling-v2.6-pro' : (settings.model || DEFAULT_MODEL);
    const endpoint = MODELS[modelKey]?.t2v || MODELS[DEFAULT_MODEL].t2v;

    try {
      const response = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          prompt,
          negative_prompt: 'blurry, distorted, low quality, watermark, text overlay',
          duration: Math.min(Math.max(duration, 3), 15),
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : '16:9',
          cfg_scale: 0.5,
          ...(sound && { sound: true }),
        }),
      }, 30000);

      const data = await response.json();
      console.log('[WaveSpeed] t2v submit response:', data.code, data.data?.id || 'no-id');

      if (data.code !== 200 || !data.data?.id) {
        console.error('[WaveSpeed] t2v submit failed:', JSON.stringify(data));
        return { success: false, error: data.message || `API error (${data.code})` };
      }

      const taskId = data.data.id;
      console.log(`[WaveSpeed] t2v task started: ${taskId}, polling...`);
      const result = await this.pollForResult(taskId);
      result.taskId = taskId;
      return result;
    } catch (error) {
      const cause = error.cause?.message || error.cause?.code || '';
      console.error('[WaveSpeed] generateFromText failed:', error.message, cause || '');
      return { success: false, error: cause ? `${error.message} (${cause})` : error.message };
    }
  }

  async generateFromImage(imageUrl, prompt, settings = {}) {
    const { duration = 5, sound = false } = settings;
    const modelKey = sound ? 'kling-v2.6-pro' : (settings.model || DEFAULT_MODEL);
    const endpoint = MODELS[modelKey]?.i2v || MODELS[DEFAULT_MODEL].i2v;

    try {
      const response = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          prompt,
          image: imageUrl,
          negative_prompt: 'blurry, distorted, low quality, watermark, text overlay',
          duration: Math.min(Math.max(duration, 3), 15),
          cfg_scale: 0.5,
          ...(sound && { sound: true }),
        }),
      }, 30000);

      const data = await response.json();
      console.log('[WaveSpeed] i2v submit response:', data.code, data.data?.id || 'no-id');

      if (data.code !== 200 || !data.data?.id) {
        console.error('[WaveSpeed] i2v submit failed:', JSON.stringify(data));
        return { success: false, error: data.message || `API error (${data.code})` };
      }

      const taskId = data.data.id;
      console.log(`[WaveSpeed] i2v task started: ${taskId}, polling...`);
      const result = await this.pollForResult(taskId);
      result.taskId = taskId;
      return result;
    } catch (error) {
      const cause = error.cause?.message || error.cause?.code || '';
      console.error('[WaveSpeed] generateFromImage failed:', error.message, cause || '', 'image:', imageUrl);
      return { success: false, error: cause ? `${error.message} (${cause})` : error.message };
    }
  }

  async pollForResult(taskId, maxAttempts = 180, interval = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      try {
        const res = await fetchWithTimeout(`${BASE_URL}/predictions/${taskId}/result`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }, 30000);

        if (!res.ok) {
          console.error(`[WaveSpeed] poll #${i + 1} HTTP ${res.status} for task=${taskId}`);
          continue;
        }

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch {
          console.error(`[WaveSpeed] poll #${i + 1} invalid JSON for task=${taskId}:`, text.slice(0, 200));
          continue;
        }

        const status = data.data?.status;

        if (i % 6 === 0 || status === 'completed' || status === 'failed') {
          console.log(`[WaveSpeed] poll #${i + 1} task=${taskId} status=${status}`);
        }

        if (status === 'completed') {
          const videoUrl = data.data?.outputs?.[0];
          if (videoUrl) {
            console.log(`[WaveSpeed] task=${taskId} COMPLETED, url=${videoUrl.slice(0, 80)}...`);
            return { success: true, videoUrl, taskId };
          }
          console.error('[WaveSpeed] Completed but no output URL. Full response:', JSON.stringify(data.data));
          return { success: false, error: 'Completed but no output URL' };
        }

        if (status === 'failed') {
          console.error('[WaveSpeed] Task failed:', data.data?.error, JSON.stringify(data.data));
          return { success: false, error: data.data?.error || 'Generation failed' };
        }
      } catch (error) {
        console.error(`[WaveSpeed] poll #${i + 1} error:`, error.name, error.message);
        // Continue polling on transient errors
      }
    }

    return { success: false, error: 'Generation timed out after 15 minutes. Use Recover to check later.', taskId, timedOut: true };
  }
  async checkTask(taskId) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/predictions/${taskId}/result`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }, 15000);
      const data = await res.json();
      const status = data.data?.status;
      if (status === 'completed') {
        const videoUrl = data.data?.outputs?.[0];
        if (videoUrl) return { success: true, videoUrl, taskId };
        return { success: false, error: 'Completed but no output URL', taskId };
      }
      if (status === 'failed') {
        return { success: false, error: data.data?.error || 'Generation failed', taskId };
      }
      return { success: false, error: `Still processing (status: ${status})`, taskId, status };
    } catch (error) {
      return { success: false, error: error.message, taskId };
    }
  }
}

module.exports = new WaveSpeedService();

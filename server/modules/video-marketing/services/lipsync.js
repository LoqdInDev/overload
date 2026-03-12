const BASE_URL = 'https://api.wavespeed.ai/api/v3';

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

class LipSyncService {
  get apiKey() { return process.env.WAVESPEED_API_KEY; }

  headers() {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async syncLips(videoUrl, audioUrl) {
    const response = await fetchWithTimeout(`${BASE_URL}/kwaivgi/kling-lipsync/audio-to-video`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ video: videoUrl, audio: audioUrl }),
    }, 30000);

    const data = await response.json();
    console.log('[LipSync] submit:', data.code, data.message || '');

    if (data.code !== 200 || !data.data?.id) {
      return { success: false, error: data.message || `LipSync API error (${data.code})` };
    }

    return this.pollForResult(data.data.id);
  }

  async pollForResult(taskId, maxAttempts = 36, interval = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval));
      try {
        const res = await fetchWithTimeout(`${BASE_URL}/predictions/${taskId}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }, 15000);
        const data = await res.json();
        const status = data.data?.status;

        if (status === 'completed') {
          const videoUrl = data.data?.outputs?.[0];
          if (videoUrl) return { success: true, videoUrl };
          return { success: false, error: 'LipSync completed but no output URL' };
        }
        if (status === 'failed') {
          return { success: false, error: data.data?.error || 'LipSync failed' };
        }
      } catch (e) {
        console.error('[LipSync] poll error:', e.message);
      }
    }
    return { success: false, error: 'LipSync timed out after 3 minutes' };
  }
}

module.exports = new LipSyncService();

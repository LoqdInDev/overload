const BASE_URL = 'https://api.wavespeed.ai/api/v3';

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

class TTSService {
  get apiKey() { return process.env.WAVESPEED_API_KEY; }

  headers() {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  // Returns a public audio URL string, or throws on failure
  async generateSpeech(text, options = {}) {
    const { voice = 'Calm_Man', speed = 1.0 } = options;

    const response = await fetchWithTimeout(`${BASE_URL}/minimax/speech-2.6`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ text, voice_id: voice, speed }),
    }, 30000);

    const data = await response.json();
    console.log('[TTS] submit:', data.code, data.message || '');

    if (data.code !== 200 || !data.data?.id) {
      throw new Error(data.message || `TTS API error (${data.code})`);
    }

    return this.pollForResult(data.data.id);
  }

  async pollForResult(taskId, maxAttempts = 20, interval = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval));
      try {
        const res = await fetchWithTimeout(`${BASE_URL}/predictions/${taskId}/result`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }, 15000);
        const data = await res.json();
        const status = data.data?.status;
        console.log(`[TTS] poll ${i + 1}: ${status}`);

        if (status === 'completed') {
          const audioUrl = data.data?.outputs?.[0];
          if (audioUrl) return audioUrl;
          throw new Error('TTS completed but no output URL');
        }
        if (status === 'failed') {
          throw new Error(data.data?.error || 'TTS generation failed');
        }
      } catch (e) {
        if (e.message.startsWith('TTS')) throw e;
        // transient network error — keep polling
      }
    }
    throw new Error('TTS timed out after 60 seconds');
  }
}

module.exports = new TTSService();

class KlingService {
  constructor() {
    this.baseUrl = 'https://api.klingai.com';
  }

  get apiKey() {
    return process.env.KLING_API_KEY;
  }

  async generateFromText(prompt, settings = {}) {
    const { duration = 5, aspectRatio = '9:16', mode = 'standard' } = settings;
    const response = await fetch(`${this.baseUrl}/v1/videos/text2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kling-v2.6-pro',
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        mode,
      }),
    });
    const data = await response.json();
    if (!data.task_id) {
      return { success: false, error: data.message || 'No task_id returned' };
    }
    return this.pollForResult(data.task_id);
  }

  async generateFromImage(imageUrl, prompt, settings = {}) {
    const { duration = 5, aspectRatio = '9:16' } = settings;
    const response = await fetch(`${this.baseUrl}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kling-v2.6-pro',
        prompt,
        image: imageUrl,
        duration,
        aspect_ratio: aspectRatio,
      }),
    });
    const data = await response.json();
    if (!data.task_id) {
      return { success: false, error: data.message || 'No task_id returned' };
    }
    return this.pollForResult(data.task_id);
  }

  async pollForResult(taskId, maxAttempts = 60, interval = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));
      const res = await fetch(`${this.baseUrl}/v1/videos/status/${taskId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const data = await res.json();
      if (data.status === 'SUCCESS' || data.status === 'completed') {
        return {
          success: true,
          videoUrl: data.video_url || data.response?.[0],
          taskId,
        };
      }
      if (data.status === 'FAILED' || data.status === 'failed') {
        return {
          success: false,
          error: data.error_message || 'Generation failed',
        };
      }
    }
    return { success: false, error: 'Polling timed out' };
  }
}

module.exports = new KlingService();

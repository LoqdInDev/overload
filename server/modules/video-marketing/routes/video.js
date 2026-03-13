const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// Match the volume-aware dataDir used by server/index.js and videoManager
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
const videosDir = path.join(dataDir, 'videos');
const videoManager = require('../services/videoManager');
const { getVideoQueries } = require('../db/queries');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { getVideoPromptOptimizerPrompt } = require('../prompts/videoPromptOptimizer');
const { generateImageFromReference } = require('../../../services/gemini');

const router = express.Router();

function safeParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

router.post('/generate-scene', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const { campaignId, scene, productImages, provider } = req.body;
  try {
    const jobId = await videoQueries.createVideoJob(
      campaignId,
      scene.scene_number,
      'processing',
      scene.ai_video_prompt,
      provider || process.env.VIDEO_PROVIDER
    );
    res.json({ jobId, status: 'processing' });

    const result = await videoManager.generateScene(scene, productImages || [], provider);
    await videoQueries.updateVideoJob(jobId, result.success ? 'completed' : 'failed', result);
  } catch (error) {
    console.error('Video scene generation error:', error);
  }
});

router.post('/generate-all', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const { campaignId, scenes, productImages, provider } = req.body;

  const jobs = [];
  for (const scene of scenes) {
    const jobId = await videoQueries.createVideoJob(
      campaignId,
      scene.scene_number,
      'queued',
      scene.ai_video_prompt,
      provider || process.env.VIDEO_PROVIDER
    );
    jobs.push({ jobId, sceneNumber: scene.scene_number });
  }

  res.json({ jobs, status: 'processing' });

  videoManager.generateBatch(
    scenes,
    productImages || [],
    campaignId,
    videoQueries,
    provider
  );
});

router.post('/generate-quick', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const { campaignId, hookText, productImageUrl, provider, duration = 5, aspectRatio = '9:16', sound = false } = req.body;

  // WaveSpeed requires a real HTTPS URL — it cannot accept base64 data URIs or relative paths.
  let resolvedImageUrl = productImageUrl || null;
  if (productImageUrl) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');

    if (productImageUrl.startsWith('data:')) {
      // Base64 data URL — save to disk and build a public URL
      try {
        const match = productImageUrl.match(/^data:([^;]+);base64,(.+)$/s);
        if (match) {
          const ext = match[1].split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
          const filename = `tmp_img_${Date.now()}.${ext}`;
          const filepath = path.join(videosDir, filename);
          fs.writeFileSync(filepath, Buffer.from(match[2], 'base64'));
          resolvedImageUrl = `${proto}://${host}/videos/${filename}`;
        }
      } catch {
        resolvedImageUrl = null;
      }
    } else if (productImageUrl.startsWith('/')) {
      // Relative server path (e.g. /uploads/creatives/abc.jpg) — convert to public URL
      resolvedImageUrl = `${proto}://${host}${productImageUrl}`;
    }
    // Otherwise it's already a full URL — pass through as-is
  }

  const scene = {
    scene_number: 0,
    generation_method: resolvedImageUrl ? 'image-to-video' : 'text-to-video',
    source_image_index: resolvedImageUrl ? 0 : null,
    ai_video_prompt: hookText,
    ai_video_settings: { duration, aspectRatio, resolution: '720p', sound },
  };

  // Use null for campaign_id when no real campaign — 'quick'/'ugc-studio' aren't valid FK values
  const safeCampaignId = campaignId && campaignId.length > 10 && !['quick', 'ugc-studio'].includes(campaignId)
    ? campaignId : null;
  const jobId = await videoQueries.createVideoJob(
    safeCampaignId,
    0,
    'processing',
    hookText,
    provider || process.env.VIDEO_PROVIDER
  );
  res.json({ jobId, status: 'processing' });

  console.log(`[generate-quick] jobId=${jobId} method=${scene.generation_method} image=${resolvedImageUrl ? resolvedImageUrl.slice(0, 60) + '...' : 'none'}`);

  try {
    const result = await videoManager.generateScene(
      scene,
      resolvedImageUrl ? [resolvedImageUrl] : []
    );
    console.log(`[generate-quick] jobId=${jobId} done: success=${result.success} videoUrl=${result.videoUrl?.slice(0, 60) || 'none'}`);
    await videoQueries.updateVideoJob(jobId, result.success ? 'completed' : 'failed', result);
  } catch (error) {
    console.error(`[generate-quick] jobId=${jobId} CRASHED:`, error.message);
    await videoQueries.updateVideoJob(jobId, 'failed', { error: error.message });
  }
});

// POST /generate-scene-frame — use Gemini to create a unique starting frame for a scene
// Takes a reference image + scene visual prompt, returns a new image with varied composition
router.post('/generate-scene-frame', async (req, res) => {
  const { scenePrompt, referenceImageUrl, aspectRatio = '9:16' } = req.body;
  if (!scenePrompt) return res.status(400).json({ error: 'scenePrompt required' });
  if (!referenceImageUrl) return res.status(400).json({ error: 'referenceImageUrl required' });

  try {
    // Fetch the reference image and convert to base64
    let base64, mimeType;
    if (referenceImageUrl.startsWith('data:')) {
      const match = referenceImageUrl.match(/^data:([^;]+);base64,(.+)$/s);
      if (!match) return res.status(400).json({ error: 'Invalid data URL' });
      mimeType = match[1];
      base64 = match[2];
    } else {
      // It's a URL (local /uploads/... or external) — fetch it
      const imgUrl = referenceImageUrl.startsWith('/')
        ? `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}${referenceImageUrl}`
        : referenceImageUrl;
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) return res.status(400).json({ error: `Failed to fetch reference image: HTTP ${imgRes.status}` });
      const buf = Buffer.from(await imgRes.arrayBuffer());
      base64 = buf.toString('base64');
      mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    }

    const framePrompt = `Generate a new image based on this reference. Keep the SAME person/product identity, appearance, and features but place them in a completely NEW pose, angle, and composition as described below.

SCENE DIRECTION: ${scenePrompt}

CRITICAL RULES:
- The person/product must look identical to the reference — same face, body, clothing, colors, materials
- But the POSE, CAMERA ANGLE, FRAMING, and SETTING must match the scene direction above
- This is a starting frame for a video — make it feel like a frozen moment of action, not a static portrait
- Cinematic quality, professional lighting as described in the scene direction`;

    const result = await generateImageFromReference(framePrompt, [{ base64, mimeType }], aspectRatio);
    console.log(`[SceneFrame] Generated frame for scene: ${result.url}`);
    res.json({ success: true, imageUrl: result.url, dataUrl: result.dataUrl });
  } catch (err) {
    console.error('[SceneFrame] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/optimize-prompt', async (req, res) => {
  const { sceneDescription, productProfile, videoProvider } = req.body;
  try {
    const prompt = getVideoPromptOptimizerPrompt(
      sceneDescription,
      productProfile,
      videoProvider || 'WaveSpeedAI (Kling v3.0 Pro)'
    );
    const { raw } = await generateWithClaude(prompt, { temperature: 0.7 });
    res.json({ optimizedPrompt: raw.trim() });
  } catch (error) {
    console.error('Prompt optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const jobs = await videoQueries.getAllVideoJobs();
  res.json(jobs.map((j) => ({ ...j, result: safeParse(j.result) })));
});

router.get('/status/:jobId', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const job = await videoQueries.getVideoJob(Number(req.params.jobId));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ ...job, result: safeParse(job.result) });
});

router.get('/campaign/:campaignId', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const jobs = await videoQueries.getVideoJobs(req.params.campaignId);
  res.json(
    jobs.map((j) => ({ ...j, result: safeParse(j.result) }))
  );
});

router.get('/download/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(videosDir, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Support range requests so <video> can seek and determine duration
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filepath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    fs.createReadStream(filepath).pipe(res);
  }
});

router.get('/download-all/:campaignId', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const jobs = videoQueries
    .getVideoJobs(req.params.campaignId)
    .filter((j) => j.status === 'completed');
  if (!jobs.length) return res.status(404).json({ error: 'No completed videos' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=campaign_${req.params.campaignId}_videos.zip`
  );

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  jobs.forEach((job) => {
    if (job.result) {
      const result = typeof job.result === 'string' ? safeParse(job.result) : job.result;
      if (result.filename) {
        const filepath = path.join(videosDir, result.filename);
        if (fs.existsSync(filepath)) {
          archive.file(filepath, { name: result.filename });
        }
      }
    }
  });

  archive.finalize();
});

router.delete('/all', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const jobs = await videoQueries.getAllVideoJobs();
  let filesDeleted = 0;
  for (const job of jobs) {
    if (job.result) {
      const result = safeParse(job.result);
      if (result?.filename) {
        const filepath = path.join(videosDir, result.filename);
        try { if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); filesDeleted++; } } catch {}
      }
    }
  }
  await videoQueries.deleteAllVideoJobs();
  res.json({ deleted: jobs.length, filesDeleted });
});

router.delete('/:jobId', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const job = await videoQueries.getVideoJob(Number(req.params.jobId));
  if (job?.result) {
    const result = typeof job.result === 'string' ? safeParse(job.result) : job.result;
    if (result.filename) {
      const filepath = path.join(videosDir, result.filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
  }
  await videoQueries.deleteVideoJob(Number(req.params.jobId));
  res.json({ deleted: true });
});

// POST /analyze-hook — analyze a single hook text
router.post('/analyze-hook', async (req, res) => {
  const { hook } = req.body;
  if (!hook) return res.status(400).json({ error: 'hook required' });

  try {
    const { text } = await generateTextWithClaude(`You are a viral marketing expert. Analyze this video hook for effectiveness:

"${hook}"

Return a JSON object with this exact structure:
{
  "score": <number 1-10>,
  "strengths": [<strength1>, <strength2>],
  "weaknesses": [<weakness1>],
  "improved_versions": [<improved hook 1>, <improved hook 2>, <improved hook 3>]
}

Only return the JSON, no markdown.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse hook analysis' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /predict-performance — predict campaign performance
router.post('/predict-performance', async (req, res) => {
  const { product, angles, script_count } = req.body;

  try {
    const { text } = await generateTextWithClaude(`You are a video marketing performance analyst. Predict performance for this campaign:

Product: ${product || 'Unknown'}
Number of angles: ${angles || 1}
Scripts generated: ${script_count || 1}

Return JSON with this exact structure:
{
  "viral_score": <number 1-100>,
  "predicted_ctr": "<percentage like '3.2%'>",
  "predicted_roas": "<like '4.2x'>",
  "strengths": [<str1>, <str2>],
  "risks": [<risk1>],
  "top_recommendation": "<one actionable tip>"
}

Only return the JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse performance prediction' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /lipsync — generate TTS from voiceover text, then lip-sync it onto an existing video clip
router.post('/lipsync', async (req, res) => {
  const { voText, videoUrl, localPath, voiceId } = req.body;
  if (!voText) return res.status(400).json({ success: false, error: 'voText is required' });

  // WaveSpeed needs a public HTTPS URL for the source video.
  // Prefer the CDN URL (videoUrl) — it's already public.
  // Fall back to building a URL from localPath using our server's public address.
  let publicVideoUrl = videoUrl || null;
  if (!publicVideoUrl && localPath) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    publicVideoUrl = `${proto}://${host}${localPath}`;
  }
  if (!publicVideoUrl) {
    return res.status(400).json({ success: false, error: 'No accessible video URL — try regenerating the scene first' });
  }

  try {
    const ttsService = require('../services/tts');
    const lipsyncService = require('../services/lipsync');

    // Step 1: text → audio
    const audioUrl = await ttsService.generateSpeech(voText, { voice: voiceId || 'Calm_Woman' });

    // Step 2: video + audio → lip-synced video
    const result = await lipsyncService.syncLips(publicVideoUrl, audioUrl);
    if (!result.success) return res.json(result);

    // Step 3: download lip-synced video to local storage
    const filename = `lipsync_${Date.now()}.mp4`;
    const filepath = path.join(videosDir, filename);
    try {
      const dl = await fetch(result.videoUrl);
      if (dl.ok) {
        const buf = Buffer.from(await dl.arrayBuffer());
        if (buf.length > 0) {
          fs.writeFileSync(filepath, buf);
          result.localPath = `/videos/${filename}`;
          result.filename = filename;
        }
      }
    } catch (dlErr) {
      console.error('[LipSync] download failed, using remote URL:', dlErr.message);
    }

    res.json(result);
  } catch (error) {
    console.error('[LipSync route]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /test-wavespeed — fires a minimal text-to-video job and returns the raw WaveSpeed response
// Use this to diagnose connectivity/auth issues without waiting for polling
router.get('/test-wavespeed', async (req, res) => {
  const wavespeed = require('../services/wavespeed');
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) return res.json({ error: 'WAVESPEED_API_KEY not set', env: Object.keys(process.env).filter(k => k.includes('WAVE')) });

  try {
    const endpoint = 'kwaivgi/kling-v3.0-pro/text-to-video';
    const response = await fetch(`https://api.wavespeed.ai/api/v3/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A red apple on a white table.', duration: 3, aspect_ratio: '9:16', cfg_scale: 0.5 }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    res.json({ status: response.status, ok: response.ok, data, keyPrefix: apiKey.slice(0, 8) + '...' });
  } catch (err) {
    res.json({ fetchError: err.message, cause: err.cause?.message || err.cause?.code || null });
  }
});

// GET /test-poll/:taskId — poll a WaveSpeed task once and return the raw status
router.get('/test-poll/:taskId', async (req, res) => {
  const apiKey = process.env.WAVESPEED_API_KEY;
  try {
    const response = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${req.params.taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json();
    res.json({ status: response.status, data });
  } catch (err) {
    res.json({ fetchError: err.message, cause: err.cause?.message || err.cause?.code || null });
  }
});

// POST /recover/:jobId — attempt to recover a timed-out video from WaveSpeed
router.post('/recover/:jobId', async (req, res) => {
  const wsId = req.workspace.id;
  const videoQueries = getVideoQueries(wsId);
  const job = await videoQueries.getVideoJob(Number(req.params.jobId));
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const result = safeParse(job.result);
  const taskId = result?.taskId;
  if (!taskId) return res.status(400).json({ error: 'No task ID saved — cannot recover this job' });

  try {
    const wavespeed = require('../services/wavespeed');
    const check = await wavespeed.checkTask(taskId);

    if (check.success && check.videoUrl) {
      // Download and save the video
      const filename = `recovered_${job.id}_${Date.now()}.mp4`;
      const filepath = path.join(videosDir, filename);
      try {
        await videoManager.downloadVideo(check.videoUrl, filepath);
        check.localPath = `/videos/${filename}`;
        check.filename = filename;
      } catch (dlErr) {
        console.error('[Recover] Download failed, using remote URL:', dlErr.message);
        check.localPath = null;
        check.filename = null;
      }
      await videoQueries.updateVideoJob(job.id, 'completed', check);
      return res.json({ success: true, recovered: true, result: check });
    }

    res.json({ success: false, error: check.error, status: check.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /music-search — proxy Pixabay audio API to keep key server-side
router.get('/music-search', async (req, res) => {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return res.json({ hits: [], note: 'PIXABAY_API_KEY not configured' });

  const q = req.query.q || '';
  const page = req.query.page || 1;
  try {
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(q)}&media_type=music&per_page=20&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    // Normalize to simple shape for frontend
    const hits = (data.hits || []).map(h => ({
      title: h.tags || h.user,
      duration: h.duration,
      audio: h.audio || h.previewURL || h.videos?.medium?.url,
      previewUrl: h.previewURL || h.audio,
      user: h.user,
    }));
    res.json({ hits, total: data.totalHits || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message, hits: [] });
  }
});

// GET /stock-videos — proxy Pixabay video API
router.get('/stock-videos', async (req, res) => {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return res.json({ hits: [], note: 'PIXABAY_API_KEY not configured' });
  const q = req.query.q || '';
  const page = req.query.page || 1;
  try {
    const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(q)}&per_page=20&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    const hits = (data.hits || []).map(h => ({
      id: h.id,
      thumbnail: h.videos?.tiny?.thumbnail || h.userImageURL,
      preview: h.videos?.tiny?.url || h.videos?.small?.url,
      url: h.videos?.medium?.url || h.videos?.small?.url,
      duration: h.duration,
      tags: h.tags,
      user: h.user,
      width: h.videos?.medium?.width || 1920,
      height: h.videos?.medium?.height || 1080,
    }));
    res.json({ hits, total: data.totalHits || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message, hits: [] });
  }
});

// GET /stock-images — proxy Pixabay image API
router.get('/stock-images', async (req, res) => {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return res.json({ hits: [], note: 'PIXABAY_API_KEY not configured' });
  const q = req.query.q || '';
  const page = req.query.page || 1;
  try {
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(q)}&image_type=photo&per_page=20&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    const hits = (data.hits || []).map(h => ({
      id: h.id,
      thumbnail: h.previewURL,
      url: h.largeImageURL || h.webformatURL,
      tags: h.tags,
      user: h.user,
      width: h.imageWidth,
      height: h.imageHeight,
    }));
    res.json({ hits, total: data.totalHits || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message, hits: [] });
  }
});

module.exports = router;

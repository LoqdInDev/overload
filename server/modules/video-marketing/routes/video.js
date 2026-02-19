const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const videoManager = require('../services/videoManager');
const { videoQueries } = require('../db/queries');
const { generateWithClaude } = require('../../../services/claude');
const { getVideoPromptOptimizerPrompt } = require('../prompts/videoPromptOptimizer');

const router = express.Router();

router.post('/generate-scene', async (req, res) => {
  const { campaignId, scene, productImages, provider } = req.body;
  try {
    const jobId = videoQueries.createVideoJob(
      campaignId,
      scene.scene_number,
      'processing',
      scene.ai_video_prompt,
      provider || process.env.VIDEO_PROVIDER
    );
    res.json({ jobId, status: 'processing' });

    const result = await videoManager.generateScene(scene, productImages || [], provider);
    videoQueries.updateVideoJob(jobId, result.success ? 'completed' : 'failed', result);
  } catch (error) {
    console.error('Video scene generation error:', error);
  }
});

router.post('/generate-all', async (req, res) => {
  const { campaignId, scenes, productImages, provider } = req.body;

  const jobs = scenes.map((scene) => ({
    jobId: videoQueries.createVideoJob(
      campaignId,
      scene.scene_number,
      'queued',
      scene.ai_video_prompt,
      provider || process.env.VIDEO_PROVIDER
    ),
    sceneNumber: scene.scene_number,
  }));

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
  const { campaignId, hookText, productImageUrl, provider } = req.body;
  const scene = {
    scene_number: 0,
    generation_method: productImageUrl ? 'image-to-video' : 'text-to-video',
    source_image_index: productImageUrl ? 0 : null,
    ai_video_prompt: hookText,
    ai_video_settings: { duration: 5, aspectRatio: '9:16', resolution: '720p' },
  };

  const jobId = videoQueries.createVideoJob(
    campaignId || 'quick',
    0,
    'processing',
    hookText,
    provider || process.env.VIDEO_PROVIDER
  );
  res.json({ jobId, status: 'processing' });

  try {
    const result = await videoManager.generateScene(
      scene,
      productImageUrl ? [productImageUrl] : []
    );
    videoQueries.updateVideoJob(jobId, result.success ? 'completed' : 'failed', result);
  } catch (error) {
    videoQueries.updateVideoJob(jobId, 'failed', { error: error.message });
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

router.get('/status/:jobId', (req, res) => {
  const job = videoQueries.getVideoJob(Number(req.params.jobId));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ ...job, result: job.result ? JSON.parse(job.result) : null });
});

router.get('/campaign/:campaignId', (req, res) => {
  const jobs = videoQueries.getVideoJobs(req.params.campaignId);
  res.json(
    jobs.map((j) => ({ ...j, result: j.result ? JSON.parse(j.result) : null }))
  );
});

router.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(process.cwd(), 'videos', filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });
  res.download(filepath);
});

router.get('/download-all/:campaignId', (req, res) => {
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
      const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
      if (result.filename) {
        const filepath = path.join(process.cwd(), 'videos', result.filename);
        if (fs.existsSync(filepath)) {
          archive.file(filepath, { name: result.filename });
        }
      }
    }
  });

  archive.finalize();
});

router.delete('/:jobId', (req, res) => {
  const job = videoQueries.getVideoJob(Number(req.params.jobId));
  if (job?.result) {
    const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
    if (result.filename) {
      const filepath = path.join(process.cwd(), 'videos', result.filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
  }
  videoQueries.deleteVideoJob(Number(req.params.jobId));
  res.json({ deleted: true });
});

module.exports = router;

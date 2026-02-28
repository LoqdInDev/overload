import { useState, useEffect, useRef, useCallback } from 'react';
import { EmptyState } from './AngleCards';

const API_BASE = import.meta.env.VITE_API_URL || '';

const COST_PER_SCENE = {
  wavespeed: 0.05,
  kling: 0.28,
};

function costLabel(provider, count) {
  const rate = COST_PER_SCENE[provider] || 0.05;
  return `~$${(rate * count).toFixed(2)} for ${count} scene${count !== 1 ? 's' : ''}`;
}

export default function VideoGenerator({ storyboards, campaignId, productProfile }) {
  const [provider, setProvider] = useState('wavespeed');
  const [optimizePrompts, setOptimizePrompts] = useState(false);
  const [jobs, setJobs] = useState({});
  const [editPrompts, setEditPrompts] = useState({});
  const pollRef = useRef(null);

  const allScenes = (storyboards || []).flatMap((board, bi) =>
    (board.scenes || []).map((scene, si) => ({
      ...scene,
      _boardIndex: bi,
      _sceneIndex: si,
      _key: `${bi}-${si}`,
      generation_method: scene.generation_method || 'text-to-video',
      source_image_index: scene.source_image_index ?? null,
      ai_video_settings: scene.ai_video_settings || { duration: 5, aspectRatio: '9:16', resolution: '720p' },
    }))
  );

  const activeJobIds = Object.entries(jobs)
    .filter(([, j]) => j.status === 'processing' || j.status === 'queued')
    .map(([id]) => id);

  const pollJobs = useCallback(async () => {
    for (const jobId of activeJobIds) {
      try {
        const res = await fetch(`/api/video/status/${jobId}`);
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
          setJobs((prev) => ({
            ...prev,
            [jobId]: { ...prev[jobId], ...data, status: data.status },
          }));
        }
      } catch (e) { /* ignore */ }
    }
  }, [activeJobIds]);

  useEffect(() => {
    if (activeJobIds.length > 0) {
      pollRef.current = setInterval(pollJobs, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [activeJobIds.length, pollJobs]);

  useEffect(() => {
    if (!campaignId) return;
    fetch(`/api/video/campaign/${campaignId}`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        data.forEach((j) => { map[j.id] = j; });
        setJobs(map);
      })
      .catch(() => {});
  }, [campaignId]);

  const getPromptForScene = (scene) => {
    return editPrompts[scene._key] ?? scene.ai_video_prompt;
  };

  const generateScene = async (scene) => {
    let prompt = getPromptForScene(scene);

    if (optimizePrompts && productProfile) {
      try {
        const optRes = await fetch(`${API_BASE}/api/video/optimize-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneDescription: prompt, productProfile, videoProvider: provider }),
        });
        const optData = await optRes.json();
        if (optData.optimizedPrompt) prompt = optData.optimizedPrompt;
      } catch (e) { /* use original */ }
    }

    const scenePayload = { ...scene, ai_video_prompt: prompt };
    delete scenePayload._boardIndex;
    delete scenePayload._sceneIndex;
    delete scenePayload._key;

    const res = await fetch(`${API_BASE}/api/video/generate-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, scene: scenePayload, productImages: productProfile?.images || [], provider }),
    });
    const data = await res.json();
    if (data.jobId) {
      setJobs((prev) => ({
        ...prev,
        [data.jobId]: { id: data.jobId, scene_number: scene.scene_number, status: 'processing', provider },
      }));
    }
  };

  const generateAll = async () => {
    const scenes = allScenes.map((scene) => {
      const payload = { ...scene, ai_video_prompt: getPromptForScene(scene) };
      delete payload._boardIndex;
      delete payload._sceneIndex;
      delete payload._key;
      return payload;
    });

    const res = await fetch(`${API_BASE}/api/video/generate-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, scenes, productImages: productProfile?.images || [], provider }),
    });
    const data = await res.json();
    if (data.jobs) {
      const map = {};
      data.jobs.forEach((j) => {
        map[j.jobId] = { id: j.jobId, scene_number: j.sceneNumber, status: 'queued', provider };
      });
      setJobs((prev) => ({ ...prev, ...map }));
    }
  };

  const getJobForScene = (sceneNumber) => {
    return Object.values(jobs)
      .filter((j) => j.scene_number === sceneNumber)
      .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
  };

  const deleteJob = async (jobId) => {
    await fetch(`/api/video/${jobId}`, { method: 'DELETE' });
    setJobs((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  };

  const clearFailedAndQueued = async () => {
    const toClear = Object.values(jobs).filter((j) => j.status === 'failed' || j.status === 'queued');
    for (const job of toClear) {
      await fetch(`/api/video/${job.id}`, { method: 'DELETE' });
    }
    setJobs((prev) => {
      const next = { ...prev };
      toClear.forEach((j) => delete next[j.id]);
      return next;
    });
  };

  const completedCount = Object.values(jobs).filter((j) => j.status === 'completed').length;
  const failedCount = Object.values(jobs).filter((j) => j.status === 'failed').length;
  const queuedCount = Object.values(jobs).filter((j) => j.status === 'queued').length;
  const totalJobs = Object.values(jobs).filter((j) => j.status !== 'failed').length;

  if (!storyboards?.length) {
    return (
      <EmptyState
        title="Video Generation"
        desc="Generate a storyboard first, then create AI videos for each scene."
        buttonText="Go to Storyboards"
        onClick={() => {}}
        disabled
        icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Top controls */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <label className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="glass rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 bg-transparent cursor-pointer"
            >
              <option value="wavespeed" className="bg-gray-900">WaveSpeedAI (Kling v3.0 Pro)</option>
              <option value="kling" className="bg-gray-900">Kling (Direct)</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-gray-400 cursor-pointer group">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              optimizePrompts ? 'border-violet-400 bg-violet-500/20' : 'border-gray-700 group-hover:border-gray-600'
            }`}>
              {optimizePrompts && (
                <svg className="w-3 h-3 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={optimizePrompts} onChange={(e) => setOptimizePrompts(e.target.checked)} className="hidden" />
            Optimize prompts with AI
          </label>

          <span className="text-xs text-gray-600 glass px-3 py-1.5 rounded-lg">
            Est. {costLabel(provider, allScenes.length)}
          </span>

          <div className="ml-auto flex gap-2">
            {(failedCount > 0 || queuedCount > 0) && (
              <button onClick={clearFailedAndQueued} className="btn-ghost text-red-400 hover:text-red-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Clear {failedCount > 0 && queuedCount > 0 ? `Failed & Queued (${failedCount + queuedCount})` : failedCount > 0 ? `Failed (${failedCount})` : `Queued (${queuedCount})`}
              </button>
            )}
            <button onClick={generateAll} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
              Generate All ({allScenes.length})
            </button>
            {completedCount > 0 && (
              <a href={`/api/video/download-all/${campaignId}`} className="btn-ghost">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download ZIP
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalJobs > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{completedCount} of {totalJobs} scenes completed</span>
            <span className="font-mono">{Math.round((completedCount / totalJobs) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500 rounded-full"
              style={{ width: `${totalJobs ? (completedCount / totalJobs) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Scene cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {allScenes.map((scene) => {
          const job = getJobForScene(scene.scene_number);
          const status = job?.status || 'idle';
          const result = job?.result;

          return (
            <div key={scene._key} className="glass rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono bg-violet-500/10 text-violet-300 px-2.5 py-1 rounded-lg font-medium">
                    Scene {scene.scene_number}
                  </span>
                  <span className="text-xs text-gray-600">{scene.timestamp}</span>
                  <span className="text-[10px] glass px-2 py-0.5 rounded-md text-gray-500">
                    {scene.generation_method}
                  </span>
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Video preview or placeholder */}
              {status === 'completed' && result?.localPath ? (
                <div className="bg-black">
                  <video src={result.localPath} controls className="w-full max-h-64 object-contain" />
                </div>
              ) : status === 'processing' || status === 'queued' ? (
                <div className="h-32 bg-gradient-to-br from-violet-950/20 to-fuchsia-950/10 flex items-center justify-center">
                  <div className="flex items-center gap-2.5 text-amber-400 text-sm">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating video...
                  </div>
                </div>
              ) : null}

              {status === 'failed' && (
                <div className="px-4 py-3 bg-red-500/5 border-b border-red-500/10">
                  <p className="text-xs text-red-400">{result?.error || 'Generation failed'}</p>
                </div>
              )}

              {/* Prompt editor */}
              <div className="p-4">
                <label className="text-[10px] text-gray-600 block mb-1.5 uppercase tracking-wider font-medium">AI Video Prompt</label>
                <textarea
                  value={getPromptForScene(scene)}
                  onChange={(e) => setEditPrompts((prev) => ({ ...prev, [scene._key]: e.target.value }))}
                  rows={3}
                  className="w-full glass rounded-xl px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500/50 resize-none bg-transparent placeholder-gray-600 leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 pb-4">
                <button
                  onClick={() => generateScene(scene)}
                  disabled={status === 'processing' || status === 'queued'}
                  className="px-4 py-2 text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 rounded-xl font-medium transition-all shadow-lg shadow-violet-500/10 disabled:shadow-none"
                >
                  {status === 'failed' ? 'Retry' : status === 'completed' ? 'Regenerate' : 'Generate'}
                </button>
                {status === 'failed' && provider !== 'kling' && (
                  <button
                    onClick={() => {
                      const prev = provider;
                      setProvider('kling');
                      generateScene(scene);
                      setProvider(prev);
                    }}
                    className="px-4 py-2 text-xs glass text-amber-400 hover:text-amber-300 rounded-xl font-medium transition-colors"
                  >
                    Try Kling
                  </button>
                )}
                {status === 'completed' && result?.localPath && (
                  <a
                    href={result.localPath}
                    download
                    className="px-4 py-2 text-xs glass text-gray-400 hover:text-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Download
                  </a>
                )}
                {(status === 'failed' || status === 'queued') && job?.id && (
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="ml-auto px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    idle: 'bg-gray-500/10 text-gray-500',
    queued: 'bg-amber-500/10 text-amber-400',
    processing: 'bg-amber-500/10 text-amber-400 animate-pulse',
    completed: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
  };

  const dots = {
    idle: 'bg-gray-500',
    queued: 'bg-amber-400',
    processing: 'bg-amber-400',
    completed: 'bg-emerald-400',
    failed: 'bg-red-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${styles[status] || styles.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.idle}`} />
      {status}
    </span>
  );
}

import { useState } from 'react';
import { EmptyState } from './AngleCards';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function StoryboardView({ storyboards, onGenerate, generating, hasScripts, campaignId, productImages, onGoToVideos }) {
  const [activeBoard, setActiveBoard] = useState(0);
  const [copiedPrompt, setCopiedPrompt] = useState(null);
  const [sceneVideoStatus, setSceneVideoStatus] = useState({});

  const copyPrompt = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(id);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const generateSceneVideo = async (scene, sceneKey) => {
    setSceneVideoStatus(prev => ({ ...prev, [sceneKey]: 'loading' }));
    try {
      const res = await fetch(`${API_BASE}/api/video/generate-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          scene: {
            ...scene,
            generation_method: scene.generation_method || 'text-to-video',
            source_image_index: scene.source_image_index ?? null,
            ai_video_settings: scene.ai_video_settings || { duration: 5, aspectRatio: '9:16', resolution: '720p' },
          },
          productImages: productImages || [],
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        setSceneVideoStatus(prev => ({ ...prev, [sceneKey]: 'processing' }));
        const poll = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/video/status/${data.jobId}`);
            const statusData = await statusRes.json();
            if (statusData.status === 'completed') {
              clearInterval(poll);
              setSceneVideoStatus(prev => ({
                ...prev,
                [sceneKey]: { status: 'done', videoPath: statusData.result?.localPath },
              }));
            } else if (statusData.status === 'failed') {
              clearInterval(poll);
              setSceneVideoStatus(prev => ({ ...prev, [sceneKey]: 'failed' }));
            }
          } catch (e) { /* ignore */ }
        }, 3000);
      }
    } catch (e) {
      setSceneVideoStatus(prev => ({ ...prev, [sceneKey]: 'failed' }));
    }
  };

  if (!storyboards?.length) {
    return (
      <EmptyState
        title="Visual Storyboards"
        desc="Create scene-by-scene storyboards with AI video prompts, camera directions, and visual descriptions."
        buttonText={!hasScripts ? 'Generate scripts first' : generating ? 'Generating...' : 'Generate Storyboards'}
        onClick={onGenerate}
        disabled={generating || !hasScripts}
        icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    );
  }

  const board = storyboards[activeBoard];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-100">Storyboards</h3>
        <div className="flex gap-2">
          {onGoToVideos && (
            <button onClick={onGoToVideos} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Generate Videos
            </button>
          )}
          <button onClick={onGenerate} disabled={generating} className="btn-ghost">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Regenerate
          </button>
        </div>
      </div>

      {storyboards.length > 1 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {storyboards.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveBoard(i)}
              className={`px-4 py-2 text-xs rounded-xl whitespace-nowrap transition-all duration-200 font-medium ${
                i === activeBoard ? 'bg-violet-500/20 text-violet-300 shadow-sm' : 'glass text-gray-500 hover:text-gray-300'
              }`}
            >
              Storyboard {i + 1}
            </button>
          ))}
        </div>
      )}

      {board && (
        <div>
          {/* Board meta */}
          <div className="flex flex-wrap gap-2 mb-5">
            {board.overall_pacing && (
              <span className="text-[10px] glass px-3 py-1.5 rounded-lg text-gray-400 font-medium">
                Pacing: {board.overall_pacing}
              </span>
            )}
            {board.color_grade && (
              <span className="text-[10px] glass px-3 py-1.5 rounded-lg text-gray-400 font-medium">
                Color: {board.color_grade}
              </span>
            )}
            {board.aspect_ratio && (
              <span className="text-[10px] glass px-3 py-1.5 rounded-lg text-gray-400 font-medium">
                {board.aspect_ratio}
              </span>
            )}
          </div>

          {/* Scenes grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {board.scenes?.map((scene, i) => {
              const sceneKey = `${activeBoard}-${i}`;
              const vidStatus = sceneVideoStatus[sceneKey];

              return (
                <div key={i} className="glass rounded-2xl overflow-hidden card-hover">
                  {/* Scene visual or video preview */}
                  {typeof vidStatus === 'object' && vidStatus.status === 'done' && vidStatus.videoPath ? (
                    <div className="bg-black">
                      <video src={vidStatus.videoPath} controls className="w-full max-h-48 object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-[9/16] max-h-48 bg-gradient-to-br from-violet-950/40 to-fuchsia-950/30 flex items-center justify-center p-4 relative">
                      <div className="text-center">
                        <span className="text-3xl font-bold text-gray-700/60">Scene {scene.scene_number}</span>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">{scene.visual_description}</p>
                      </div>
                      <span className="absolute top-2.5 left-2.5 text-xs font-mono bg-black/40 text-violet-300 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                        {scene.timestamp}
                      </span>
                      {scene.text_overlay?.text && (
                        <span
                          className={`absolute ${
                            scene.text_overlay.position === 'top' ? 'top-8' : scene.text_overlay.position === 'bottom' ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
                          } left-2 right-2 text-center text-xs font-bold text-white bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm`}
                        >
                          {scene.text_overlay.text}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Scene details */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="glass px-2 py-0.5 rounded-md text-gray-400">{scene.camera_direction}</span>
                      <span className="glass px-2 py-0.5 rounded-md text-gray-400">{scene.camera_movement}</span>
                    </div>
                    <p className="text-gray-400 leading-relaxed">{scene.subject_action}</p>
                    {scene.transition_to_next && (
                      <p className="text-gray-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        {scene.transition_to_next}
                      </p>
                    )}

                    {/* AI Video Prompt */}
                    {scene.ai_video_prompt && (
                      <div className="pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">AI Video Prompt</span>
                          <button
                            onClick={() => copyPrompt(scene.ai_video_prompt, sceneKey)}
                            className="text-violet-400 hover:text-violet-300 transition-colors text-[10px] font-medium"
                          >
                            {copiedPrompt === sceneKey ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-gray-500 line-clamp-3 leading-relaxed">{scene.ai_video_prompt}</p>
                      </div>
                    )}

                    {/* Generate Video button */}
                    <div className="pt-3 border-t border-white/5">
                      {vidStatus === 'loading' || vidStatus === 'processing' ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-400">
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating video...
                        </span>
                      ) : vidStatus === 'failed' ? (
                        <button
                          onClick={() => generateSceneVideo(scene, sceneKey)}
                          className="text-red-400 hover:text-red-300 transition-colors font-medium"
                        >
                          Retry Video
                        </button>
                      ) : typeof vidStatus === 'object' && vidStatus.status === 'done' ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          Video ready
                        </span>
                      ) : (
                        <button
                          onClick={() => generateSceneVideo(scene, sceneKey)}
                          className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                          Generate Video
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

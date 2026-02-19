import { useState, useEffect } from 'react';
import { EmptyState } from './AngleCards';

const FILTERS = ['All', 'completed', 'processing', 'queued', 'failed'];

export default function VideoGallery({ campaignId }) {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [modalVideo, setModalVideo] = useState(null);

  const loadJobs = () => {
    if (!campaignId) return;
    fetch(`/api/video/campaign/${campaignId}`)
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const filtered = filter === 'All' ? jobs : jobs.filter((j) => j.status === filter);
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedOrQueued = jobs.filter((j) => j.status === 'failed' || j.status === 'queued');

  const deleteJob = async (jobId) => {
    await fetch(`/api/video/${jobId}`, { method: 'DELETE' });
    loadJobs();
  };

  const clearFailedAndQueued = async () => {
    for (const job of failedOrQueued) {
      await fetch(`/api/video/${job.id}`, { method: 'DELETE' });
    }
    loadJobs();
  };

  if (!jobs.length) {
    return (
      <EmptyState
        title="Video Gallery"
        desc="No videos generated yet. Go to the Video Generator tab to create videos from your storyboards."
        buttonText="No videos yet"
        onClick={() => {}}
        disabled
        icon="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-100">Video Gallery</h3>
          <p className="text-sm text-gray-500 mt-1">{completedCount} video{completedCount !== 1 ? 's' : ''} ready</p>
        </div>
        <div className="flex gap-2">
          {failedOrQueued.length > 0 && (
            <button onClick={clearFailedAndQueued} className="btn-ghost text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear Failed/Queued ({failedOrQueued.length})
            </button>
          )}
          {completedCount > 0 && (
            <a href={`/api/video/download-all/${campaignId}`} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download All
            </a>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs rounded-xl capitalize whitespace-nowrap transition-all duration-200 font-medium ${
              filter === f
                ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                : 'glass text-gray-500 hover:text-gray-300'
            }`}
          >
            {f} {f !== 'All' && `(${jobs.filter((j) => j.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((job) => {
          const result = job.result;
          const videoPath = result?.localPath;

          return (
            <div key={job.id} className="glass rounded-2xl overflow-hidden group card-hover">
              {/* Thumbnail / preview */}
              {job.status === 'completed' && videoPath ? (
                <div
                  className="aspect-[9/16] max-h-48 bg-black cursor-pointer relative"
                  onClick={() => setModalVideo(videoPath)}
                >
                  <video src={videoPath} className="w-full h-full object-contain" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-[9/16] max-h-48 bg-gradient-to-br from-violet-950/30 to-fuchsia-950/20 flex items-center justify-center">
                  {job.status === 'processing' || job.status === 'queued' ? (
                    <svg className="animate-spin w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="text-xs text-red-400 font-medium">Failed</span>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-300">Scene {job.scene_number}</span>
                  <StatusDot status={job.status} />
                </div>
                <span className="text-[10px] text-gray-600 font-medium">{job.provider}</span>

                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5">
                  {videoPath && (
                    <a href={videoPath} download className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="text-xs text-gray-600 hover:text-red-400 ml-auto transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal player */}
      {modalVideo && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setModalVideo(null)}
        >
          <div className="max-w-lg w-full mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <video src={modalVideo} controls autoPlay className="w-full rounded-2xl shadow-2xl" />
            <button
              onClick={() => setModalVideo(null)}
              className="mt-4 w-full py-2.5 glass rounded-xl text-sm text-gray-400 hover:text-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    completed: 'bg-emerald-400',
    failed: 'bg-red-400',
    processing: 'bg-amber-400 animate-pulse',
    queued: 'bg-amber-400',
  };

  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-gray-500'}`} />
      <span className={`text-[10px] capitalize ${
        status === 'completed' ? 'text-emerald-400' :
        status === 'failed' ? 'text-red-400' :
        'text-amber-400'
      }`}>
        {status}
      </span>
    </span>
  );
}

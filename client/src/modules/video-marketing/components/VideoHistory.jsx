import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { fetchJSON } from '../../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function VideoCard({ job, dark, onDelete }) {
  const result = typeof job.result === 'string' ? (() => { try { return JSON.parse(job.result); } catch { return null; } })() : job.result;
  const localPath = result?.localPath;
  const remoteUrl = result?.videoUrl;
  const videoSrc = localPath ? `${API_BASE}${localPath}` : remoteUrl || null;
  const filename = result?.filename || `video_${job.id}.mp4`;
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/api/video/${job.id}`, { method: 'DELETE', credentials: 'include' });
      onDelete(job.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!videoSrc) return;
    const a = document.createElement('a');
    a.href = videoSrc;
    a.download = filename;
    a.click();
  };

  return (
    <div className={`rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
      dark ? 'bg-white/[0.03] border border-white/[0.06] hover:border-white/10' : 'bg-white border border-[#e8e0d4] hover:border-[#d4c8b8]'
    }`}>
      {/* Video / placeholder */}
      <div className={`relative aspect-[9/16] w-full bg-black flex items-center justify-center overflow-hidden ${isFailed ? 'opacity-40' : ''}`}
        style={{ maxHeight: 240 }}
      >
        {isCompleted && videoSrc ? (
          <video
            src={videoSrc}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
            playsInline
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className={`w-10 h-10 ${isFailed ? 'text-red-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {isFailed
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              }
            </svg>
            <span className={`text-xs ${isFailed ? 'text-red-400' : 'text-gray-500'}`}>
              {isFailed ? 'Failed' : job.status}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Status + time */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isCompleted
              ? dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              : isFailed
                ? dark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-500'
                : dark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
          }`}>
            {isCompleted ? 'Completed' : isFailed ? 'Failed' : job.status}
          </span>
          <span className={`text-[10px] ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>{timeAgo(job.created_at)}</span>
        </div>

        {/* Prompt */}
        {job.prompt && (
          <p className={`text-xs leading-relaxed line-clamp-2 ${dark ? 'text-gray-400' : 'text-[#5C5650]'}`}>
            {job.prompt}
          </p>
        )}

        {/* Campaign */}
        {job.product_name && (
          <p className={`text-[10px] truncate ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>
            {job.product_name}
          </p>
        )}

        {/* Error */}
        {isFailed && result?.error && (
          <p className="text-[10px] text-red-400 line-clamp-2">{result.error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {isCompleted && videoSrc && (
            <button
              onClick={handleDownload}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                dark ? 'bg-white/[0.05] hover:bg-white/[0.08] text-gray-300' : 'bg-[#f0ebe4] hover:bg-[#e8e0d4] text-[#332F2B]'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`p-1.5 rounded-lg transition-all ${
              dark ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10' : 'text-[#94908A] hover:text-red-500 hover:bg-red-50'
            } ${deleting ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoHistory({ onClose }) {
  const { dark } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | completed | failed

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON('/api/video/history');
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id) => setJobs(prev => prev.filter(j => j.id !== id));

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? 'border-white/[0.06]' : 'border-[#e8e0d4]'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]' : 'text-[#94908A] hover:text-[#332F2B] hover:bg-[#f0ebe4]'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className={`text-base font-semibold ${dark ? 'text-white' : 'text-[#1a1714]'}`}>Video History</h2>
            <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
              {jobs.length} total · {completedCount} completed · {failedCount} failed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          {['all', 'completed', 'failed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-all ${
                filter === f
                  ? dark ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-[#C45D3E]/10 text-[#C45D3E] border border-[#C45D3E]/20'
                  : dark ? 'text-gray-500 hover:text-gray-300' : 'text-[#94908A] hover:text-[#332F2B]'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={load}
            className={`p-1.5 rounded-lg transition-all ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]' : 'text-[#94908A] hover:text-[#332F2B] hover:bg-[#f0ebe4]'}`}
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`rounded-2xl aspect-[9/16] animate-pulse ${dark ? 'bg-white/[0.04]' : 'bg-[#f0ebe4]'}`} style={{ maxHeight: 280 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dark ? 'bg-white/[0.04]' : 'bg-[#f0ebe4]'}`}>
              <svg className={`w-7 h-7 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className={`text-sm ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
              {filter === 'all' ? 'No videos generated yet' : `No ${filter} videos`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(job => (
              <VideoCard key={job.id} job={job} dark={dark} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

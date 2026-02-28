import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function QuickVideoButton({ hookText, campaignId, productImageUrl }) {
  const [status, setStatus] = useState('idle');
  const [jobId, setJobId] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const generate = async (e) => {
    e.stopPropagation();
    setStatus('loading');
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/video/generate-quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          hookText,
          productImageUrl: productImageUrl || null,
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        setJobId(data.jobId);
      } else {
        setStatus('error');
        setError('No job created');
      }
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  };

  useEffect(() => {
    if (!jobId || status !== 'loading') return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/video/status/${jobId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setVideoPath(data.result?.localPath);
          setStatus('done');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setError(data.result?.error || 'Failed');
          setStatus('error');
        }
      } catch (e) { /* ignore */ }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [jobId, status]);

  if (status === 'done' && videoPath) {
    return (
      <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <video src={videoPath} controls className="h-16 rounded-lg" />
        <a href={videoPath} download className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-medium">
          DL
        </a>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 font-medium" onClick={(e) => e.stopPropagation()}>
        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Video...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={generate}
        className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-medium"
        title={error}
      >
        Retry
      </button>
    );
  }

  return (
    <button
      onClick={generate}
      className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 whitespace-nowrap transition-colors font-medium flex items-center gap-1"
      title="Generate a quick 5s video from this hook"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
      Quick Video
    </button>
  );
}

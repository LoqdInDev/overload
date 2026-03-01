import { useState, useEffect, useRef } from 'react';
import { fetchJSON, postJSON } from '../../../lib/api';

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
      const data = await postJSON('/api/video/generate-quick', {
        campaignId,
        hookText,
        productImageUrl: productImageUrl || null,
      });
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
        const data = await fetchJSON(`/api/video/status/${jobId}`);
        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setVideoPath(data.result?.localPath);
          setStatus('done');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setError(data.result?.error || 'Video generation failed');
          setStatus('error');
        }
      } catch (e) {
        // If polling fails, don't crash — just keep trying
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [jobId, status]);

  if (status === 'done' && videoPath) {
    return (
      <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <video src={videoPath} controls className="h-16 rounded-lg" />
        <a
          href={videoPath}
          download
          className="text-[10px] font-medium transition-colors"
          style={{ color: '#5E8E6E' }}
        >
          DL
        </a>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-medium"
        style={{ color: '#C45D3E' }}
        onClick={(e) => e.stopPropagation()}
      >
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
      className="text-[10px] whitespace-nowrap transition-all font-medium flex items-center gap-1 hover:opacity-80"
      title="Generate a quick 5s video from this hook"
      style={{ color: '#C45D3E' }}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
      Quick Video
    </button>
  );
}

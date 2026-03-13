import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { fetchJSON } from '../../../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function EditorToolbar({ editor, showImport, setShowImport, onSaveLoad, onTemplates }) {
  const { dark } = useTheme();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const modalRef = useRef(null);

  const border = dark ? 'border-white/[0.06]' : 'border-[#e8e0d4]';
  const accent = dark ? 'text-violet-300' : 'text-[#C45D3E]';
  const accentBg = dark ? 'bg-violet-500/15 border-violet-500/20' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20';

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON('/api/video/history');
      setVideos((data || []).filter(v => v.status === 'completed'));
    } catch { setVideos([]); }
    setLoading(false);
  };

  useEffect(() => {
    if (showImport) fetchVideos();
  }, [showImport]);

  const importVideo = (job) => {
    const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
    const localPath = result?.localPath;
    const remoteUrl = result?.videoUrl;
    const url = localPath ? `${API_BASE}${localPath}` : remoteUrl;
    if (!url) return;

    // Generate a thumbnail from the video
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.muted = true;
    video.currentTime = 0.5;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      canvas.getContext('2d').drawImage(video, 0, 0, 160, 90);
      const thumb = canvas.toDataURL('image/jpeg', 0.7);
      editor.addClip(url, video.duration || 5, thumb);
    };
    video.onerror = () => {
      editor.addClip(url, 5, null);
    };
    video.load();
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      editor.addClip(url, video.duration || 5, null);
    };
    video.onerror = () => {
      editor.addClip(url, 5, null);
    };
    video.load();
    e.target.value = '';
  };

  const Btn = ({ onClick, disabled, children, primary }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
        primary
          ? dark
            ? 'bg-violet-600 text-white hover:bg-violet-500'
            : 'bg-[#C45D3E] text-white hover:bg-[#b5533a]'
          : dark
            ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
            : 'text-[#5c5955] hover:text-[#332F2B] hover:bg-[#EDE5DA]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-b ${border} flex-shrink-0 overflow-x-auto ${dark ? 'bg-[#050508]' : 'bg-white/60'}`} style={{ scrollbarWidth: 'none' }}>
        {/* Import */}
        <Btn onClick={() => setShowImport(true)}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Import Video</span>
        </Btn>

        {/* File upload */}
        <label className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex-shrink-0 ${
          dark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-[#5c5955] hover:text-[#332F2B] hover:bg-[#EDE5DA]'
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="hidden sm:inline">Upload File</span>
          <input type="file" accept="video/*" onChange={handleFileImport} className="hidden" />
        </label>

        <div className={`w-px h-5 mx-0.5 sm:mx-1 flex-shrink-0 ${dark ? 'bg-white/10' : 'bg-[#e8e0d4]'}`} />

        {/* Undo/Redo */}
        <Btn onClick={editor.undo} disabled={!editor.canUndo}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
          </svg>
        </Btn>
        <Btn onClick={editor.redo} disabled={!editor.canRedo}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
          </svg>
        </Btn>

        <div className={`w-px h-5 mx-0.5 sm:mx-1 flex-shrink-0 ${dark ? 'bg-white/10' : 'bg-[#e8e0d4]'}`} />

        {/* Save/Load */}
        <Btn onClick={onSaveLoad}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="hidden sm:inline">Projects</span>
        </Btn>

        {/* Templates */}
        <Btn onClick={onTemplates}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <span className="hidden sm:inline">Templates</span>
        </Btn>

        <div className="flex-1 min-w-0" />

        {/* Clip count — hidden on very small screens */}
        <span className={`text-[11px] flex-shrink-0 hidden xs:inline ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
          {editor.clips.length} clip{editor.clips.length !== 1 ? 's' : ''} &middot; {editor.totalDuration.toFixed(1)}s
        </span>

        {/* Export */}
        <Btn primary onClick={() => {}} disabled={editor.clips.length === 0 || exporting}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export'}</span>
        </Btn>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImport(false)}>
          <div
            ref={modalRef}
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[85vh] sm:max-h-[70vh] mx-2 sm:mx-0 rounded-2xl border ${border} ${dark ? 'bg-[#12121a]' : 'bg-white'} flex flex-col overflow-hidden shadow-2xl`}
          >
            <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
              <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-[#332F2B]'}`}>Import from Library</h3>
              <button onClick={() => setShowImport(false)} className={`p-1 rounded-lg ${dark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-[#EDE5DA] text-[#94908A]'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className={`text-center py-12 text-sm ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>Loading videos...</div>
              ) : videos.length === 0 ? (
                <div className={`text-center py-12 text-sm ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                  No completed videos yet. Generate some in Studio first.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {videos.map(v => {
                    const result = typeof v.result === 'string' ? (() => { try { return JSON.parse(v.result); } catch { return null; } })() : v.result;
                    const localPath = result?.localPath;
                    const remoteUrl = result?.videoUrl;
                    const src = localPath ? `${API_BASE}${localPath}` : remoteUrl;
                    return (
                      <button
                        key={v.id}
                        onClick={() => { importVideo(v); setShowImport(false); }}
                        className={`group rounded-xl overflow-hidden border ${border} transition-all hover:scale-[1.02] ${dark ? 'hover:border-violet-500/30' : 'hover:border-[#C45D3E]/30'}`}
                      >
                        <div className="aspect-video bg-black relative">
                          {src ? (
                            <video src={src} className="w-full h-full object-cover" muted preload="metadata" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className={`opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-full text-[11px] font-medium ${dark ? 'bg-violet-600 text-white' : 'bg-[#C45D3E] text-white'}`}>
                              + Add to Timeline
                            </div>
                          </div>
                        </div>
                        <div className={`p-2 text-left ${dark ? 'bg-[#0e0e14]' : 'bg-[#f8f4ef]'}`}>
                          <p className={`text-[10px] truncate ${dark ? 'text-gray-400' : 'text-[#5c5955]'}`}>
                            {v.prompt?.slice(0, 60) || 'Video'}...
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

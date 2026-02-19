import { useState, useEffect } from 'react';

const FORMAT_ICONS = {
  json: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  pdf: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  markdown: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  videos: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
    </svg>
  ),
};

export default function ExportPanel({ campaignId, campaignName }) {
  const [exporting, setExporting] = useState(null);
  const [hasVideos, setHasVideos] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    fetch(`/api/video/campaign/${campaignId}`)
      .then((r) => r.json())
      .then((jobs) => {
        setHasVideos(jobs.some((j) => j.status === 'completed'));
      })
      .catch(() => {});
  }, [campaignId]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const url =
        format === 'videos'
          ? `/api/video/download-all/${campaignId}`
          : `/api/export/${campaignId}/${format}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;

      if (format === 'videos') {
        a.download = `adforge-${campaignName || 'campaign'}-videos.zip`;
      } else {
        const ext = format === 'markdown' ? 'md' : format;
        a.download = `adforge-${campaignName || 'campaign'}.${ext}`;
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Export error:', e);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const formats = [
    {
      id: 'json',
      title: 'JSON Export',
      desc: 'Complete structured data for API integrations and tools.',
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'rgba(59, 130, 246, 0.15)',
      enabled: true,
    },
    {
      id: 'pdf',
      title: 'PDF Brief',
      desc: 'Formatted creative brief document with all campaign sections.',
      gradient: 'from-red-500 to-orange-500',
      glow: 'rgba(239, 68, 68, 0.15)',
      enabled: true,
    },
    {
      id: 'markdown',
      title: 'Markdown',
      desc: 'Markdown file for docs, Notion, or manual review.',
      gradient: 'from-gray-400 to-gray-500',
      glow: 'rgba(156, 163, 175, 0.1)',
      enabled: true,
    },
    {
      id: 'videos',
      title: 'Video Package',
      desc: 'Download all generated videos as a single ZIP archive.',
      gradient: 'from-fuchsia-500 to-pink-500',
      glow: 'rgba(217, 70, 239, 0.15)',
      enabled: hasVideos,
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-5 animate-glow-pulse">
          <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-100 mb-2">Export Campaign</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          Download your complete campaign data in your preferred format.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {formats.map((fmt) => (
          <div
            key={fmt.id}
            className={`glass rounded-2xl p-6 flex flex-col items-center text-center card-hover ${
              !fmt.enabled ? 'opacity-40' : ''
            }`}
            style={fmt.enabled ? { boxShadow: `0 0 30px -10px ${fmt.glow}` } : {}}
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${fmt.gradient} rounded-2xl flex items-center justify-center mb-4 text-white`}>
              {FORMAT_ICONS[fmt.id]}
            </div>
            <h4 className="font-semibold text-gray-200 mb-1 text-sm">{fmt.title}</h4>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">{fmt.desc}</p>
            <button
              onClick={() => handleExport(fmt.id)}
              disabled={exporting === fmt.id || !fmt.enabled}
              className="w-full py-2.5 glass rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] disabled:text-gray-700 disabled:hover:bg-transparent transition-all"
            >
              {exporting === fmt.id ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Exporting...
                </span>
              ) : !fmt.enabled ? 'No videos yet' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

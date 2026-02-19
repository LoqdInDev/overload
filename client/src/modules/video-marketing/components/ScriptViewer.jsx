import { useState } from 'react';

export default function ScriptViewer({ scripts, onGenerate, generating, hasAnglesSelected }) {
  const [activeScript, setActiveScript] = useState(0);

  if (!scripts?.length) {
    return (
      <div className="text-center py-20 animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-5 animate-glow-pulse">
          <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-200 mb-2">Write Full Scripts</h3>
        <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">Select angles first, then generate complete video ad scripts.</p>
        <button onClick={onGenerate} disabled={generating || !hasAnglesSelected} className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none text-sm">
          {!hasAnglesSelected ? 'Select angles first' : generating ? 'Generating...' : 'Write Scripts'}
        </button>
      </div>
    );
  }

  const script = scripts[activeScript];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-100">Scripts</h3>
        <button onClick={onGenerate} disabled={generating} className="btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Regenerate
        </button>
      </div>

      {/* Script tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {scripts.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveScript(i)}
            className={`px-4 py-2 text-xs rounded-xl whitespace-nowrap transition-all duration-200 font-medium ${
              i === activeScript ? 'bg-violet-500/20 text-violet-300 shadow-sm' : 'glass text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.angle_name || `Script ${i + 1}`}
          </button>
        ))}
      </div>

      {script && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex flex-wrap items-center gap-3">
            <span className="text-xs bg-violet-500/15 text-violet-300 px-3 py-1 rounded-lg font-medium">{script.platform}</span>
            <span className="text-xs text-gray-500">{script.total_duration}s</span>
            {script.thumbnail_concept && (
              <span className="text-xs text-gray-600 ml-auto hidden md:inline">Thumbnail: {script.thumbnail_concept}</span>
            )}
          </div>

          {/* Segments */}
          <div className="divide-y divide-white/5">
            {script.segments?.map((seg, i) => (
              <div key={i} className="p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono bg-violet-500/10 text-violet-300 px-2.5 py-1 rounded-lg font-medium">{seg.timestamp}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{seg.section}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Spoken Words</label>
                    <p className="text-gray-200 leading-relaxed">"{seg.spoken_words}"</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Visual Direction</label>
                    <p className="text-gray-400 leading-relaxed">{seg.visual_direction}</p>
                  </div>
                  {seg.text_overlay && (
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Text Overlay</label>
                      <p className="text-amber-300/80 text-xs">{seg.text_overlay}</p>
                    </div>
                  )}
                  {seg.music_note && (
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Music/Sound</label>
                      <p className="text-gray-500 text-xs">{seg.music_note}</p>
                    </div>
                  )}
                  {seg.editing_note && (
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-gray-600 block mb-1 uppercase tracking-wider">Editing</label>
                      <p className="text-gray-500 text-xs">{seg.editing_note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {script.hashtag_suggestions?.length > 0 && (
            <div className="p-5 border-t border-white/5">
              <div className="flex flex-wrap gap-1.5">
                {script.hashtag_suggestions.map((tag, i) => (
                  <span key={i} className="text-[10px] glass text-blue-400/80 px-2.5 py-1 rounded-lg">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          {script.estimated_ctr_reasoning && (
            <div className="px-5 pb-5">
              <p className="text-xs text-gray-600"><strong className="text-gray-500">CTR Analysis:</strong> {script.estimated_ctr_reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

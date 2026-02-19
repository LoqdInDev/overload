import { useState } from 'react';
import { EmptyState } from './AngleCards';

export default function UGCBriefs({ briefs, onGenerate, generating, hasScripts }) {
  const [expanded, setExpanded] = useState(null);

  if (!briefs?.length) {
    return (
      <EmptyState
        title="UGC Briefs"
        desc="Generate 10 UGC-style video briefs that feel like real people sharing their authentic experience with your product."
        buttonText={!hasScripts ? 'Generate scripts first' : generating ? 'Generating...' : 'Generate UGC Briefs'}
        onClick={onGenerate}
        disabled={generating || !hasScripts}
        icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-100">UGC Briefs</h3>
          <p className="text-sm text-gray-500 mt-1">{briefs.length} creator briefs</p>
        </div>
        <button onClick={onGenerate} disabled={generating} className="btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {briefs.map((brief, i) => (
          <div key={i} className="glass rounded-2xl p-5 card-hover">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs bg-violet-500/15 text-violet-300 px-3 py-1 rounded-lg font-medium">
                {brief.format}
              </span>
              <span className="text-[10px] glass px-2.5 py-1 rounded-lg text-gray-500 font-medium">{brief.spoken_tone}</span>
            </div>

            {brief.creator_persona && (
              <div className="mb-3">
                <p className="text-sm text-gray-200 font-medium">{brief.creator_persona.vibe}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {brief.creator_persona.age_range} &middot; {brief.creator_persona.setting}
                </p>
              </div>
            )}

            {brief.script_outline && (
              <div className="space-y-2 mb-3">
                {[
                  { label: 'Open', text: brief.script_outline.opening },
                  { label: 'Middle', text: brief.script_outline.middle },
                  { label: 'Close', text: brief.script_outline.close },
                ].map((part) => (
                  <div key={part.label} className="text-xs">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">{part.label}: </span>
                    <span className="text-gray-300 leading-relaxed">{part.text}</span>
                  </div>
                ))}
              </div>
            )}

            {expanded === i ? (
              <div className="space-y-3.5 text-xs border-t border-white/5 pt-3 animate-fade-in">
                {brief.creator_persona?.authenticity_markers?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Authenticity Markers</span>
                    <ul className="mt-1.5 space-y-1">
                      {brief.creator_persona.authenticity_markers.map((m, j) => (
                        <li key={j} className="text-gray-400 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-600 mt-1.5 flex-shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {brief.do_list?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">Do</span>
                    <ul className="mt-1.5 space-y-1">
                      {brief.do_list.map((d, j) => (
                        <li key={j} className="text-gray-400 flex items-start gap-1.5">
                          <svg className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {brief.dont_list?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-red-400 uppercase tracking-wider font-medium">Don't</span>
                    <ul className="mt-1.5 space-y-1">
                      {brief.dont_list.map((d, j) => (
                        <li key={j} className="text-gray-400 flex items-start gap-1.5">
                          <svg className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {brief.video_generation_prompt && (
                  <div className="pt-3 border-t border-white/5">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Video Generation Prompt</span>
                    <p className="text-gray-500 mt-1.5 leading-relaxed">{brief.video_generation_prompt}</p>
                  </div>
                )}

                <button
                  onClick={() => setExpanded(null)}
                  className="text-violet-400 text-xs hover:text-violet-300 transition-colors font-medium"
                >
                  Show less
                </button>
              </div>
            ) : (
              <button
                onClick={() => setExpanded(i)}
                className="text-violet-400 text-xs hover:text-violet-300 transition-colors font-medium"
              >
                Show details
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

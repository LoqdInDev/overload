import { useState } from 'react';

const STRENGTH_STYLES = {
  HIGH: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  'SLEEPER HIT': { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
};

export default function AngleCards({ angles, selectedAngles, onToggleSelect, onGenerate, generating }) {
  const [expanded, setExpanded] = useState(null);

  if (!angles?.length) {
    return (
      <EmptyState
        title="Generate Ad Angles"
        desc="Claude will analyze your product and create 10 unique ad angles using proven psychological frameworks."
        buttonText={generating ? 'Generating...' : 'Generate 10 Angles'}
        onClick={onGenerate}
        disabled={generating}
        icon="M13 10V3L4 14h7v7l9-11h-7z"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-100">Ad Angles</h3>
          <p className="text-sm text-gray-500 mt-1">
            Select 3-5 angles to write scripts for.
            <span className="ml-2 text-violet-400 font-medium">{selectedAngles.length} selected</span>
          </p>
        </div>
        <button onClick={onGenerate} disabled={generating} className="btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {angles.map((angle, i) => {
          const isSelected = selectedAngles.includes(i);
          const str = STRENGTH_STYLES[angle.estimated_strength] || STRENGTH_STYLES.MEDIUM;

          return (
            <div
              key={i}
              onClick={() => onToggleSelect(i)}
              className={`glass rounded-2xl p-5 cursor-pointer card-hover ${
                isSelected ? 'border-violet-500/40 glow-sm' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-violet-400 bg-violet-500/20' : 'border-gray-700'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-200 text-sm">{angle.angle_name}</h4>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full ${str.bg} ${str.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${str.dot}`} />
                  {angle.estimated_strength}
                </span>
              </div>

              <div className="flex gap-2 mb-3">
                <span className="text-[10px] glass px-2 py-0.5 rounded-md text-gray-400">{angle.framework}</span>
                <span className="text-[10px] glass px-2 py-0.5 rounded-md text-gray-400">{angle.target_emotion}</span>
              </div>

              <p className="text-sm text-violet-300/80 mb-3 italic leading-relaxed">"{angle.hook}"</p>

              {expanded === i ? (
                <div className="space-y-2.5 text-sm text-gray-400 animate-fade-in border-t border-white/5 pt-3">
                  <p className="leading-relaxed">{angle.concept}</p>
                  <p className="text-xs text-gray-500"><strong className="text-gray-400">Why it works:</strong> {angle.why_it_works}</p>
                  <p className="text-xs text-gray-500"><strong className="text-gray-400">Target:</strong> {angle.target_audience_segment}</p>
                  <button onClick={(e) => { e.stopPropagation(); setExpanded(null); }} className="text-violet-400 text-xs hover:text-violet-300 transition-colors">
                    Show less
                  </button>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setExpanded(i); }} className="text-violet-400 text-xs hover:text-violet-300 transition-colors">
                  Show more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ title, desc, buttonText, onClick, disabled, icon }) {
  return (
    <div className="text-center py-20 animate-slide-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-5 animate-glow-pulse">
        <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto leading-relaxed">{desc}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:shadow-none text-sm"
      >
        {buttonText}
      </button>
    </div>
  );
}

export { EmptyState };

import { useEffect, useRef } from 'react';

export default function GenerationProgress({ visible, streamText }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamText]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-strong rounded-2xl w-full max-w-2xl mx-4 overflow-hidden glow-md animate-slide-up">
        <div className="p-5 border-b border-white/5 flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl blur-lg opacity-30 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">Generating with Claude AI</p>
            <p className="text-xs text-gray-500">Crafting your ad content...</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <div
          ref={containerRef}
          className="p-5 h-72 overflow-y-auto font-mono text-xs text-gray-400 whitespace-pre-wrap leading-relaxed"
        >
          {streamText || (
            <span className="text-gray-600 italic">Waiting for response...</span>
          )}
        </div>
        <div className="h-1 bg-gray-800/50">
          <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 animate-shimmer" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

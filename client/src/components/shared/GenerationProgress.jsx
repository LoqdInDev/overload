export default function GenerationProgress({ text, label = 'Generating...', onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="bg-black/40 rounded-xl p-4 max-h-64 overflow-y-auto font-mono text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
          {text || 'Waiting for AI response...'}
          <span className="animate-pulse text-violet-400">|</span>
        </div>
      </div>
    </div>
  );
}

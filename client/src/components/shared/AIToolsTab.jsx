import { useState } from 'react';

/**
 * Shared AI Tools tab used across Team, Billing, and Integrations pages.
 * @param {{ templates: { name: string, prompt: string }[], color: string, apiEndpoint: string }} props
 */
export default function AIToolsTab({ templates, color = '#64748b', apiEndpoint }) {
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template);
    setGenerating(true);
    setOutput('');
    setError(null);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'content', prompt: template.prompt }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'chunk') setOutput(p => p + d.text);
            else if (d.type === 'result') setOutput(d.data?.content || d.data);
          } catch {}
        }
      }
    } catch (e) {
      console.error('AI generation error:', e);
      setError(e.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {templates.map(tool => (
          <button key={tool.name} onClick={() => generate(tool)} disabled={generating}
            className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-slate-500/20' : ''}`}>
            <p className="text-xs font-bold text-gray-300">{tool.name}</p>
            <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
          </button>
        ))}
      </div>

      {error && (
        <div className="panel rounded-xl p-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
          </div>
        </div>
      )}

      {(generating || output) && !error && (
        <div className="panel rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? color : undefined }} />
            <span className="hud-label" style={{ color: generating ? '#94a3b8' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: color }} />}
          </pre>
        </div>
      )}
    </div>
  );
}

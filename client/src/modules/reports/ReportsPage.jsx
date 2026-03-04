import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import { fetchJSON, postJSON, connectSSE } from '../../lib/api';

const REPORT_TYPES = [
  { id: 'overview', name: 'Business Overview', desc: 'Full marketing performance summary across all channels', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
  { id: 'campaign', name: 'Campaign Report', desc: 'Performance metrics for a specific campaign', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z' },
  { id: 'roi', name: 'ROI Analysis', desc: 'Return on investment across marketing spend', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
  { id: 'audience', name: 'Audience Insights', desc: 'Demographics, behavior, and engagement analysis', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
  { id: 'content', name: 'Content Performance', desc: 'Top performing content, engagement rates, trends', icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z' },
  { id: 'competitor', name: 'Competitor Benchmark', desc: 'Compare performance against key competitors', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
];

const PERIODS = ['Last 7 Days', 'Last 30 Days', 'Last Quarter', 'Last Year', 'Custom'];
const FORMATS = ['PDF', 'CSV', 'Google Sheets', 'Notion'];


export default function ReportsPage() {
  usePageTitle('Client Reports');
  const [selectedType, setSelectedType] = useState(null);
  const [period, setPeriod] = useState('Last 30 Days');
  const [format, setFormat] = useState('PDF');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [reports, setReports] = useState([]);
  const [summaryMetrics, setSummaryMetrics] = useState([{ name: '', value: '' }]);
  const [summaryPeriod, setSummaryPeriod] = useState('Last 30 days');
  const [summaryOutput, setSummaryOutput] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchJSON('/api/reports/reports').then(data => { if (Array.isArray(data)) setReports(data); }).catch(() => {});
  }, []);

  const generate = () => {
    if (!selectedType) return;
    setGenerating(true); setOutput('');
    const type = REPORT_TYPES.find(r => r.id === selectedType);
    const prompt = customPrompt || `Generate a comprehensive ${type?.name} for the period: ${period}. Include key metrics, trends, insights, and actionable recommendations. Format the report with clear sections, bullet points, and data summaries.`;
    connectSSE('/api/reports/generate', { type: selectedType, prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: async (data) => {
        const content = data?.content;
        if (content) setOutput(content);
        try {
          await postJSON('/api/reports/reports', {
            name: `${type?.name} - ${period}`,
            template: selectedType,
            date_range: period,
            content: { text: content },
            status: 'draft',
          });
          fetchJSON('/api/reports/reports').then(d => { if (Array.isArray(d)) setReports(d); }).catch(() => {});
        } catch {}
        setGenerating(false);
      },
      onError: () => setGenerating(false),
      onDone: () => setGenerating(false),
    });
  };

  const downloadReport = () => {
    const type = REPORT_TYPES.find(r => r.id === selectedType);
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(type?.name || 'report').replace(/\s+/g, '-').toLowerCase()}-${period.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedType) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <ModuleWrapper moduleId="reports">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#f43f5e' }}>REPORTS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Report Generator</h1><p className="text-base text-gray-500">AI-powered marketing reports and performance analysis</p></div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {REPORT_TYPES.map(r => (
          <button key={r.id} onClick={() => setSelectedType(r.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-left group">
            <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.12)' }}>
              <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={r.icon} /></svg>
            </div>
            <p className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{r.name}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.desc}</p>
          </button>
        ))}
      </div>

      <p className="hud-label text-[11px] mb-3" style={{ color: '#f43f5e' }}>RECENT REPORTS</p>
      <div className="panel rounded-2xl overflow-hidden">
        {reports.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">No reports yet. Generate your first report above.</div>
        ) : (
          <div className="divide-y divide-indigo-500/[0.04]">
            {reports.map(r => (
              <div key={r.id} className="flex items-center gap-6 px-6 py-4 hover:bg-white/[0.01] transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.08)' }}>
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={REPORT_TYPES.find(t => t.id === r.template)?.icon || REPORT_TYPES[0].icon} /></svg>
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-200 truncate">{r.name}</p><p className="text-xs text-gray-500">{r.client_name ? `${r.client_name} · ` : ''}{r.date_range || r.created_at?.slice(0, 10) || ''}</p></div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${r.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="panel animate-fade-in" style={{ marginTop: 16 }}>
        <div className="hud-label" style={{ marginBottom: 12 }}>AI Executive Summary Generator</div>
        <div style={{ marginBottom: 10 }}>
          <div className="hud-label" style={{ marginBottom: 6 }}>Reporting Period</div>
          <input className="input-field rounded-xl px-4 py-3 text-sm w-full" value={summaryPeriod} onChange={e => setSummaryPeriod(e.target.value)} placeholder="e.g. March 2026" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="hud-label" style={{ marginBottom: 6 }}>Key Metrics</div>
          {summaryMetrics.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input className="input-field rounded px-3 py-2 text-xs" placeholder="Metric name" value={m.name} style={{ flex: 2 }}
                onChange={e => setSummaryMetrics(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="input-field rounded px-3 py-2 text-xs" placeholder="Value" value={m.value} style={{ flex: 1 }}
                onChange={e => setSummaryMetrics(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              {summaryMetrics.length > 1 && (
                <button className="chip text-[10px]" style={{ padding: '0 10px' }} onClick={() => setSummaryMetrics(prev => prev.filter((_, j) => j !== i))}>×</button>
              )}
            </div>
          ))}
          <button className="chip text-[10px]" style={{ marginTop: 4 }} onClick={() => setSummaryMetrics(prev => [...prev, { name: '', value: '' }])}>+ Add Metric</button>
        </div>
        <button className="btn-accent px-4 py-2 rounded-lg text-sm" style={{ background: '#f43f5e', boxShadow: '0 4px 20px -4px rgba(244,63,94,0.4)' }}
          disabled={summaryLoading || !summaryMetrics.some(m => m.name)}
          onClick={() => {
            setSummaryOutput('');
            setSummaryLoading(true);
            connectSSE('/api/reports/generate-executive-summary', {
              period: summaryPeriod,
              metrics: summaryMetrics.filter(m => m.name),
              report_name: selectedReport?.name || 'Marketing Report'
            },
              {
                onChunk: (text) => setSummaryOutput(prev => prev + text),
                onResult: () => setSummaryLoading(false),
                onError: () => setSummaryLoading(false),
                onDone: () => setSummaryLoading(false),
              }
            );
          }}>{summaryLoading ? 'Generating...' : 'Generate Executive Summary'}</button>
        {summaryOutput && (
          <div style={{ marginTop: 20, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }} className="text-gray-300">
            {summaryOutput}
            {summaryLoading && <span className="inline-block w-1.5 h-4 bg-rose-400 ml-0.5 animate-pulse" />}
          </div>
        )}
      </div>
      </ModuleWrapper>
    </div>
  );

  const type = REPORT_TYPES.find(r => r.id === selectedType);
  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="reports">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <button onClick={() => { setSelectedType(null); setOutput(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div><p className="hud-label text-[11px]" style={{ color: '#f43f5e' }}>{type?.name?.toUpperCase()}</p><h2 className="text-lg font-bold text-white">{type?.name}</h2></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">REPORT DETAILS</p>
            <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={4} placeholder={`Describe what you want in your ${type?.name}... Leave blank for a comprehensive default report.`} className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
          </div>
          <button onClick={generate} disabled={generating} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#f43f5e', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(244,63,94,0.4)' }}>
            {generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING REPORT...</span> : 'GENERATE REPORT'}
          </button>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">TIME PERIOD</p>
            <div className="space-y-1.5">{PERIODS.map(p => (<button key={p} onClick={() => setPeriod(p)} className={`w-full chip text-[10px] justify-center ${period === p ? 'active' : ''}`} style={period === p ? { background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', color: '#fb7185' } : {}}>{p}</button>))}</div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">EXPORT FORMAT</p>
            <div className="grid grid-cols-2 gap-1.5">{FORMATS.map(f => (<button key={f} onClick={() => setFormat(f)} className={`chip text-[10px] justify-center ${format === f ? 'active' : ''}`} style={format === f ? { background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', color: '#fb7185' } : {}}>{f}</button>))}</div>
          </div>
        </div>
      </div>

      {output && (
        <div className="mt-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#fb7185' : '#4ade80' }}>{generating ? 'GENERATING REPORT...' : 'REPORT READY'}</span></div>
            {!generating && <button onClick={downloadReport} className="chip text-[10px] flex items-center gap-1.5 px-3 py-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Download .md</button>}
          </div>
          <div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-rose-400 ml-0.5 animate-pulse" />}</pre></div>
        </div>
      )}
      </ModuleWrapper>
    </div>
  );
}

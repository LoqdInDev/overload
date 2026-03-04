import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const AI_TEMPLATES = [
  { name: 'Generate Test Hypothesis', prompt: 'Generate a data-driven A/B test hypothesis with expected outcome and metrics to track' },
  { name: 'Suggest Test Variants', prompt: 'Suggest creative test variants with differentiated messaging angles and design approaches' },
  { name: 'Analyze Test Results', prompt: 'Analyze A/B test results and provide statistical significance assessment with actionable insights' },
  { name: 'Winner Scaling Plan', prompt: 'Create a scaling plan for the winning test variant including rollout strategy and next test ideas' },
];

const TEST_TYPES = ['copy', 'creative', 'audience'];
const TEST_STATUSES = ['draft', 'running', 'paused', 'completed'];

export default function AbTestingPage() {
  usePageTitle('A/B Testing');
  const [tab, setTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [newTest, setNewTest] = useState({ name: '', type: 'copy', status: 'draft', start_date: '', end_date: '' });
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sigInputs, setSigInputs] = useState({ control_visitors: '', control_conversions: '', variant_visitors: '', variant_conversions: '' });
  const [sigResult, setSigResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchJSON('/api/ab-testing/tests')
      .then(res => setTests(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addTest = async () => {
    if (!newTest.name.trim()) return;
    try {
      const res = await postJSON('/api/ab-testing/tests', newTest);
      setTests(prev => [res.data, ...prev]);
      setNewTest({ name: '', type: 'copy', status: 'draft', start_date: '', end_date: '' });
      setShowAddTest(false);
    } catch (err) { console.error(err); }
  };

  const removeTest = async (id) => {
    try {
      await deleteJSON(`/api/ab-testing/tests/${id}`);
      setTests(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/ab-testing/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const typeColors = { copy: 'text-pink-400 bg-pink-500/10 border-pink-500/20', creative: 'text-purple-400 bg-purple-500/10 border-purple-500/20', audience: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  const statusColors = { draft: 'text-gray-400 bg-gray-500/10 border-gray-500/20', running: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', completed: 'text-blue-400 bg-blue-500/10 border-blue-500/20', paused: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };

  // Compute stats from real data
  const activeTests = tests.filter(t => t.status === 'running').length;
  const totalVariants = tests.reduce((sum, t) => {
    if (!t.variants) return sum;
    try {
      const parsed = JSON.parse(t.variants);
      return sum + (Array.isArray(parsed) ? parsed.length : 0);
    } catch { return sum; }
  }, 0);
  const completedTests = tests.filter(t => t.status === 'completed');
  const withWinner = completedTests.filter(t => t.winner_variant);
  const winRate = completedTests.length > 0 ? Math.round((withWinner.length / completedTests.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#f472b6' }}>A/B TESTING</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">A/B Test Manager</h1><p className="text-base text-gray-500">Run experiments, track variants, and find winning combinations</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { l: 'ACTIVE TESTS', v: activeTests.toString() },
          { l: 'TOTAL TESTS', v: tests.length.toString() },
          { l: 'VARIANTS', v: totalVariants.toString() },
          { l: 'WIN RATE', v: `${winRate}%` },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.l}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {['tests', 'results', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.3)', color: '#f472b6' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>

      {tab === 'tests' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddTest(!showAddTest)} className="chip text-[10px]" style={{ background: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.3)', color: '#f472b6' }}>+ Add Test</button>
          </div>
          {showAddTest && (
            <div className="panel rounded-2xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input value={newTest.name} onChange={e => setNewTest({ ...newTest, name: e.target.value })} placeholder="Test name" className="input-field rounded px-3 py-2 text-xs sm:col-span-2" />
                <select value={newTest.type} onChange={e => setNewTest({ ...newTest, type: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {TEST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <input value={newTest.start_date} onChange={e => setNewTest({ ...newTest, start_date: e.target.value })} type="date" placeholder="Start date" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newTest.end_date} onChange={e => setNewTest({ ...newTest, end_date: e.target.value })} type="date" placeholder="End date" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <button onClick={addTest} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#f472b6' }}>Create Test</button>
            </div>
          )}
          {loading ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-sm text-gray-600">Loading tests...</p></div>
          ) : tests.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No tests yet</p>
              <p className="text-xs text-gray-600 mt-1">Create your first A/B test to start experimenting</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(t => (
                <div key={t.id} className="group panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-200">{t.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-gray-500">
                      {t.start_date && <span>Start: {t.start_date}</span>}
                      {t.end_date && <span>End: {t.end_date}</span>}
                      {t.created_at && !t.start_date && <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {t.type && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColors[t.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>{t.type}</span>}
                    {t.winner_variant && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Winner: {t.winner_variant}</span>}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[t.status] || statusColors.draft}`}>{t.status}</span>
                    <button onClick={() => removeTest(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div className="animate-fade-in">
          {completedTests.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No completed tests yet</p>
              <p className="text-xs text-gray-600 mt-1">Complete some A/B tests to see results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTests.map(t => (
                <div key={t.id} className="panel rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                    <p className="text-base font-semibold text-gray-200">{t.name}</p>
                    {t.type && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border self-start ${typeColors[t.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>{t.type}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-6 text-xs text-gray-500">
                    {t.winner_variant && <span>Winner: <span className="text-emerald-400 font-semibold">{t.winner_variant}</span></span>}
                    {t.start_date && <span>Started: <span className="text-gray-300">{t.start_date}</span></span>}
                    {t.end_date && <span>Ended: <span className="text-gray-300">{t.end_date}</span></span>}
                    {!t.winner_variant && <span className="text-gray-600 italic">No winner declared</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ai-tools' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Statistical Significance Calculator */}
          <div className="panel animate-fade-in" style={{ marginTop: 16 }}>
            <div className="hud-label" style={{ marginBottom: 12 }}>Statistical Significance Calculator</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="hud-label" style={{ marginBottom: 8 }}>Control (A)</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Visitors</div>
                    <input className="input" type="number" placeholder="1000" value={sigInputs.control_visitors} onChange={e => setSigInputs(p => ({ ...p, control_visitors: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Conversions</div>
                    <input className="input" type="number" placeholder="50" value={sigInputs.control_conversions} onChange={e => setSigInputs(p => ({ ...p, control_conversions: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <div className="hud-label" style={{ marginBottom: 8 }}>Variant (B)</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Visitors</div>
                    <input className="input" type="number" placeholder="1000" value={sigInputs.variant_visitors} onChange={e => setSigInputs(p => ({ ...p, variant_visitors: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Conversions</div>
                    <input className="input" type="number" placeholder="65" value={sigInputs.variant_conversions} onChange={e => setSigInputs(p => ({ ...p, variant_conversions: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-accent" style={{ marginTop: 12 }}
              onClick={async () => {
                try { const result = await postJSON('/api/ab-testing/calculate-significance', sigInputs); setSigResult(result); } catch {}
              }}>Calculate Significance</button>
            {sigResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center', padding: 10, background: 'var(--surface)', borderRadius: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: parseFloat(sigResult.significance) >= 95 ? '#22c55e' : 'var(--accent)' }}>{sigResult.significance}</div>
                    <div className="hud-label">Significance</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 10, background: 'var(--surface)', borderRadius: 6 }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{sigResult.relative_lift}</div>
                    <div className="hud-label">Relative Lift</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 10, background: 'var(--surface)', borderRadius: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: sigResult.is_significant ? '#22c55e' : 'var(--muted)' }}>
                      {sigResult.is_significant ? '✅ Significant' : '⏳ Not Yet'}
                    </div>
                    <div className="hud-label">Status</div>
                  </div>
                </div>
                <div className="chip">{sigResult.recommendation}</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-pink-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{t.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'bg-pink-400 animate-pulse' : 'bg-pink-400'}`} />
                <span className="hud-label text-[11px]" style={{ color: '#f472b6' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-pink-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          )}
        </div>
      )}

      <AIInsightsPanel moduleId="ab-testing" />
    </div>
  );
}

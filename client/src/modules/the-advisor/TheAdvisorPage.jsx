import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

const MODULE_COLOR = '#d4a017';

export default function TheAdvisorPage() {
  usePageTitle('The Advisor');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [yesterdayOpen, setYesterdayOpen] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [advisorActions, setAdvisorActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchJSON('/api/the-advisor/').catch(() => []),
      fetchJSON('/api/the-advisor/actions/list').catch(() => []),
    ]).then(([briefings, actions]) => {
      if (briefings && briefings.length > 0) setBriefing(briefings[0]);
      if (Array.isArray(actions)) setAdvisorActions(actions);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const generateBriefing = async () => {
    setGenerating(true); setOutput('');
    try {
      const res = await fetch(`${API_BASE}/api/the-advisor/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'briefing', prompt: 'Generate today\'s comprehensive marketing briefing including performance summary, key insights, priority actions, and strategic recommendations based on all active campaigns and recent data.' }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') { setOutput(d.data.content); loadData(); } } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const priorityColor = (p) => p === 'Critical' ? '#ef4444' : p === 'High' ? '#f97316' : p === 'Medium' ? '#f59e0b' : '#6b7280';
  const actionStatusColor = (s) => s === 'pending' ? '#f59e0b' : s === 'in-progress' ? '#3b82f6' : '#22c55e';

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Parse today_recommendations from briefing — may be JSON array or plain text
  let recommendations = [];
  if (briefing && briefing.today_recommendations) {
    try {
      const parsed = JSON.parse(briefing.today_recommendations);
      if (Array.isArray(parsed)) recommendations = parsed;
      else recommendations = [{ id: 1, priority: 'High', module: 'Advisor', title: 'Today\'s Recommendation', description: String(parsed), action: 'Review' }];
    } catch {
      recommendations = [{ id: 1, priority: 'High', module: 'Advisor', title: 'Today\'s Recommendation', description: briefing.today_recommendations, action: 'Review' }];
    }
  }

  // Parse weekly_snapshot from briefing — may be JSON array or plain text
  let weeklyMetrics = [];
  if (briefing && briefing.weekly_snapshot) {
    try {
      const parsed = JSON.parse(briefing.weekly_snapshot);
      if (Array.isArray(parsed)) weeklyMetrics = parsed;
    } catch {
      // plain text — leave weeklyMetrics empty, will show text below
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      {/* Daily Briefing Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-6 h-6" style={{ color: MODULE_COLOR }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>THE ADVISOR</p>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Your Daily Marketing Briefing</h1>
        <p className="text-base text-gray-500">{dateStr}</p>
      </div>

      {/* Generate Button */}
      <div className="mb-6 sm:mb-8">
        <button onClick={generateBriefing} disabled={generating} className="btn-accent px-4 sm:px-6 py-3 rounded-lg flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center" style={{ background: generating ? '#1e1e2e' : MODULE_COLOR, boxShadow: generating ? 'none' : `0 4px 20px -4px ${MODULE_COLOR}60` }}>
          {generating ? (
            <>
              <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
              <span>GENERATING BRIEFING...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              <span>GENERATE TODAY&apos;S BRIEFING</span>
            </>
          )}
        </button>
      </div>

      {/* AI Generated Briefing Output */}
      {(generating || output) && (
        <div className="panel rounded-2xl p-4 sm:p-7 mb-6 sm:mb-8 animate-fade-up" style={{ borderColor: `${MODULE_COLOR}20` }}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
            <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING BRIEFING...' : 'BRIEFING READY'}</span>
          </div>
          <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
        </div>
      )}

      {/* Yesterday's Summary */}
      <div className="panel rounded-2xl mb-6" style={{ borderColor: yesterdayOpen ? `${MODULE_COLOR}20` : undefined }}>
        <button onClick={() => setYesterdayOpen(!yesterdayOpen)} className="w-full flex items-center justify-between p-4 sm:p-6 text-left">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: MODULE_COLOR }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>YESTERDAY&apos;S SUMMARY</p>
          </div>
          <svg className={`w-5 h-5 text-gray-500 transition-transform ${yesterdayOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {yesterdayOpen && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 animate-fade-in">
            {briefing && briefing.yesterday_summary ? (
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{briefing.yesterday_summary}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">No summary available yet. Generate your first daily briefing above.</p>
            )}
          </div>
        )}
      </div>

      {/* Today's Recommendations */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: MODULE_COLOR }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          <p className="hud-label text-[11px] flex-shrink-0" style={{ color: MODULE_COLOR }}>TODAY&apos;S RECOMMENDATIONS</p>
          <div className="flex-1 hud-line hidden sm:block" />
        </div>
        {loading ? (
          <div className="panel rounded-2xl p-4 sm:p-6" style={{ opacity: 0.5 }}>Loading briefing...</div>
        ) : !briefing ? (
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="text-sm text-gray-500 italic">No briefing yet — generate your first daily briefing above.</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="text-sm text-gray-500 italic">No recommendations in the latest briefing.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={rec.id || i} className="panel rounded-2xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start gap-3 sm:gap-6">
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <span className="text-base sm:text-lg font-bold font-mono" style={{ color: MODULE_COLOR }}>#{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {rec.priority && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${priorityColor(rec.priority)}15`, color: priorityColor(rec.priority), border: `1px solid ${priorityColor(rec.priority)}25` }}>
                          {rec.priority}
                        </span>
                      )}
                      {rec.module && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-500 border border-white/[0.04]">{rec.module}</span>
                      )}
                    </div>
                    <p className="text-base font-bold text-gray-200 mb-1">{rec.title}</p>
                    <p className="text-sm text-gray-400 leading-relaxed mb-3">{rec.description}</p>
                    {rec.action && (
                      <button className="chip text-xs" style={{ background: `${MODULE_COLOR}15`, borderColor: `${MODULE_COLOR}30`, color: MODULE_COLOR }}>
                        {rec.action}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Performance Snapshot */}
      <div className="panel rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <svg className="w-5 h-5" style={{ color: MODULE_COLOR }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>WEEKLY PERFORMANCE SNAPSHOT</p>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500" style={{ opacity: 0.5 }}>Loading...</p>
        ) : weeklyMetrics.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {weeklyMetrics.map((metric, i) => (
              <div key={i} className="bg-white/[0.02] rounded-lg p-4 sm:p-6 border border-indigo-500/[0.06]">
                <p className="text-xs font-bold text-gray-400 mb-2">{metric.label}</p>
                <p className="text-lg sm:text-xl font-bold font-mono" style={{ color: MODULE_COLOR }}>{metric.value}</p>
                {metric.change !== undefined && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-xs font-mono" style={{ color: metric.positive !== false ? '#22c55e' : '#ef4444' }}>{metric.change}</span>
                    {metric.detail && <span className="text-xs text-gray-600">{metric.detail}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : briefing && briefing.weekly_snapshot ? (
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{briefing.weekly_snapshot}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">No weekly snapshot available yet.</p>
        )}
      </div>

      {/* Action Queue */}
      <div className="panel rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <svg className="w-5 h-5" style={{ color: MODULE_COLOR }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>ACTION QUEUE</p>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500" style={{ opacity: 0.5 }}>Loading actions...</p>
        ) : advisorActions.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No actions yet.</p>
        ) : (
          <div className="space-y-3">
            {advisorActions.map(action => (
              <div key={action.id} className="flex items-start sm:items-center gap-3 py-3 sm:py-2 border-b border-indigo-500/[0.04] last:border-0">
                <div className="w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0" style={{ borderColor: `${actionStatusColor(action.status)}40`, background: action.status === 'completed' ? `${actionStatusColor(action.status)}20` : 'transparent' }}>
                  {action.status === 'completed' && (
                    <svg className="w-4 h-4" style={{ color: actionStatusColor(action.status) }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${action.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{action.title}</p>
                  {action.description && <p className="text-xs text-gray-600">{action.description}</p>}
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${actionStatusColor(action.status)}15`, color: actionStatusColor(action.status), border: `1px solid ${actionStatusColor(action.status)}25` }}>
                  {action.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

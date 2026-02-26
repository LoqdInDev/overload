import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { fetchJSON } from '../../lib/api';

const TYPE_ICONS = {
  trend: { path: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941', color: '#5E8E6E', fill: false },
  dependency: { path: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757', color: '#D4A017', fill: false },
  recommendation: { path: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18', color: '#C45D3E', fill: false },
};

export default function AIInsightsPanel({ moduleId }) {
  const { dark } = useTheme();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJSON(`/api/automation/insights/${moduleId}`)
      .then(data => setInsights(data))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, [moduleId]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl p-5 animate-pulse" style={{
        background: dark ? 'rgba(212,160,23,0.04)' : 'rgba(212,160,23,0.03)',
        border: `1px solid ${dark ? 'rgba(212,160,23,0.08)' : 'rgba(212,160,23,0.06)'}`,
      }}>
        <div className="h-3 w-24 rounded mb-4" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-14 rounded-xl" style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />)}
        </div>
      </div>
    );
  }

  if (!insights || !insights.items?.length) return null;

  return (
    <div className="mt-6 rounded-2xl overflow-hidden" style={{
      background: dark ? 'rgba(212,160,23,0.04)' : 'rgba(212,160,23,0.03)',
      border: `1px solid ${dark ? 'rgba(212,160,23,0.1)' : 'rgba(212,160,23,0.08)'}`,
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{
        borderBottom: `1px solid ${dark ? 'rgba(212,160,23,0.08)' : 'rgba(212,160,23,0.06)'}`,
      }}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A017' }}>
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#D4A017' }}>AI Insights</span>
      </div>

      {/* Insight cards */}
      <div className="p-4 space-y-3">
        {insights.items.map((insight, i) => {
          const typeConfig = TYPE_ICONS[insight.type] || TYPE_ICONS.recommendation;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{
              background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.04)'}`,
            }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill={typeConfig.fill ? typeConfig.color : 'none'}
                stroke={typeConfig.fill ? 'none' : typeConfig.color}
                strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={typeConfig.path} />
              </svg>
              <div>
                <p className="text-[12px] font-medium" style={{ color: dark ? '#E8E4DE' : '#332F2B' }}>
                  {insight.text}
                </p>
                {insight.detail && (
                  <p className="text-[11px] mt-0.5" style={{ color: dark ? '#6B6660' : '#94908A' }}>
                    {insight.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 text-center" style={{
        borderTop: `1px solid ${dark ? 'rgba(212,160,23,0.06)' : 'rgba(212,160,23,0.04)'}`,
      }}>
        <span className="text-[9px] font-medium tracking-wider uppercase" style={{
          color: dark ? 'rgba(212,160,23,0.4)' : 'rgba(212,160,23,0.5)',
        }}>Powered by Overload AI</span>
      </div>
    </div>
  );
}

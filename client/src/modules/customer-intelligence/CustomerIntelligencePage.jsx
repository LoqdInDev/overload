import { useState } from 'react';

const MODULE_COLOR = '#06b6d4';

const AI_TEMPLATES = [
  { name: 'Analyze Customer Segments', prompt: 'Perform deep analysis of customer segments including behavioral patterns, purchase frequency, average spend, and engagement metrics with actionable recommendations' },
  { name: 'Predict Churn Risk', prompt: 'Analyze customer behavior signals and predict churn risk levels, identifying at-risk customers and recommending personalized retention strategies' },
  { name: 'Generate Persona', prompt: 'Create detailed customer personas based on demographic data, psychographics, buying behavior, pain points, goals, and preferred communication channels' },
  { name: 'LTV Analysis', prompt: 'Calculate and analyze customer lifetime value across segments, identify highest-value cohorts, and recommend strategies to increase LTV' },
];

const MOCK_SEGMENTS = [
  { id: 1, name: 'Power Buyers', size: 1240, avgLtv: '$2,480', growth: '+18%', churnRisk: 'Low', traits: ['High frequency', 'Multi-category', 'Brand loyal'] },
  { id: 2, name: 'Casual Shoppers', size: 3420, avgLtv: '$340', growth: '+5%', churnRisk: 'Medium', traits: ['Sale-driven', 'Seasonal', 'Price-sensitive'] },
  { id: 3, name: 'New Customers', size: 890, avgLtv: '$85', growth: '+32%', churnRisk: 'High', traits: ['First purchase', 'Discovery phase', 'Email engaged'] },
  { id: 4, name: 'VIP Enterprise', size: 156, avgLtv: '$12,400', growth: '+8%', churnRisk: 'Low', traits: ['High AOV', 'Annual contracts', 'Support heavy'] },
  { id: 5, name: 'At-Risk', size: 420, avgLtv: '$520', growth: '-12%', churnRisk: 'Critical', traits: ['Declining activity', 'No recent purchase', 'Low engagement'] },
];

const MOCK_INSIGHTS = [
  { id: 1, title: 'Churn Spike in Casual Shoppers', severity: 'high', description: 'Casual Shoppers segment shows 23% higher churn than last quarter. Primary driver: lack of personalized follow-up after first purchase.', recommendation: 'Implement automated welcome sequence with personalized product recommendations.' },
  { id: 2, title: 'VIP Segment Revenue Opportunity', severity: 'medium', description: 'VIP Enterprise clients have 40% headroom for upsells based on usage patterns and contract size analysis.', recommendation: 'Launch dedicated account manager outreach program with tailored upgrade proposals.' },
  { id: 3, title: 'New Customer Activation Gap', severity: 'high', description: 'Only 34% of new customers make a second purchase within 30 days. Industry benchmark is 52%.', recommendation: 'Create a 7-day post-purchase nurture campaign with education and social proof.' },
  { id: 4, title: 'Geographic Expansion Signal', severity: 'low', description: 'Organic traffic from APAC region grew 67% but conversion rate is 2x lower than NA. Localization gap identified.', recommendation: 'Invest in APAC-localized landing pages and local payment methods.' },
];

export default function CustomerIntelligencePage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/customer-intelligence/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const churnColor = (r) => r === 'Low' ? '#22c55e' : r === 'Medium' ? '#f59e0b' : r === 'High' ? '#f97316' : '#ef4444';
  const severityColor = (s) => s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#3b82f6';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>CUSTOMER INTELLIGENCE</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Customer Intelligence</h1>
        <p className="text-base text-gray-500">Deep insights into customer behavior, segments, and lifetime value</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'TOTAL CUSTOMERS', value: '6,126', sub: '+890 this month' },
          { label: 'SEGMENTS', value: '5', sub: '2 need attention' },
          { label: 'AVG LTV', value: '$1,240', sub: '+$180 vs last quarter' },
          { label: 'CHURN RATE', value: '4.2%', sub: '-0.8% vs last month' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 sm:mb-8">
        {['overview', 'segments', 'insights', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>SEGMENT BREAKDOWN</p>
              <div className="space-y-4">
                {MOCK_SEGMENTS.map(seg => {
                  const total = MOCK_SEGMENTS.reduce((a, s) => a + s.size, 0);
                  const pct = ((seg.size / total) * 100).toFixed(0);
                  return (
                    <div key={seg.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 font-semibold">{seg.name}</span>
                        <span className="text-gray-500 font-mono">{seg.size.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MODULE_COLOR }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>CHURN RISK OVERVIEW</p>
              <div className="space-y-3">
                {MOCK_SEGMENTS.map(seg => (
                  <div key={seg.id} className="flex items-center justify-between py-1.5 border-b border-indigo-500/[0.04] last:border-0">
                    <span className="text-xs text-gray-300">{seg.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500">{seg.growth}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${churnColor(seg.churnRisk)}15`, color: churnColor(seg.churnRisk), border: `1px solid ${churnColor(seg.churnRisk)}25` }}>
                        {seg.churnRisk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>TOP INSIGHTS</p>
            <div className="space-y-3">
              {MOCK_INSIGHTS.slice(0, 3).map(insight => (
                <div key={insight.id} className="flex items-start gap-3 py-2 border-b border-indigo-500/[0.04] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: severityColor(insight.severity) }} />
                  <div>
                    <p className="text-xs font-semibold text-gray-300">{insight.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Segments */}
      {tab === 'segments' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          {MOCK_SEGMENTS.map(seg => (
            <div key={seg.id} className="panel rounded-2xl p-4 sm:p-6 hover:border-cyan-500/20 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-base font-bold text-gray-200">{seg.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{seg.size.toLocaleString()} customers</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${churnColor(seg.churnRisk)}15`, color: churnColor(seg.churnRisk), border: `1px solid ${churnColor(seg.churnRisk)}25` }}>
                  {seg.churnRisk} Risk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Avg LTV</p>
                  <p className="text-base font-bold font-mono" style={{ color: MODULE_COLOR }}>{seg.avgLtv}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Growth</p>
                  <p className="text-base font-bold font-mono" style={{ color: seg.growth.startsWith('+') ? '#22c55e' : '#ef4444' }}>{seg.growth}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {seg.traits.map(trait => (
                  <span key={trait} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-500 border border-white/[0.04]">{trait}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {tab === 'insights' && (
        <div className="animate-fade-in space-y-4">
          {MOCK_INSIGHTS.map(insight => (
            <div key={insight.id} className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: severityColor(insight.severity), boxShadow: `0 0 8px ${severityColor(insight.severity)}40` }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-bold text-gray-200">{insight.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: `${severityColor(insight.severity)}15`, color: severityColor(insight.severity) }}>
                      {insight.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{insight.description}</p>
                  <div className="bg-white/[0.02] rounded-lg p-5 border border-indigo-500/[0.06]">
                    <p className="text-xs font-bold text-gray-400 mb-1">RECOMMENDATION</p>
                    <p className="text-sm text-gray-300">{insight.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-cyan-500/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'ANALYZING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

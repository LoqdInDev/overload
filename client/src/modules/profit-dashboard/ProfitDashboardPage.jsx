import { useState } from 'react';

const MODULE_COLOR = '#10b981';

const MOCK_REVENUE = [
  { id: 1, source: 'Direct Sales', amount: 42500, change: '+12.3%', period: 'Feb 2026' },
  { id: 2, source: 'Subscription Revenue', amount: 28400, change: '+8.7%', period: 'Feb 2026' },
  { id: 3, source: 'Affiliate Commissions', amount: 8200, change: '+22.1%', period: 'Feb 2026' },
  { id: 4, source: 'Upsells & Cross-sells', amount: 6800, change: '+15.4%', period: 'Feb 2026' },
  { id: 5, source: 'Marketplace Sales', amount: 4100, change: '-3.2%', period: 'Feb 2026' },
  { id: 6, source: 'Consulting Services', amount: 3500, change: '+5.6%', period: 'Feb 2026' },
];

const MOCK_COSTS = [
  { id: 1, category: 'Ad Spend', amount: 18200, pct: 37, trend: '+4.2%' },
  { id: 2, category: 'Software & Tools', amount: 4800, pct: 10, trend: '-1.1%' },
  { id: 3, category: 'Payroll', amount: 15600, pct: 32, trend: '0%' },
  { id: 4, category: 'Content Production', amount: 3200, pct: 7, trend: '+8.5%' },
  { id: 5, category: 'Fulfillment', amount: 4500, pct: 9, trend: '+2.3%' },
  { id: 6, category: 'Misc / Overhead', amount: 2700, pct: 5, trend: '-0.5%' },
];

export default function ProfitDashboardPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const totalRevenue = MOCK_REVENUE.reduce((a, r) => a + r.amount, 0);
  const totalCosts = MOCK_COSTS.reduce((a, c) => a + c.amount, 0);
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1);

  const generateProjection = async () => {
    setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/profit-dashboard/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'projection', prompt: `Analyze the following financial data and generate projections:\nTotal Revenue: $${totalRevenue.toLocaleString()}\nTotal Costs: $${totalCosts.toLocaleString()}\nNet Profit: $${netProfit.toLocaleString()}\nProfit Margin: ${profitMargin}%\nProvide 3-month, 6-month, and 12-month revenue and profit projections with recommendations.` }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>PROFIT DASHBOARD</p>
        <h1 className="text-2xl font-bold text-white mb-1">Profit & Loss Overview</h1>
        <p className="text-sm text-gray-500">Track revenue, costs, and profitability in real-time</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'REVENUE', value: `$${(totalRevenue / 1000).toFixed(1)}K`, sub: '+11.8% vs last month', color: '#22c55e' },
          { label: 'AD SPEND', value: `$${(18200 / 1000).toFixed(1)}K`, sub: '19.4% of revenue', color: '#f59e0b' },
          { label: 'NET PROFIT', value: `$${(netProfit / 1000).toFixed(1)}K`, sub: '+$4.2K vs last month', color: MODULE_COLOR },
          { label: 'PROFIT MARGIN', value: `${profitMargin}%`, sub: '+2.1% vs last month', color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4">
            <p className="hud-label mb-1">{s.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {['overview', 'revenue', 'costs', 'projections'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>REVENUE BREAKDOWN</p>
              <div className="space-y-2">
                {MOCK_REVENUE.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1 border-b border-indigo-500/[0.04] last:border-0">
                    <span className="text-xs text-gray-300">{r.source}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-gray-200">${r.amount.toLocaleString()}</span>
                      <span className="text-[10px] font-mono" style={{ color: r.change.startsWith('+') ? '#22c55e' : '#ef4444' }}>{r.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>COST BREAKDOWN</p>
              <div className="space-y-2">
                {MOCK_COSTS.slice(0, 4).map(c => (
                  <div key={c.id}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">{c.category}</span>
                      <span className="text-gray-500 font-mono">${c.amount.toLocaleString()} ({c.pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: MODULE_COLOR }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>MONTHLY P&L SUMMARY</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { month: 'December', revenue: 78200, profit: 28900, margin: '37.0%' },
                { month: 'January', revenue: 85600, profit: 32400, margin: '37.9%' },
                { month: 'February', revenue: totalRevenue, profit: netProfit, margin: `${profitMargin}%` },
              ].map((m, i) => (
                <div key={i} className="bg-white/[0.02] rounded-lg p-3 border border-indigo-500/[0.06]">
                  <p className="text-[10px] font-bold text-gray-400 mb-2">{m.month}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-mono text-gray-300">${m.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Net Profit</span>
                      <span className="font-mono" style={{ color: MODULE_COLOR }}>${m.profit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Margin</span>
                      <span className="font-mono text-gray-400">{m.margin}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue */}
      {tab === 'revenue' && (
        <div className="animate-fade-in">
          <div className="panel rounded-xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_REVENUE.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODULE_COLOR }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-300">{r.source}</p>
                    <p className="text-[10px] text-gray-500">{r.period}</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-white">${r.amount.toLocaleString()}</span>
                  <span className="text-xs font-mono w-16 text-right" style={{ color: r.change.startsWith('+') ? '#22c55e' : '#ef4444' }}>{r.change}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-indigo-500/[0.08] flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">TOTAL</span>
              <span className="text-lg font-mono font-bold" style={{ color: MODULE_COLOR }}>${totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Costs */}
      {tab === 'costs' && (
        <div className="animate-fade-in">
          <div className="panel rounded-xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_COSTS.map(c => (
                <div key={c.id} className="px-4 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-300">{c.category}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-white">${c.amount.toLocaleString()}</span>
                      <span className="text-[10px] font-mono text-gray-500">{c.pct}%</span>
                      <span className="text-[10px] font-mono" style={{ color: c.trend.startsWith('+') ? '#ef4444' : c.trend === '0%' ? '#6b7280' : '#22c55e' }}>{c.trend}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, background: `${MODULE_COLOR}90` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-indigo-500/[0.08] flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">TOTAL COSTS</span>
              <span className="text-lg font-mono font-bold text-red-400">${totalCosts.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Projections */}
      {tab === 'projections' && (
        <div className="animate-fade-in space-y-4">
          <div className="panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="hud-label" style={{ color: MODULE_COLOR }}>AI-POWERED PROJECTIONS</p>
              <button onClick={generateProjection} disabled={generating} className="chip text-[10px]" style={!generating ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
                {generating ? 'Generating...' : 'Generate Projections'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { period: '3 Month', revenue: '$285K', profit: '$108K', growth: '+14%' },
                { period: '6 Month', revenue: '$610K', profit: '$238K', growth: '+22%' },
                { period: '12 Month', revenue: '$1.34M', profit: '$536K', growth: '+31%' },
              ].map((p, i) => (
                <div key={i} className="bg-white/[0.02] rounded-lg p-3 border border-indigo-500/[0.06]">
                  <p className="text-[10px] font-bold text-gray-400 mb-2">{p.period} Forecast</p>
                  <p className="text-lg font-bold font-mono" style={{ color: MODULE_COLOR }}>{p.revenue}</p>
                  <p className="text-[10px] text-gray-500">projected revenue</p>
                  <div className="mt-2 flex justify-between text-[10px]">
                    <span className="text-gray-500">Profit</span>
                    <span className="font-mono text-gray-300">{p.profit}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Growth</span>
                    <span className="font-mono text-green-400">{p.growth}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'ANALYZING...' : 'ANALYSIS COMPLETE'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

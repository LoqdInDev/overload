import { useState } from 'react';

const MODULE_COLOR = '#16a34a';

const AI_TEMPLATES = [
  { name: 'Optimize Checkout Flow', prompt: 'Analyze the current checkout flow and suggest optimizations to reduce friction, minimize form fields, and improve conversion rates' },
  { name: 'Generate Upsell Copy', prompt: 'Write compelling upsell copy for post-add-to-cart and checkout page placements that increase average order value without feeling pushy' },
  { name: 'Cart Recovery Sequence', prompt: 'Design a multi-touch abandoned cart recovery sequence including emails, SMS, and retargeting ad copy with timing recommendations' },
  { name: 'Checkout A/B Test Plan', prompt: 'Create a comprehensive A/B testing plan for checkout optimization including hypotheses, variations, metrics, and statistical significance requirements' },
];

const MOCK_FLOWS = [
  { id: 1, name: 'Standard Checkout', steps: 4, conversion: 3.2, status: 'active', variant: 'Control' },
  { id: 2, name: 'Express Checkout', steps: 2, conversion: 4.8, status: 'active', variant: 'Test A' },
  { id: 3, name: 'One-Page Checkout', steps: 1, conversion: 5.1, status: 'testing', variant: 'Test B' },
  { id: 4, name: 'Guest Checkout v2', steps: 3, conversion: 3.9, status: 'paused', variant: 'Test C' },
];

const MOCK_TESTS = [
  { id: 1, name: 'CTA Button Color', control: 2.8, variant: 3.4, lift: '+21.4%', confidence: '97%', status: 'winner', days: 14 },
  { id: 2, name: 'Trust Badge Placement', control: 3.1, variant: 3.5, lift: '+12.9%', confidence: '94%', status: 'winner', days: 21 },
  { id: 3, name: 'Progress Bar vs Steps', control: 3.2, variant: 3.0, lift: '-6.3%', confidence: '88%', status: 'loser', days: 18 },
  { id: 4, name: 'Payment Method Order', control: 3.2, variant: 3.6, lift: '+12.5%', confidence: '82%', status: 'running', days: 7 },
  { id: 5, name: 'Free Shipping Threshold', control: 48.50, variant: 62.30, lift: '+28.5%', confidence: '99%', status: 'winner', days: 30 },
];

export default function CheckoutOptimizerPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/checkout-optimizer/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const flowStatusColor = (s) => s === 'active' ? '#22c55e' : s === 'testing' ? '#3b82f6' : '#6b7280';
  const testStatusColor = (s) => s === 'winner' ? '#22c55e' : s === 'loser' ? '#ef4444' : '#f59e0b';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>CHECKOUT OPTIMIZER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Checkout Optimization</h1>
        <p className="text-base text-gray-500">Maximize conversions and reduce cart abandonment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'CONVERSION RATE', value: '4.8%', sub: '+0.6% this month' },
          { label: 'CART ABANDONMENT', value: '62.3%', sub: '-4.1% vs last month' },
          { label: 'AVG ORDER VALUE', value: '$84.50', sub: '+$12.30 this month' },
          { label: 'RECOVERY RATE', value: '18.2%', sub: '142 carts recovered' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {['overview', 'flows', 'tests', 'ai-tools'].map(t => (
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
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>CHECKOUT FUNNEL</p>
              <div className="space-y-4">
                {[
                  { stage: 'Add to Cart', count: 8420, pct: 100 },
                  { stage: 'View Cart', count: 6240, pct: 74 },
                  { stage: 'Begin Checkout', count: 3850, pct: 46 },
                  { stage: 'Payment Info', count: 2190, pct: 26 },
                  { stage: 'Purchase', count: 1640, pct: 19 },
                ].map((step, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{step.stage}</span>
                      <span className="text-gray-500 font-mono">{step.count.toLocaleString()} ({step.pct}%)</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${step.pct}%`, background: `linear-gradient(90deg, ${MODULE_COLOR}, ${MODULE_COLOR}80)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>DROP-OFF REASONS</p>
              <div className="space-y-3">
                {[
                  { reason: 'High shipping costs', pct: 34 },
                  { reason: 'Required account creation', pct: 26 },
                  { reason: 'Complex checkout process', pct: 18 },
                  { reason: 'Payment security concerns', pct: 12 },
                  { reason: 'Slow page load time', pct: 10 },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-5">
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">{r.reason}</p>
                    </div>
                    <div className="w-24 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: MODULE_COLOR }} />
                    </div>
                    <span className="text-xs font-mono text-gray-500 w-8 text-right">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>RECOVERY CHANNELS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {[
                { channel: 'Email Sequence', recovered: 89, revenue: '$7,480', rate: '14.2%' },
                { channel: 'SMS Reminder', recovered: 34, revenue: '$2,890', rate: '22.1%' },
                { channel: 'Retargeting Ads', recovered: 19, revenue: '$1,610', rate: '8.7%' },
              ].map((c, i) => (
                <div key={i} className="bg-white/[0.02] rounded-lg p-5 border border-indigo-500/[0.06]">
                  <p className="text-xs font-bold text-gray-400 mb-3">{c.channel}</p>
                  <p className="text-xl font-bold text-white font-mono">{c.recovered}</p>
                  <p className="text-xs text-gray-500">carts recovered</p>
                  <div className="flex justify-between mt-3 text-xs">
                    <span className="text-gray-500">Revenue</span>
                    <span className="font-mono" style={{ color: MODULE_COLOR }}>{c.revenue}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Rate</span>
                    <span className="font-mono text-gray-400">{c.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Flows */}
      {tab === 'flows' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          {MOCK_FLOWS.map(flow => (
            <div key={flow.id} className="panel rounded-2xl p-4 sm:p-6 hover:border-green-600/20 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-base font-bold text-gray-200">{flow.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{flow.variant} &middot; {flow.steps} step{flow.steps > 1 ? 's' : ''}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${flowStatusColor(flow.status)}15`, color: flowStatusColor(flow.status), border: `1px solid ${flowStatusColor(flow.status)}25` }}>
                  {flow.status}
                </span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-bold font-mono" style={{ color: MODULE_COLOR }}>{flow.conversion}%</span>
                <span className="text-xs text-gray-500 mb-1">conversion rate</span>
              </div>
              <div className="mt-3 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(flow.conversion / 6) * 100}%`, background: MODULE_COLOR }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tests */}
      {tab === 'tests' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="divide-y divide-indigo-500/[0.04] min-w-[480px]">
                {MOCK_TESTS.map(test => (
                  <div key={test.id} className="px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <p className="text-sm font-semibold text-gray-300">{test.name}</p>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${testStatusColor(test.status)}15`, color: testStatusColor(test.status), border: `1px solid ${testStatusColor(test.status)}25` }}>
                          {test.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-600">{test.days} days</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-xs">
                      <div><span className="text-gray-500">Control</span><p className="font-mono font-bold text-gray-400 mt-0.5">{test.control}%</p></div>
                      <div><span className="text-gray-500">Variant</span><p className="font-mono font-bold text-gray-300 mt-0.5">{test.variant}%</p></div>
                      <div><span className="text-gray-500">Lift</span><p className="font-mono font-bold mt-0.5" style={{ color: test.lift.startsWith('+') ? '#22c55e' : '#ef4444' }}>{test.lift}</p></div>
                      <div><span className="text-gray-500">Confidence</span><p className="font-mono font-bold text-gray-400 mt-0.5">{test.confidence}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-green-600/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

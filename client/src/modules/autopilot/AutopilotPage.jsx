import { useState } from 'react';

const MODULE_COLOR = '#f59e0b';

const MODULES_LIST = [
  { id: 'content', name: 'Content', desc: 'Blog posts, articles, product descriptions' },
  { id: 'social', name: 'Social', desc: 'Social media posts across all platforms' },
  { id: 'email', name: 'Email', desc: 'Email campaigns, drips, newsletters' },
  { id: 'ads', name: 'Ads', desc: 'Ad creation, bidding, audience targeting' },
  { id: 'seo', name: 'SEO', desc: 'Keyword optimization, meta tags, rankings' },
];

const RISK_LEVELS = [
  { id: 'conservative', name: 'Conservative', desc: 'AI suggests, you approve everything', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { id: 'balanced', name: 'Balanced', desc: 'AI executes low-risk, you approve high-risk', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
  { id: 'aggressive', name: 'Aggressive', desc: 'AI handles everything, you review after', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
];

const MOCK_ACTIONS = [
  { id: 1, module: 'Content', action: 'Published blog post: "10 Email Marketing Tips for 2026"', status: 'completed', timestamp: '2:34 PM' },
  { id: 2, module: 'Social', action: 'Scheduled Instagram carousel for tomorrow 3 PM', status: 'completed', timestamp: '2:15 PM' },
  { id: 3, module: 'Ads', action: 'Increased Google Ads budget by 15% due to high ROAS', status: 'pending', timestamp: '2:10 PM' },
  { id: 4, module: 'Email', action: 'Created re-engagement campaign for inactive subscribers', status: 'pending', timestamp: '1:45 PM' },
  { id: 5, module: 'SEO', action: 'Updated meta descriptions for 12 product pages', status: 'completed', timestamp: '1:20 PM' },
  { id: 6, module: 'Social', action: 'Published Twitter thread on industry trends', status: 'completed', timestamp: '12:00 PM' },
  { id: 7, module: 'Content', action: 'Drafted landing page copy for Spring campaign', status: 'pending', timestamp: '11:30 AM' },
  { id: 8, module: 'Ads', action: 'Paused underperforming TikTok ad set', status: 'completed', timestamp: '10:45 AM' },
  { id: 9, module: 'Email', action: 'Sent weekly newsletter to 4.2K subscribers', status: 'completed', timestamp: '9:00 AM' },
  { id: 10, module: 'SEO', action: 'Submitted new sitemap with 8 updated pages', status: 'rejected', timestamp: '8:30 AM' },
];

const MOCK_INSIGHTS = [
  { title: 'Content Performance Up', desc: 'Blog traffic increased 23% since Autopilot began optimizing publish times and headlines.', type: 'positive' },
  { title: 'Email Open Rates Climbing', desc: 'AI-optimized subject lines have boosted open rates from 18% to 26% in 2 weeks.', type: 'positive' },
  { title: 'Ad Spend Efficiency', desc: 'Autopilot reduced CPA by 31% by reallocating budget from underperforming campaigns.', type: 'positive' },
  { title: 'Social Engagement Alert', desc: 'LinkedIn engagement dropped 12% this week. Consider increasing post frequency.', type: 'warning' },
];

const AI_TEMPLATES = [
  { name: 'Autopilot Strategy Review', prompt: 'Review the current autopilot configuration and suggest optimizations for better marketing performance across all automated modules' },
  { name: 'Risk Assessment Report', prompt: 'Generate a comprehensive risk assessment for the current autopilot settings including potential issues and mitigation strategies' },
  { name: 'Performance Forecast', prompt: 'Based on current autopilot performance data, forecast expected results for the next 30 days across all active modules' },
  { name: 'Optimization Playbook', prompt: 'Create a detailed optimization playbook for maximizing autopilot ROI including module-specific recommendations' },
];

const moduleColor = (m) => {
  const map = { Content: '#f97316', Social: '#3b82f6', Email: '#f59e0b', Ads: '#10b981', SEO: '#8b5cf6' };
  return map[m] || '#6b7280';
};

const statusColor = (s) => {
  const map = { completed: '#22c55e', pending: '#f59e0b', rejected: '#ef4444' };
  return map[s] || '#6b7280';
};

export default function AutopilotPage() {
  const [mode, setMode] = useState('setup');
  const [selectedModules, setSelectedModules] = useState([]);
  const [riskLevel, setRiskLevel] = useState('balanced');
  const [strategy, setStrategy] = useState('');
  const [dashTab, setDashTab] = useState('actions');
  const [actions, setActions] = useState(MOCK_ACTIONS);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Settings state (for dashboard settings tab)
  const [settingsModules, setSettingsModules] = useState({ content: true, social: true, email: true, ads: true, seo: true });
  const [settingsRisk, setSettingsRisk] = useState('balanced');

  const toggleModule = (id) => {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const activateAutopilot = () => {
    if (selectedModules.length === 0) return;
    setMode('dashboard');
  };

  const approveAction = (id) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
  };

  const rejectAction = (id) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
  };

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/autopilot/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  /* ---- SETUP MODE ---- */
  if (mode === 'setup') {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-8 mb-8 animate-fade-in text-center" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.12)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>THE CROWN JEWEL OF OVERLOAD</p>
          <h1 className="text-3xl font-bold text-white mb-2">Autopilot Mode</h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">Let AI run your entire marketing operation. Set your strategy, define guardrails, and watch Overload execute across every channel.</p>
        </div>

        {/* Step 1: Select Modules */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>1</div>
            <div>
              <p className="text-sm font-bold text-white">Select Modules to Automate</p>
              <p className="text-[10px] text-gray-500">Choose which marketing channels Autopilot controls</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {MODULES_LIST.map(mod => (
              <button key={mod.id} onClick={() => toggleModule(mod.id)}
                className={`rounded-xl p-4 text-left transition-all border ${
                  selectedModules.includes(mod.id)
                    ? 'bg-amber-500/10 border-amber-500/25'
                    : 'bg-white/[0.02] border-indigo-500/[0.08] hover:border-indigo-500/15'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    selectedModules.includes(mod.id) ? 'border-amber-500 bg-amber-500' : 'border-gray-600'
                  }`}>
                    {selectedModules.includes(mod.id) && (
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs font-bold ${selectedModules.includes(mod.id) ? 'text-amber-300' : 'text-gray-300'}`}>{mod.name}</p>
                </div>
                <p className="text-[9px] text-gray-500 ml-6">{mod.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Risk Level */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>2</div>
            <div>
              <p className="text-sm font-bold text-white">Set Risk Level</p>
              <p className="text-[10px] text-gray-500">How much autonomy should AI have?</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {RISK_LEVELS.map(level => (
              <button key={level.id} onClick={() => setRiskLevel(level.id)}
                className={`rounded-xl p-4 text-left transition-all border ${
                  riskLevel === level.id
                    ? 'bg-amber-500/10 border-amber-500/25'
                    : 'bg-white/[0.02] border-indigo-500/[0.08] hover:border-indigo-500/15'
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    riskLevel === level.id ? 'border-amber-500' : 'border-gray-600'
                  }`}>
                    {riskLevel === level.id && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                  </div>
                  <svg className={`w-5 h-5 ${riskLevel === level.id ? 'text-amber-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={level.icon} />
                  </svg>
                  <p className={`text-sm font-bold ${riskLevel === level.id ? 'text-amber-300' : 'text-gray-300'}`}>{level.name}</p>
                </div>
                <p className="text-[10px] text-gray-500 ml-7">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Strategy */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>3</div>
            <div>
              <p className="text-sm font-bold text-white">Define Your Strategy</p>
              <p className="text-[10px] text-gray-500">Tell Autopilot your brand goals and priorities</p>
            </div>
          </div>
          <div className="panel rounded-xl p-4">
            <textarea value={strategy} onChange={e => setStrategy(e.target.value)} rows={4}
              placeholder="Describe your brand goals, target audience, key messaging, and priorities. e.g., 'We are a DTC skincare brand targeting millennials. Focus on educational content, build trust through transparency, and drive conversions through email sequences...'"
              className="w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-amber-500/30 resize-none" />
            <button className="mt-2 chip text-[10px]" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI Suggest Strategy
            </button>
          </div>
        </div>

        {/* Activate Button */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button onClick={activateAutopilot} disabled={selectedModules.length === 0}
            className="w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: selectedModules.length > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#1e1e2e',
              color: selectedModules.length > 0 ? '#000' : '#6b7280',
              boxShadow: selectedModules.length > 0 ? '0 0 20px rgba(245,158,11,0.3), 0 4px 20px -4px rgba(245,158,11,0.5)' : 'none',
            }}>
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            ACTIVATE AUTOPILOT
          </button>
          {selectedModules.length === 0 && (
            <p className="text-[10px] text-gray-600 text-center mt-2">Select at least one module to activate</p>
          )}
        </div>
      </div>
    );
  }

  /* ---- DASHBOARD MODE ---- */
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Status Banner */}
      <div className="rounded-xl p-4 mb-6 flex items-center justify-between animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 absolute top-0 left-0 animate-ping opacity-50" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-300 tracking-wide">AUTOPILOT ACTIVE</p>
            <p className="text-[10px] text-gray-500">AI is managing your marketing operations</p>
          </div>
        </div>
        <button onClick={() => setMode('setup')} className="chip text-[10px]" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>
          Configure
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'ACTIONS TODAY', value: '24', sub: 'Across all modules' },
          { label: 'PENDING APPROVAL', value: '3', sub: 'Needs your review' },
          { label: 'SUCCESS RATE', value: '96%', sub: '+4% vs last week' },
          { label: 'REVENUE IMPACT', value: '+$2.4K', sub: 'Estimated this week' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4">
            <p className="hud-label mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {['actions', 'insights', 'settings'].map(t => (
          <button key={t} onClick={() => setDashTab(t)} className={`chip text-xs ${dashTab === t ? 'active' : ''}`} style={dashTab === t ? { background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' } : {}}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Actions Tab */}
      {dashTab === 'actions' && (
        <div className="space-y-2 animate-fade-in">
          {actions.map(a => (
            <div key={a.id} className="panel rounded-xl p-4 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(a.status) }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor(a.module)}15`, color: moduleColor(a.module), border: `1px solid ${moduleColor(a.module)}25` }}>
                    {a.module}
                  </span>
                  <span className="text-[10px] text-gray-600">{a.timestamp}</span>
                </div>
                <p className="text-xs text-gray-300">{a.action}</p>
              </div>
              {a.status === 'pending' ? (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => approveAction(a.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                    Approve
                  </button>
                  <button onClick={() => rejectAction(a.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                    Reject
                  </button>
                </div>
              ) : (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${statusColor(a.status)}15`, color: statusColor(a.status), border: `1px solid ${statusColor(a.status)}25` }}>
                  {a.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Insights Tab */}
      {dashTab === 'insights' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MOCK_INSIGHTS.map((insight, i) => (
              <div key={i} className="panel rounded-xl p-4" style={{ borderColor: insight.type === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: insight.type === 'warning' ? '#f59e0b' : '#22c55e' }} />
                  <p className="text-xs font-bold text-gray-200">{insight.title}</p>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{insight.desc}</p>
              </div>
            ))}
          </div>

          {/* AI Templates in Insights */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <p className="hud-label" style={{ color: MODULE_COLOR }}>AI ANALYSIS TOOLS</p>
              <div className="flex-1 h-px bg-indigo-500/[0.06]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {AI_TEMPLATES.map(tool => (
                <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-amber-500/20' : ''}`}>
                  <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                  <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
                </button>
              ))}
            </div>
            {(generating || output) && (
              <div className="panel rounded-xl p-5 mt-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? MODULE_COLOR : undefined }} />
                  <span className="hud-label" style={{ color: generating ? '#fbbf24' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {dashTab === 'settings' && (
        <div className="animate-fade-in space-y-6">
          {/* Module Toggles */}
          <div className="panel rounded-xl p-5">
            <p className="hud-label mb-4" style={{ color: MODULE_COLOR }}>ACTIVE MODULES</p>
            <div className="space-y-2">
              {MODULES_LIST.map(mod => (
                <button key={mod.id} onClick={() => setSettingsModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-xs transition-all ${
                    settingsModules[mod.id]
                      ? 'border-amber-500/20 bg-amber-500/5 text-amber-300'
                      : 'border-indigo-500/[0.08] bg-white/[0.01] text-gray-400'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      settingsModules[mod.id] ? 'border-amber-500 bg-amber-500' : 'border-gray-600'
                    }`}>
                      {settingsModules[mod.id] && (
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="font-semibold">{mod.name}</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-all flex items-center ${settingsModules[mod.id] ? 'justify-end' : 'justify-start'}`}
                    style={{ background: settingsModules[mod.id] ? 'rgba(245,158,11,0.4)' : '#333' }}>
                    <div className="w-3 h-3 rounded-full mx-0.5" style={{ background: settingsModules[mod.id] ? MODULE_COLOR : '#666' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Risk Level */}
          <div className="panel rounded-xl p-5">
            <p className="hud-label mb-4" style={{ color: MODULE_COLOR }}>RISK LEVEL</p>
            <div className="grid grid-cols-3 gap-2">
              {RISK_LEVELS.map(level => (
                <button key={level.id} onClick={() => setSettingsRisk(level.id)}
                  className={`rounded-lg p-3 text-center transition-all border ${
                    settingsRisk === level.id ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/[0.02] border-indigo-500/[0.08]'
                  }`}>
                  <p className={`text-xs font-bold ${settingsRisk === level.id ? 'text-amber-300' : 'text-gray-400'}`}>{level.name}</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">{level.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Pause Button */}
          <button onClick={() => setMode('setup')}
            className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
            PAUSE AUTOPILOT
          </button>
        </div>
      )}
    </div>
  );
}

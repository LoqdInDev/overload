import { useState, useEffect, useCallback, useRef } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, connectSSE } from '../../lib/api';

const MODULE_COLOR = '#f59e0b';

const MODULES_LIST = [
  { id: 'content', name: 'Content', desc: 'Blog posts, articles, product descriptions' },
  { id: 'social', name: 'Social', desc: 'Social media posts across all platforms' },
  { id: 'email-sms', name: 'Email', desc: 'Email campaigns, drips, newsletters' },
  { id: 'ads', name: 'Ads', desc: 'Ad creation, bidding, audience targeting' },
  { id: 'seo', name: 'SEO', desc: 'Keyword optimization, meta tags, rankings' },
  { id: 'video-marketing', name: 'Video', desc: 'Video scripts, hooks, storyboards' },
  { id: 'creative', name: 'Creative', desc: 'AI-generated ad visuals, product photos' },
  { id: 'reviews', name: 'Reviews', desc: 'Review monitoring and response drafts' },
  { id: 'reports', name: 'Reports', desc: 'Automated performance reports' },
  { id: 'pr-press', name: 'PR & Press', desc: 'Press releases, media outreach' },
  { id: 'influencers', name: 'Influencers', desc: 'Influencer outreach and management' },
  { id: 'customer-ai', name: 'Customer AI', desc: 'Customer intelligence and segmentation' },
];

const RISK_LEVELS = [
  { id: 'conservative', name: 'Conservative', desc: 'AI suggests, you approve everything', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { id: 'balanced', name: 'Balanced', desc: 'AI executes low-risk, you approve high-risk', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
  { id: 'aggressive', name: 'Aggressive', desc: 'AI handles everything, you review after', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
];

const AI_TEMPLATES = [
  { name: 'Strategy Review', prompt: 'Review the current autopilot configuration and suggest optimizations for better marketing performance across all automated modules' },
  { name: 'Risk Assessment', prompt: 'Generate a comprehensive risk assessment for the current autopilot settings including potential issues and mitigation strategies' },
  { name: 'Performance Forecast', prompt: 'Based on current autopilot performance data, forecast expected results for the next 30 days across all active modules' },
  { name: 'Optimization Playbook', prompt: 'Create a detailed optimization playbook for maximizing autopilot ROI including module-specific recommendations' },
];

const moduleColor = (m) => {
  const map = { content: '#f97316', social: '#3b82f6', 'email-sms': '#f59e0b', ads: '#10b981', seo: '#8b5cf6', 'video-marketing': '#ef4444', creative: '#06b6d4', reviews: '#ec4899', reports: '#6366f1', 'pr-press': '#14b8a6', influencers: '#f43f5e', 'customer-ai': '#a855f7' };
  return map[m] || '#6b7280';
};

const statusColor = (s) => {
  const map = { completed: '#22c55e', pending: '#f59e0b', failed: '#ef4444', cancelled: '#6b7280' };
  return map[s] || '#6b7280';
};

const moduleName = (id) => MODULES_LIST.find(m => m.id === id)?.name || id;

export default function AutopilotPage() {
  usePageTitle('Autopilot Mode');

  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [moduleModes, setModuleModes] = useState({});
  const [riskLevel, setRiskLevel] = useState('balanced');
  const [strategy, setStrategy] = useState('');
  const [activating, setActivating] = useState(false);

  // Dashboard state
  const [overview, setOverview] = useState(null);
  const [actions, setActions] = useState([]);
  const [approvals, setApprovals] = useState({ items: [], total: 0 });
  const [dashTab, setDashTab] = useState('actions');

  // AI generation
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const cancelRef = useRef(null);

  // 30-Day Strategy Generator
  const [strategyBusinessType, setStrategyBusinessType] = useState('');
  const [strategyGoal, setStrategyGoal] = useState('');
  const [strategyOutput, setStrategyOutput] = useState('');
  const [strategyLoading, setStrategyLoading] = useState(false);

  // Settings
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Load initial state ──────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [modesData, settingsData, overviewData] = await Promise.all([
        fetchJSON('/api/automation/modes'),
        fetchJSON('/api/automation/settings'),
        fetchJSON('/api/automation/actions/overview'),
      ]);

      setModuleModes(modesData);
      setSettings(settingsData);
      setOverview(overviewData);
      setRiskLevel(settingsData.riskLevel || 'balanced');
      setStrategy(settingsData.autopilotStrategy || '');

      const hasActive = Object.values(modesData).some(m => m.mode === 'autopilot' || m.mode === 'copilot');
      setMode(hasActive ? 'dashboard' : 'setup');
    } catch (err) {
      console.error('Failed to load autopilot data:', err);
      setMode('setup');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Polling ─────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'dashboard') return;

    const poll = async () => {
      try {
        const [overviewData, actionsData, approvalsData] = await Promise.all([
          fetchJSON('/api/automation/actions/overview'),
          fetchJSON('/api/automation/actions?limit=20'),
          fetchJSON('/api/automation/approvals?status=pending&limit=20'),
        ]);
        setOverview(overviewData);
        setActions(actionsData);
        setApprovals(approvalsData);
      } catch (err) {
        console.error('Autopilot poll error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [mode]);

  // ── Setup actions ───────────────────────────────────

  const toggleModule = (id) => {
    setModuleModes(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        mode: prev[id]?.mode === 'autopilot' ? 'manual' : 'autopilot',
      },
    }));
  };

  const activateAutopilot = async () => {
    const selected = Object.entries(moduleModes).filter(([, v]) => v.mode === 'autopilot');
    if (selected.length === 0) return;

    setActivating(true);
    try {
      const modeMap = { conservative: 'copilot', balanced: 'autopilot', aggressive: 'autopilot' };
      const targetMode = modeMap[riskLevel] || 'autopilot';

      await Promise.all(
        selected.map(([moduleId]) =>
          putJSON(`/api/automation/modes/${moduleId}`, { mode: targetMode, riskLevel })
        )
      );

      if (strategy.trim()) {
        await putJSON('/api/automation/settings', { autopilotStrategy: strategy, riskLevel });
      }

      setMode('dashboard');
    } catch (err) {
      console.error('Failed to activate autopilot:', err);
      alert('Failed to activate autopilot: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  // ── Dashboard actions ───────────────────────────────

  const approveItem = async (id) => {
    try {
      await postJSON(`/api/automation/approvals/${id}/approve`);
      setApprovals(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== id),
        total: prev.total - 1,
      }));
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  };

  const rejectItem = async (id) => {
    try {
      await postJSON(`/api/automation/approvals/${id}/reject`);
      setApprovals(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== id),
        total: prev.total - 1,
      }));
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  };

  const pauseAutopilot = async () => {
    try {
      await putJSON('/api/automation/settings', { pauseAll: 'true' });
      setMode('setup');
      loadData();
    } catch (err) {
      alert('Failed to pause: ' + err.message);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await putJSON('/api/automation/settings', settings);
      for (const [moduleId, data] of Object.entries(moduleModes)) {
        if (data._dirty) {
          await putJSON(`/api/automation/modes/${moduleId}`, { mode: data.mode, riskLevel: data.riskLevel || riskLevel });
        }
      }
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // ── AI generation ───────────────────────────────────

  const generate = (template) => {
    setSelectedTemplate(template);
    setGenerating(true);
    setOutput('');

    cancelRef.current = connectSSE('/api/autopilot/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => {
        if (data?.content) setOutput(data.content);
        setGenerating(false);
      },
      onError: (err) => {
        console.error('Generation error:', err);
        setGenerating(false);
      },
      onDone: () => setGenerating(false),
    });
  };

  // ── Loading ─────────────────────────────────────────

  if (loading || mode === null) {
    return (
      <div className="p-4 sm:p-6 lg:p-12 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Autopilot...</p>
        </div>
      </div>
    );
  }

  // ── SETUP MODE ──────────────────────────────────────

  if (mode === 'setup') {
    const selectedCount = Object.values(moduleModes).filter(m => m.mode === 'autopilot').length;

    return (
      <div className="p-4 sm:p-6 lg:p-12">
        {/* Hero */}
        <div className="rounded-2xl p-5 sm:p-10 mb-6 sm:mb-10 animate-fade-in text-center" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.12)' }}>
          <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>THE CROWN JEWEL OF OVERLOAD</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">Autopilot Mode</h1>
          <p className="text-gray-400 text-base max-w-md mx-auto">Let AI run your entire marketing operation. Set your strategy, define guardrails, and watch Overload execute across every channel.</p>
        </div>

        {/* Step 1: Select Modules */}
        <div className="mb-6 sm:mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>1</div>
            <div>
              <p className="text-base font-bold text-white">Select Modules to Automate</p>
              <p className="text-xs text-gray-500">Choose which marketing channels Autopilot controls</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MODULES_LIST.map(mod => {
              const isSelected = moduleModes[mod.id]?.mode === 'autopilot';
              return (
                <button key={mod.id} onClick={() => toggleModule(mod.id)}
                  className={`rounded-xl p-4 text-left transition-all border ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/25'
                      : 'bg-white/[0.02] border-indigo-500/[0.08] hover:border-indigo-500/15'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ background: moduleColor(mod.id) }} />
                    <p className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-gray-300'}`}>{mod.name}</p>
                  </div>
                  <p className="text-[10px] text-gray-500 ml-7">{mod.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Risk Level */}
        <div className="mb-6 sm:mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>2</div>
            <div>
              <p className="text-base font-bold text-white">Set Risk Level</p>
              <p className="text-xs text-gray-500">How much autonomy should AI have?</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RISK_LEVELS.map(level => (
              <button key={level.id} onClick={() => setRiskLevel(level.id)}
                className={`rounded-xl p-4 sm:p-6 text-left transition-all border ${
                  riskLevel === level.id
                    ? 'bg-amber-500/10 border-amber-500/25'
                    : 'bg-white/[0.02] border-indigo-500/[0.08] hover:border-indigo-500/15'
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    riskLevel === level.id ? 'border-amber-500' : 'border-gray-600'
                  }`}>
                    {riskLevel === level.id && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                  </div>
                  <svg className={`w-6 h-6 ${riskLevel === level.id ? 'text-amber-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={level.icon} />
                  </svg>
                  <p className={`text-base font-bold ${riskLevel === level.id ? 'text-amber-300' : 'text-gray-300'}`}>{level.name}</p>
                </div>
                <p className="text-xs text-gray-500 ml-8">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Strategy */}
        <div className="mb-6 sm:mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>3</div>
            <div>
              <p className="text-base font-bold text-white">Define Your Strategy</p>
              <p className="text-xs text-gray-500">Tell Autopilot your brand goals and priorities</p>
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <textarea value={strategy} onChange={e => setStrategy(e.target.value)} rows={4}
              placeholder="Describe your brand goals, target audience, key messaging, and priorities..."
              className="w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base text-gray-200 focus:outline-none focus:border-amber-500/30 resize-none" />
          </div>
        </div>

        {/* Activate Button */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button onClick={activateAutopilot} disabled={selectedCount === 0 || activating}
            className="w-full py-5 rounded-xl text-base font-bold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: selectedCount > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#1e1e2e',
              color: selectedCount > 0 ? '#000' : '#6b7280',
              boxShadow: selectedCount > 0 ? '0 0 20px rgba(245,158,11,0.3), 0 4px 20px -4px rgba(245,158,11,0.5)' : 'none',
            }}>
            {activating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ACTIVATING...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                ACTIVATE AUTOPILOT ({selectedCount} modules)
              </>
            )}
          </button>
          {selectedCount === 0 && (
            <p className="text-xs text-gray-600 text-center mt-2">Select at least one module to activate</p>
          )}
        </div>
      </div>
    );
  }

  /* ── DASHBOARD MODE ──────────────────────────────── */

  const stats = overview || {};

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      {/* Status Banner */}
      <div className="rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 absolute top-0 left-0 animate-ping opacity-50" />
          </div>
          <div>
            <p className="text-base font-bold text-amber-300 tracking-wide">AUTOPILOT ACTIVE</p>
            <p className="text-xs text-gray-500">
              {stats.autopilotModules || 0} modules in autopilot, {stats.copilotModules || 0} in copilot
            </p>
          </div>
        </div>
        <button onClick={() => { setMode('setup'); loadData(); }} className="chip text-[10px] self-start sm:self-auto" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>
          Configure
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'ACTIONS TODAY', value: stats.actionsToday ?? '—', sub: `${stats.actionsThisWeek ?? 0} this week` },
          { label: 'PENDING APPROVAL', value: approvals.total ?? stats.pendingApprovals ?? '—', sub: 'Needs your review' },
          { label: 'SUCCESS RATE', value: stats.successRate != null ? `${stats.successRate}%` : '—', sub: `${stats.totalActions ?? 0} total actions` },
          { label: 'ACTIVE RULES', value: stats.activeRules ?? '—', sub: 'Automation rules running' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {[
          { id: 'actions', label: 'Actions' },
          { id: 'approvals', label: `Approvals${approvals.total ? ` (${approvals.total})` : ''}` },
          { id: 'insights', label: 'AI Insights' },
          { id: 'settings', label: 'Settings' },
        ].map(t => (
          <button key={t.id} onClick={() => setDashTab(t.id)} className={`chip text-xs ${dashTab === t.id ? 'active' : ''}`} style={dashTab === t.id ? { background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Actions Tab */}
      {dashTab === 'actions' && (
        <div className="space-y-3 animate-fade-in">
          {actions.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No actions yet. The rule engine will generate actions as rules trigger.</p>
            </div>
          ) : actions.map(a => (
            <div key={a.id} className="panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3 sm:contents">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(a.status) }} />
                <div className="flex items-center gap-2 sm:hidden">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor(a.module_id)}15`, color: moduleColor(a.module_id), border: `1px solid ${moduleColor(a.module_id)}25` }}>
                    {moduleName(a.module_id)}
                  </span>
                  <span className="text-xs text-gray-600">{a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="hidden sm:flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor(a.module_id)}15`, color: moduleColor(a.module_id), border: `1px solid ${moduleColor(a.module_id)}25` }}>
                    {moduleName(a.module_id)}
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono">{a.action_type}</span>
                  <span className="text-xs text-gray-600">{a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <p className="text-sm text-gray-300 truncate">{a.description}</p>
                {a.duration_ms > 0 && <p className="text-[10px] text-gray-600 mt-0.5">{(a.duration_ms / 1000).toFixed(1)}s</p>}
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${statusColor(a.status)}15`, color: statusColor(a.status), border: `1px solid ${statusColor(a.status)}25` }}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Approvals Tab */}
      {dashTab === 'approvals' && (
        <div className="space-y-3 animate-fade-in">
          {approvals.items.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No pending approvals. Items will appear here when copilot rules trigger.</p>
            </div>
          ) : approvals.items.map(item => (
            <div key={item.id} className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor(item.moduleId)}15`, color: moduleColor(item.moduleId), border: `1px solid ${moduleColor(item.moduleId)}25` }}>
                  {moduleName(item.moduleId)}
                </span>
                {item.confidence != null && (
                  <span className="text-[9px] text-gray-500 font-mono">{item.confidence}% confidence</span>
                )}
                <span className="text-xs text-gray-600 ml-auto">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-sm font-semibold text-gray-200 mb-1">{item.title}</p>
              <p className="text-xs text-gray-400 mb-3">{item.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => approveItem(item.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-110" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                  Approve
                </button>
                <button onClick={() => rejectItem(item.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-110" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Insights Tab */}
      {dashTab === 'insights' && (
        <div className="animate-fade-in space-y-6">
          {/* 30-Day Strategy Generator */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>30-DAY STRATEGY GENERATOR</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Business type (e.g. SaaS, E-commerce)"
                value={strategyBusinessType}
                onChange={e => setStrategyBusinessType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Main goal (e.g. Increase signups by 40%)"
                value={strategyGoal}
                onChange={e => setStrategyGoal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
              />
            </div>
            <button
              disabled={strategyLoading || !strategyGoal.trim()}
              onClick={() => {
                setStrategyLoading(true);
                setStrategyOutput('');
                connectSSE('/api/autopilot/generate-strategy', { business_type: strategyBusinessType, goal: strategyGoal }, {
                  onChunk: (text) => setStrategyOutput(p => p + text),
                  onResult: (data) => { setStrategyOutput(data.content); setStrategyLoading(false); },
                  onError: () => setStrategyLoading(false),
                  onDone: () => setStrategyLoading(false),
                });
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: strategyLoading ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.7)' }}
            >
              {strategyLoading ? 'Generating Strategy...' : 'Generate 30-Day Strategy'}
            </button>
            {strategyOutput && (
              <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{strategyOutput}{strategyLoading && <span className="inline-block w-1 h-3.5 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>AI ANALYSIS TOOLS</p>
              <div className="flex-1 h-px bg-indigo-500/[0.06]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {AI_TEMPLATES.map(tool => (
                <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-amber-500/20' : ''}`}>
                  <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
                </button>
              ))}
            </div>
            {(generating || output) && (
              <div className="panel rounded-2xl p-4 sm:p-7 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? MODULE_COLOR : undefined }} />
                  <span className="hud-label text-[11px]" style={{ color: generating ? '#fbbf24' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
                </div>
                <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {dashTab === 'settings' && settings && (
        <div className="animate-fade-in space-y-4 sm:space-y-8">
          {/* Module Modes */}
          <div className="panel rounded-2xl p-4 sm:p-7">
            <p className="hud-label text-[11px] mb-5" style={{ color: MODULE_COLOR }}>MODULE MODES</p>
            <div className="space-y-2">
              {MODULES_LIST.map(mod => {
                const current = moduleModes[mod.id]?.mode || 'manual';
                return (
                  <div key={mod.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-indigo-500/[0.08] bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: moduleColor(mod.id) }} />
                      <span className="text-sm font-semibold text-gray-300">{mod.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {['manual', 'copilot', 'autopilot'].map(m => (
                        <button key={m} onClick={() => {
                          setModuleModes(prev => ({
                            ...prev,
                            [mod.id]: { ...prev[mod.id], mode: m, _dirty: true },
                          }));
                        }}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            current === m
                              ? m === 'autopilot' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : m === 'copilot' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              : 'text-gray-600 hover:text-gray-400'
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Safety Limits */}
          <div className="panel rounded-2xl p-4 sm:p-7">
            <p className="hud-label text-[11px] mb-5" style={{ color: MODULE_COLOR }}>SAFETY LIMITS</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max actions / day</label>
                <input type="number" value={settings.maxActionsPerDay || 50}
                  onChange={e => setSettings(prev => ({ ...prev, maxActionsPerDay: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max actions / hour</label>
                <input type="number" value={settings.maxActionsPerHour || 10}
                  onChange={e => setSettings(prev => ({ ...prev, maxActionsPerHour: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Confidence threshold (%)</label>
                <input type="number" value={settings.confidenceThreshold || 70}
                  onChange={e => setSettings(prev => ({ ...prev, confidenceThreshold: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-indigo-500/[0.08] rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500/30" />
              </div>
            </div>
          </div>

          {/* Save + Pause */}
          <div className="flex gap-3">
            <button onClick={saveSettings} disabled={savingSettings}
              className="flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
            <button onClick={pauseAutopilot}
              className="py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
              Pause
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

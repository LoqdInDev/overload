import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAutomation } from '../../context/AutomationContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useToast } from '../../context/ToastContext';
import { fetchJSON, putJSON, postJSON } from '../../lib/api';

export default function AutomationSettingsPage() {
  usePageTitle('Automation Settings');
  const { dark } = useTheme();
  const { modes, setMode, refreshModes } = useAutomation();
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Execution Log state
  const [execLog, setExecLog] = useState([]);
  const [logLoaded, setLogLoaded] = useState(false);
  const [logLoading, setLogLoading] = useState(false);

  // Analyze Automation state
  const [analysisData, setAnalysisData] = useState({});
  const [analyzingId, setAnalyzingId] = useState(null);

  const cardBg = dark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  useEffect(() => {
    fetchJSON('/api/automation/settings')
      .then(data => setSettings(data))
      .catch(() => setSettings({
        pauseAll: 'false', defaultMode: 'manual', maxActionsPerDay: '50',
        maxActionsPerHour: '10', monthlyBudgetLimit: '0', confidenceThreshold: '70',
        notifyNewSuggestions: 'true', notifyCompletedActions: 'true',
        notifyFailedActions: 'true', notifyRuleTriggers: 'true', riskLevel: 'balanced',
      }))
      .finally(() => setLoading(false));
  }, []);

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await putJSON('/api/automation/settings', settings);
      setDirty(false);
      toast.success('Settings saved', 'Your automation preferences have been updated');
    } catch {
      toast.error('Save failed', 'Could not save settings — try again');
    }
    setSaving(false);
  }

  async function pauseAll() {
    setPausing(true);
    try {
      const currentModes = {};
      for (const [id, data] of Object.entries(modes)) {
        if (data.mode !== 'manual') currentModes[id] = data.mode;
      }
      await putJSON('/api/automation/settings', { pauseAll: 'true', previousModes: JSON.stringify(currentModes) });
      for (const id of Object.keys(currentModes)) {
        await setMode(id, 'manual');
      }
      update('pauseAll', 'true');
      refreshModes();
      toast.warning('Automation paused', 'All modules set to manual mode');
    } catch {
      toast.error('Pause failed', 'Could not pause automation — try again');
    }
    setPausing(false);
  }

  async function resumeAll() {
    setPausing(true);
    try {
      const prevModes = JSON.parse(settings.previousModes || '{}');
      for (const [id, mode] of Object.entries(prevModes)) {
        await setMode(id, mode);
      }
      await putJSON('/api/automation/settings', { pauseAll: 'false' });
      update('pauseAll', 'false');
      refreshModes();
      toast.success('Automation resumed', 'Modules restored to previous modes');
    } catch {
      toast.error('Resume failed', 'Could not resume automation — try again');
    }
    setPausing(false);
  }

  if (loading || !settings) {
    return (
      <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
        <div className="max-w-3xl mx-auto space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} />)}
        </div>
      </div>
    );
  }

  const isPaused = settings.pauseAll === 'true';
  const sectionStyle = { background: cardBg, border: `1px solid ${cardBorder}` };
  const labelStyle = { color: textSecondary, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary };

  function Toggle({ checked, onChange }) {
    return (
      <button type="button" onClick={() => onChange(!checked)}
        className="w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0"
        style={{ background: checked ? '#22c55e' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200" style={{ left: checked ? '18px' : '2px' }} />
      </button>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#D4A017' }}>Settings</div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif', color: textPrimary }}>
            Automation Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            Configure global automation behavior, safety limits, and preferences
          </p>
        </div>

        {/* Save Bar */}
        {dirty && (
          <div className="sticky top-0 z-10 mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl" style={{
            background: dark ? 'rgba(94,142,110,0.15)' : 'rgba(94,142,110,0.1)',
            border: '1px solid rgba(94,142,110,0.2)',
          }}>
            <span className="text-xs font-medium" style={{ color: '#5E8E6E' }}>Unsaved changes</span>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#5E8E6E', color: '#fff' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* Section 1: Global Controls */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <h2 className="text-sm font-bold mb-4" style={{ color: textPrimary }}>Global Controls</h2>
            {isPaused ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#ef4444' }}>All automation is paused</p>
                  <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>All modules are running in manual mode</p>
                </div>
                <button onClick={resumeAll} disabled={pausing}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                  {pausing ? 'Resuming...' : 'Resume Automation'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: textPrimary }}>Automation is running</p>
                  <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>Pause to set all modules to manual mode instantly</p>
                </div>
                <button onClick={pauseAll} disabled={pausing}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {pausing ? 'Pausing...' : 'Pause All Automation'}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Default Mode */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <h2 className="text-sm font-bold mb-1" style={{ color: textPrimary }}>Default Mode</h2>
            <p className="text-[11px] mb-4" style={{ color: textSecondary }}>Default mode for newly configured modules</p>
            <div className="flex gap-2">
              {[
                { id: 'manual', label: 'Manual', color: '#94908A' },
                { id: 'copilot', label: 'Copilot', color: '#D4A017' },
                { id: 'autopilot', label: 'Autopilot', color: '#22c55e' },
              ].map(m => (
                <button key={m.id} onClick={() => update('defaultMode', m.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: settings.defaultMode === m.id ? `${m.color}1a` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                    color: settings.defaultMode === m.id ? m.color : textSecondary,
                    border: `1px solid ${settings.defaultMode === m.id ? m.color + '33' : 'transparent'}`,
                  }}>{m.label}</button>
              ))}
            </div>
          </div>

          {/* Section 3: Safety Limits */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <h2 className="text-sm font-bold mb-1" style={{ color: textPrimary }}>Safety Limits</h2>
            <p className="text-[11px] mb-4" style={{ color: textSecondary }}>Set guardrails for automated actions</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'maxActionsPerDay', label: 'Max Actions / Day' },
                { key: 'maxActionsPerHour', label: 'Max Actions / Hour' },
                { key: 'monthlyBudgetLimit', label: 'Monthly Budget Limit ($)' },
                { key: 'confidenceThreshold', label: 'Confidence Threshold (%)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block mb-1" style={labelStyle}>{label}</label>
                  <input type="number" value={settings[key] || ''}
                    onChange={e => update(key, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Notification Preferences */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <h2 className="text-sm font-bold mb-1" style={{ color: textPrimary }}>Notification Preferences</h2>
            <p className="text-[11px] mb-4" style={{ color: textSecondary }}>Choose which events trigger notifications</p>
            <div className="space-y-3">
              {[
                { key: 'notifyNewSuggestions', label: 'New AI suggestions ready for review' },
                { key: 'notifyCompletedActions', label: 'Autopilot actions completed' },
                { key: 'notifyFailedActions', label: 'Failed automation actions' },
                { key: 'notifyRuleTriggers', label: 'Automation rules triggered' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: textPrimary }}>{label}</span>
                  <Toggle checked={settings[key] === 'true'} onChange={v => update(key, v ? 'true' : 'false')} />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Risk Level */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <h2 className="text-sm font-bold mb-1" style={{ color: textPrimary }}>Risk Level</h2>
            <p className="text-[11px] mb-4" style={{ color: textSecondary }}>Controls how aggressively automation operates</p>
            <div className="space-y-2">
              {[
                { id: 'conservative', label: 'Conservative', desc: 'More approvals required, lower action limits, higher confidence thresholds' },
                { id: 'balanced', label: 'Balanced', desc: 'Standard operation — recommended for most users' },
                { id: 'aggressive', label: 'Aggressive', desc: 'Fewer guardrails, higher limits, faster execution' },
              ].map(r => (
                <button key={r.id} onClick={() => update('riskLevel', r.id)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: settings.riskLevel === r.id
                      ? (r.id === 'conservative' ? 'rgba(59,130,246,0.06)' : r.id === 'balanced' ? 'rgba(94,142,110,0.08)' : 'rgba(239,68,68,0.06)')
                      : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                    border: `1px solid ${settings.riskLevel === r.id
                      ? (r.id === 'conservative' ? 'rgba(59,130,246,0.2)' : r.id === 'balanced' ? 'rgba(94,142,110,0.2)' : 'rgba(239,68,68,0.2)')
                      : 'transparent'}`,
                  }}>
                  <div className="text-xs font-semibold" style={{ color: textPrimary }}>{r.label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: textSecondary }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Section 6: Execution Log */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold" style={{ color: textPrimary }}>Execution Log</h2>
              <button
                onClick={async () => {
                  if (logLoaded) { setLogLoaded(false); setExecLog([]); return; }
                  setLogLoading(true);
                  try {
                    const res = await fetchJSON('/api/automation/execution-log');
                    setExecLog(res.logs || []);
                    setLogLoaded(true);
                  } catch { setExecLog([]); setLogLoaded(true); } finally { setLogLoading(false); }
                }}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: textSecondary }}
              >
                {logLoading ? 'Loading...' : logLoaded ? 'Hide Log' : 'View Execution Log'}
              </button>
            </div>
            <p className="text-[11px] mb-4" style={{ color: textSecondary }}>Recent automation execution history</p>
            {logLoaded && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {execLog.length === 0 ? (
                  <p className="text-xs italic" style={{ color: textSecondary }}>No execution history yet.</p>
                ) : (
                  execLog.slice(0, 20).map((log, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs" style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: log.status === 'completed' ? '#22c55e' : log.status === 'failed' ? '#ef4444' : '#f59e0b' }} />
                      <span className="flex-1 truncate" style={{ color: textPrimary }}>{log.description || log.action_type || 'Action'}</span>
                      <span className="flex-shrink-0 font-mono" style={{ color: textSecondary }}>{log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 7: Analyze Automation Rule */}
          <div className="rounded-2xl p-5" style={sectionStyle}>
            <h2 className="text-sm font-bold mb-1" style={{ color: textPrimary }}>Analyze Automation Rule</h2>
            <p className="text-[11px] mb-4" style={{ color: textSecondary }}>Get AI analysis on any automation rule</p>
            <AnalyzeRulePanel
              dark={dark}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              inputStyle={inputStyle}
              analysisData={analysisData}
              setAnalysisData={setAnalysisData}
              analyzingId={analyzingId}
              setAnalyzingId={setAnalyzingId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyzeRulePanel({ dark, textPrimary, textSecondary, inputStyle, analysisData, setAnalysisData, analyzingId, setAnalyzingId }) {
  const [ruleName, setRuleName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');

  const analyze = async () => {
    if (!ruleName.trim()) return;
    const key = ruleName.trim();
    setAnalyzingId(key);
    try {
      const result = await postJSON('/api/automation/analyze-automation', { rule_name: ruleName, trigger, action });
      setAnalysisData(prev => ({ ...prev, [key]: result }));
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const result = analysisData[ruleName.trim()];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <input
          type="text"
          placeholder="Rule name"
          value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Trigger (e.g. New lead)"
          value={trigger}
          onChange={e => setTrigger(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Action (e.g. Send email)"
          value={action}
          onChange={e => setAction(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        />
      </div>
      <button
        disabled={!ruleName.trim() || analyzingId === ruleName.trim()}
        onClick={analyze}
        className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        style={{ background: 'rgba(212,160,23,0.15)', color: '#D4A017', border: '1px solid rgba(212,160,23,0.2)' }}
      >
        {analyzingId === ruleName.trim() ? 'Analyzing...' : 'Analyze Rule'}
      </button>
      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px]" style={{ color: textSecondary }}>Effectiveness</p>
              <p className="text-lg font-bold font-mono" style={{ color: '#D4A017' }}>{result.effectiveness_score}/10</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: textSecondary }}>Est. Monthly Savings</p>
              <p className="text-lg font-bold font-mono text-emerald-400">{result.estimated_monthly_savings_hours}h</p>
            </div>
          </div>
          {result.expected_impact && (
            <p className="text-xs italic" style={{ color: textSecondary }}>{result.expected_impact}</p>
          )}
          {result.enhancement_suggestions?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-emerald-400 mb-1">Enhancement Suggestions</p>
              <ul className="space-y-1">
                {result.enhancement_suggestions.map((s, i) => <li key={i} className="text-xs" style={{ color: textSecondary }}>+ {s}</li>)}
              </ul>
            </div>
          )}
          {result.potential_issues?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-red-400 mb-1">Potential Issues</p>
              <ul className="space-y-1">
                {result.potential_issues.map((iss, i) => <li key={i} className="text-xs" style={{ color: textSecondary }}>- {iss}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAutomation } from '../../context/AutomationContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, putJSON } from '../../lib/api';

export default function AutomationSettingsPage() {
  usePageTitle('Automation Settings');
  const { dark } = useTheme();
  const { modes, setMode, refreshModes } = useAutomation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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
    } catch { /* silent */ }
    setSaving(false);
  }

  async function pauseAll() {
    // Store current modes then set all to manual
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
  }

  async function resumeAll() {
    try {
      const prevModes = JSON.parse(settings.previousModes || '{}');
      for (const [id, mode] of Object.entries(prevModes)) {
        await setMode(id, mode);
      }
      await putJSON('/api/automation/settings', { pauseAll: 'false' });
      update('pauseAll', 'false');
      refreshModes();
    } catch { /* silent */ }
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
        className="w-9 h-5 rounded-full transition-all relative flex-shrink-0"
        style={{ background: checked ? '#22c55e' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: checked ? '18px' : '2px' }} />
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
              className="px-4 py-1.5 rounded-lg text-xs font-semibold"
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
                <button onClick={resumeAll}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                  Resume Automation
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: textPrimary }}>Automation is running</p>
                  <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>Pause to set all modules to manual mode instantly</p>
                </div>
                <button onClick={pauseAll}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Pause All Automation
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
        </div>
      </div>
    </div>
  );
}

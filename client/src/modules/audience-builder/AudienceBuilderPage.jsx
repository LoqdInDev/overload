import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const AI_TEMPLATES = [
  { name: 'Build Custom Audience', prompt: 'Design a custom audience strategy based on customer behavior signals and purchase patterns for maximum conversion potential' },
  { name: 'Generate Lookalike Strategy', prompt: 'Create a lookalike audience expansion strategy with seed audience recommendations and percentage tiers' },
  { name: 'Audience Overlap Analysis', prompt: 'Analyze potential audience overlap between segments and recommend consolidation or exclusion strategies' },
  { name: 'Targeting Recommendations', prompt: 'Provide targeting recommendations for each stage of the funnel with audience layering strategies' },
];

const PLATFORM_OPTIONS = ['Meta', 'Google', 'TikTok'];
const TYPE_OPTIONS = ['custom', 'lookalike', 'interest'];

export default function AudienceBuilderPage() {
  usePageTitle('Audience Builder');
  const [tab, setTab] = useState('audiences');
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddAudience, setShowAddAudience] = useState(false);
  const [newAudience, setNewAudience] = useState({ name: '', platform: 'Meta', type: 'custom', size: '', status: 'active' });
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [seedDescription, setSeedDescription] = useState('');
  const [lookalikeOutput, setLookalikeOutput] = useState('');
  const [lookalikeLoading, setLookalikeLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchJSON('/api/audience-builder/audiences')
      .then(res => setAudiences(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addAudience = async () => {
    if (!newAudience.name.trim()) return;
    try {
      const res = await postJSON('/api/audience-builder/audiences', {
        ...newAudience,
        size: newAudience.size ? parseInt(newAudience.size, 10) : null,
      });
      setAudiences(prev => [res.data, ...prev]);
      setNewAudience({ name: '', platform: 'Meta', type: 'custom', size: '', status: 'active' });
      setShowAddAudience(false);
    } catch (err) { console.error(err); }
  };

  const removeAudience = async (id) => {
    try {
      await deleteJSON(`/api/audience-builder/audiences/${id}`);
      setAudiences(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/audience-builder/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const platformColors = { Meta: 'text-blue-400 bg-blue-500/10 border-blue-500/20', Google: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', TikTok: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
  const typeLabels = { custom: 'Custom', lookalike: 'Lookalike', interest: 'Interest' };

  // Compute stats from real data
  const totalAudiences = audiences.length;
  const totalReach = audiences.reduce((sum, a) => sum + (a.size || 0), 0);
  const lookalikes = audiences.filter(a => a.type === 'lookalike').length;
  const activeAudiences = audiences.filter(a => a.status === 'active').length;

  const formatReach = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8 animate-fade-in"><div><p className="hud-label text-[11px] mb-2" style={{ color: '#8b5cf6' }}>AUDIENCE BUILDER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Audience Builder</h1><p className="text-base text-gray-500">Build, manage, and optimize audiences across platforms</p></div></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { l: 'TOTAL AUDIENCES', v: totalAudiences.toString() },
          { l: 'TOTAL REACH', v: formatReach(totalReach) },
          { l: 'ACTIVE', v: activeAudiences.toString() },
          { l: 'LOOKALIKES', v: lookalikes.toString() },
        ].map((s, i) => (
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-2">{s.l}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {['audiences', 'ai-tools', 'lookalike'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t === 'lookalike' ? 'Lookalike Builder' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>

      {tab === 'audiences' && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddAudience(!showAddAudience)} className="chip text-[10px]" style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' }}>+ Add Audience</button>
          </div>
          {showAddAudience && (
            <div className="panel rounded-2xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input value={newAudience.name} onChange={e => setNewAudience({ ...newAudience, name: e.target.value })} placeholder="Audience name" className="input-field rounded px-3 py-2 text-xs sm:col-span-2" />
                <select value={newAudience.platform} onChange={e => setNewAudience({ ...newAudience, platform: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={newAudience.type} onChange={e => setNewAudience({ ...newAudience, type: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
                </select>
                <input value={newAudience.size} onChange={e => setNewAudience({ ...newAudience, size: e.target.value })} placeholder="Size (e.g. 45000)" type="number" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <button onClick={addAudience} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: '#8b5cf6' }}>Create Audience</button>
            </div>
          )}
          {loading ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-sm text-gray-600">Loading audiences...</p></div>
          ) : audiences.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-500">No audiences yet</p>
              <p className="text-xs text-gray-600 mt-1">Create your first audience to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {audiences.map(a => (
                <div key={a.id} className="group panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-200">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{typeLabels[a.type] || a.type} {a.size ? `\u2022 ${formatReach(a.size)} reach` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.platform && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${platformColors[a.platform] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>{a.platform}</span>}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>{a.status}</span>
                    <button onClick={() => removeAudience(a.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ai-tools' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-violet-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{t.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'bg-violet-400 animate-pulse' : 'bg-violet-400'}`} />
                <span className="hud-label text-[11px]" style={{ color: '#a78bfa' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          )}
        </div>
      )}

      {tab === 'lookalike' && (
        <div className="animate-fade-in mt-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Lookalike Audience Builder</p>
                <p className="text-xs text-gray-500">Describe your best customers and AI will build a matching audience profile</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="hud-label text-[10px] mb-1.5">DESCRIBE YOUR BEST CUSTOMERS</p>
                <textarea className="input-field rounded-xl px-4 py-3 text-sm w-full" style={{ minHeight: 100, resize: 'vertical' }}
                  placeholder="e.g. Women 28-45, interested in fitness and wellness, shop online 2-3x/month, health-conscious, follow fitness influencers, household income $60K+"
                  value={seedDescription} onChange={e => setSeedDescription(e.target.value)} />
              </div>
              <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(139,92,246,0.15)', color: seedDescription ? '#c4b5fd' : 'rgba(196,181,253,0.35)', border: '1px solid rgba(139,92,246,0.25)' }}
                disabled={!seedDescription || lookalikeLoading}
                onClick={() => {
                  setLookalikeOutput('');
                  setLookalikeLoading(true);
                  connectSSE('/api/audience-builder/build-lookalike',
                    { seed_description: seedDescription },
                    {
                      onChunk: (text) => setLookalikeOutput(prev => prev + text),
                      onResult: () => setLookalikeLoading(false),
                      onError: () => setLookalikeLoading(false),
                      onDone: () => setLookalikeLoading(false),
                    }
                  );
                }}>{lookalikeLoading ? 'Building Audience...' : 'Build Lookalike Audience'}</button>
              {lookalikeOutput && (
                <div className="rounded-xl p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {lookalikeOutput}
                  {lookalikeLoading && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AIInsightsPanel moduleId="audience-builder" />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#be185d';

const AI_TEMPLATES = [
  { name: 'Generate Press Release', prompt: 'Write a professional press release announcing a new product launch with headline, subhead, dateline, body paragraphs, boilerplate, and media contact info' },
  { name: 'Write Media Pitch', prompt: 'Craft a compelling media pitch email to journalists that hooks with a newsworthy angle, includes key stats, and closes with a clear ask' },
  { name: 'Create PR Campaign', prompt: 'Design a full PR campaign strategy including objectives, target media outlets, key messages, timeline, and distribution plan' },
  { name: 'Build Media List', prompt: 'Generate a targeted media list with journalist names, outlets, beats, and personalized pitch angles for each contact' },
];

const RELEASE_STATUSES = ['draft', 'review', 'scheduled', 'published'];
const RELATIONSHIP_OPTIONS = ['new', 'warm', 'active', 'pitched', 'responded'];

export default function PrPressPage() {
  usePageTitle('PR & Press');
  const [tab, setTab] = useState('releases');
  const [releases, setReleases] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAddRelease, setShowAddRelease] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newRelease, setNewRelease] = useState({ title: '', content: '', status: 'draft', target_date: '', distribution_list: '' });
  const [newContact, setNewContact] = useState({ name: '', outlet: '', email: '', beat: '', relationship: 'new' });
  const [mediaAngles, setMediaAngles] = useState(null);
  const [angleAnnouncement, setAngleAnnouncement] = useState('');
  const [angleLoading, setAngleLoading] = useState(false);
  const [contactScores, setContactScores] = useState({});
  const [scoringContactId, setScoringContactId] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJSON('/api/pr-press/'),
      fetchJSON('/api/pr-press/contacts/list'),
    ]).then(([r, c]) => {
      setReleases(r);
      setContacts(c);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addRelease = async () => {
    if (!newRelease.title.trim()) return;
    try {
      const created = await postJSON('/api/pr-press/', newRelease);
      setReleases(prev => [created, ...prev]);
      setNewRelease({ title: '', content: '', status: 'draft', target_date: '', distribution_list: '' });
      setShowAddRelease(false);
    } catch (err) { console.error(err); }
  };

  const removeRelease = async (id) => {
    try {
      await deleteJSON(`/api/pr-press/${id}`);
      setReleases(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const addContact = async () => {
    if (!newContact.name.trim()) return;
    try {
      const created = await postJSON('/api/pr-press/contacts', newContact);
      setContacts(prev => [created, ...prev]);
      setNewContact({ name: '', outlet: '', email: '', beat: '', relationship: 'new' });
      setShowAddContact(false);
    } catch (err) { console.error(err); }
  };

  const removeContact = async (id) => {
    try {
      await deleteJSON(`/api/pr-press/contacts/${id}`);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  };

  const updateReleaseStatus = async (id, status) => {
    try {
      const updated = await putJSON(`/api/pr-press/${id}`, { status });
      setReleases(prev => prev.map(r => r.id === id ? { ...r, status: updated.status || status } : r));
    } catch (err) { console.error(err); }
  };

  const updateContactRelationship = async (id, relationship) => {
    try {
      const updated = await putJSON(`/api/pr-press/contacts/${id}`, { relationship });
      setContacts(prev => prev.map(c => c.id === id ? { ...c, relationship: updated.relationship || relationship } : c));
    } catch (err) { console.error(err); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/pr-press/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  const statusColor = (s) => s === 'published' ? '#22c55e' : s === 'draft' ? '#6b7280' : s === 'scheduled' ? '#3b82f6' : '#f59e0b';
  const relationshipColor = (s) => s === 'active' ? '#22c55e' : s === 'pitched' ? '#f59e0b' : s === 'responded' ? '#3b82f6' : s === 'warm' ? '#f97316' : '#6b7280';

  // Computed stats from real data
  const publishedReleases = releases.filter(r => r.status === 'published').length;
  const draftReleases = releases.filter(r => r.status === 'draft').length;
  const activeContacts = contacts.filter(c => c.relationship === 'active' || c.relationship === 'warm').length;
  const pitchedContacts = contacts.filter(c => c.relationship === 'pitched' || c.relationship === 'responded').length;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>PR & PRESS</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Public Relations Hub</h1>
        <p className="text-base text-gray-500">Manage press releases, media contacts, and PR campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'TOTAL RELEASES', value: releases.length.toString(), sub: `${publishedReleases} published` },
          { label: 'DRAFT RELEASES', value: draftReleases.toString(), sub: 'awaiting review' },
          { label: 'MEDIA CONTACTS', value: contacts.length.toString(), sub: `${activeContacts} active` },
          { label: 'PITCHES SENT', value: pitchedContacts.toString(), sub: 'pitched or responded' },
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
        {['releases', 'contacts', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Releases */}
      {tab === 'releases' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddRelease(!showAddRelease)} className="chip text-[10px]" style={{ background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR }}>+ Add Release</button>
          </div>
          {showAddRelease && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newRelease.title} onChange={e => setNewRelease({ ...newRelease, title: e.target.value })} placeholder="Release title" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newRelease.status} onChange={e => setNewRelease({ ...newRelease, status: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {RELEASE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <input value={newRelease.target_date} onChange={e => setNewRelease({ ...newRelease, target_date: e.target.value })} type="date" placeholder="Target date" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newRelease.distribution_list} onChange={e => setNewRelease({ ...newRelease, distribution_list: e.target.value })} placeholder="Distribution list (e.g. PR Newswire)" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <textarea value={newRelease.content} onChange={e => setNewRelease({ ...newRelease, content: e.target.value })} placeholder="Release content (optional)" rows={3} className="w-full input-field rounded px-3 py-2 text-xs resize-none" />
              <button onClick={addRelease} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>Create Release</button>
            </div>
          )}
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {releases.length === 0 && <div className="p-6 text-center text-sm text-gray-600">{loading ? 'Loading...' : 'No press releases yet'}</div>}
              {releases.map(r => (
                <div key={r.id} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.distribution_list || 'No distribution'} &middot; {r.target_date || 'No date set'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={r.status || 'draft'}
                      onChange={e => updateReleaseStatus(r.id, e.target.value)}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-transparent cursor-pointer"
                      style={{ color: statusColor(r.status), background: `${statusColor(r.status)}10`, borderColor: `${statusColor(r.status)}30` }}
                    >
                      {RELEASE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <button onClick={() => removeRelease(r.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contacts */}
      {tab === 'contacts' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddContact(!showAddContact)} className="chip text-[10px]" style={{ background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR }}>+ Add Contact</button>
          </div>
          {showAddContact && (
            <div className="panel rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Contact name" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newContact.outlet} onChange={e => setNewContact({ ...newContact, outlet: e.target.value })} placeholder="Outlet (e.g. TechCrunch)" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newContact.beat} onChange={e => setNewContact({ ...newContact, beat: e.target.value })} placeholder="Beat (e.g. Startups)" className="input-field rounded px-3 py-2 text-xs" />
                <select value={newContact.relationship} onChange={e => setNewContact({ ...newContact, relationship: e.target.value })} className="input-field rounded px-3 py-2 text-xs">
                  {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <button onClick={addContact} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>Add Contact</button>
            </div>
          )}
          <div className="panel rounded-2xl overflow-hidden">
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[1fr_120px_120px_1fr_100px_80px_30px] gap-3 px-4 sm:px-6 py-3 border-b border-indigo-500/[0.06]">
              {['Name', 'Outlet', 'Beat', 'Email', 'Relationship', 'Score', ''].map(h => (
                <p key={h} className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-indigo-500/[0.04]">
              {contacts.length === 0 && <div className="p-6 text-center text-sm text-gray-600">{loading ? 'Loading...' : 'No media contacts yet'}</div>}
              {contacts.map(c => (
                <div key={c.id} className="group hover:bg-white/[0.01] transition-colors">
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_120px_120px_1fr_100px_80px_30px] gap-3 items-center px-4 sm:px-6 py-4">
                    <p className="text-sm font-semibold text-gray-300 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.outlet || '--'}</p>
                    <p className="text-xs text-gray-500 truncate">{c.beat || '--'}</p>
                    <p className="text-xs text-gray-600 truncate">{c.email || '--'}</p>
                    <select
                      value={c.relationship || 'new'}
                      onChange={e => updateContactRelationship(c.id, e.target.value)}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-transparent cursor-pointer text-center"
                      style={{ color: relationshipColor(c.relationship), background: `${relationshipColor(c.relationship)}10`, borderColor: `${relationshipColor(c.relationship)}30` }}
                    >
                      {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    {contactScores[c.id] ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center" style={{ background: '#6366f120', color: '#6366f1' }}>
                        {contactScores[c.id].tier} · {contactScores[c.id].relevance_score}
                      </span>
                    ) : (
                      <button
                        disabled={scoringContactId === c.id}
                        onClick={async () => {
                          setScoringContactId(c.id);
                          try {
                            const result = await postJSON('/api/pr-press/score-contact', {
                              contact_name: c.name,
                              publication: c.outlet,
                              beat: c.beat,
                              announcement_type: angleAnnouncement || 'Product launch',
                            });
                            setContactScores(prev => ({ ...prev, [c.id]: result }));
                          } catch {}
                          setScoringContactId(null);
                        }}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        {scoringContactId === c.id ? '...' : 'Score'}
                      </button>
                    )}
                    <button onClick={() => removeContact(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                  {/* Score details row */}
                  {contactScores[c.id] && (
                    <div className="hidden md:block px-4 sm:px-6 pb-3 text-[10px] text-gray-500 space-y-0.5 border-t border-indigo-500/[0.04]">
                      <p><span className="text-gray-400">Pitch:</span> {contactScores[c.id].pitch_angle}</p>
                      <p><span className="text-gray-400">Best time:</span> {contactScores[c.id].best_contact_time}{contactScores[c.id].warning ? <span className="text-yellow-500/70 ml-2"> {contactScores[c.id].warning}</span> : null}</p>
                    </div>
                  )}
                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-300 truncate">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={c.relationship || 'new'}
                          onChange={e => updateContactRelationship(c.id, e.target.value)}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-transparent cursor-pointer flex-shrink-0"
                          style={{ color: relationshipColor(c.relationship), background: `${relationshipColor(c.relationship)}10`, borderColor: `${relationshipColor(c.relationship)}30` }}
                        >
                          {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                        <button onClick={() => removeContact(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{c.outlet || '--'} &middot; {c.beat || '--'}</p>
                    <p className="text-xs text-gray-600 truncate">{c.email || '--'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          {/* Media Angle Generator */}
          <div className="panel animate-fade-in" style={{ marginBottom: 20 }}>
            <div className="hud-label" style={{ marginBottom: 12 }}>Media Angle Generator</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="input-field rounded-xl px-4 py-3 flex-1" style={{ flex: 1 }} placeholder="Describe your announcement..."
                value={angleAnnouncement} onChange={e => setAngleAnnouncement(e.target.value)} />
              <button className="btn-accent" disabled={!angleAnnouncement || angleLoading}
                style={{ background: MODULE_COLOR }}
                onClick={async () => {
                  setAngleLoading(true);
                  try {
                    const result = await postJSON('/api/pr-press/generate-angles', { announcement: angleAnnouncement });
                    setMediaAngles(result.angles);
                  } catch {}
                  setAngleLoading(false);
                }}>{angleLoading ? 'Generating...' : 'Generate Angles'}</button>
            </div>
            {mediaAngles && (
              <div style={{ display: 'grid', gap: 10 }}>
                {mediaAngles.map((angle, i) => (
                  <div key={i} className="panel" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="chip" style={{ fontSize: 11 }}>{angle.outlet_type}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{angle.angle}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontStyle: 'italic' }}>"{angle.hook}"</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Why they care: {angle.why_they_care}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-pink-700/30' : ''}`}>
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
      <AIInsightsPanel moduleId="pr-press" />
    </div>
  );
}

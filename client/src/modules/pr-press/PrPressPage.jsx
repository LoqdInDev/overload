import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#be185d';

const RELEASE_TEMPLATES = [
  { label: 'Product Launch', prompt: 'Write a professional press release announcing a new product launch. Include headline, subheadline, dateline, 3-4 body paragraphs with key features and customer benefits, an executive quote, boilerplate, and media contact placeholder.' },
  { label: 'Funding Round', prompt: 'Write a press release announcing a funding round. Include the round size, lead investors, use of funds, growth metrics, CEO quote, and investor quote. Professional tone for business media.' },
  { label: 'Partnership', prompt: 'Write a press release announcing a strategic partnership. Cover what each company brings, the combined value for customers, quotes from both CEOs, and specific milestones or deliverables.' },
  { label: 'Award / Recognition', prompt: 'Write a press release announcing a company award or industry recognition. Include award context, why the company won, leadership quote, and what it means for customers.' },
  { label: 'Executive Hire', prompt: 'Write a press release announcing a key executive hire. Include the new hire\'s background, why they were chosen, their focus areas, a quote from the CEO, and a quote from the new executive.' },
  { label: 'Product Update', prompt: 'Write a press release announcing a major product update or new feature release. Focus on the customer problem solved, key improvements, metrics if available, and a user/customer quote.' },
];

const AI_TOOLS = [
  { name: 'Generate Press Release', prompt: 'Write a professional press release announcing a new product launch with headline, subhead, dateline, body paragraphs, boilerplate, and media contact info' },
  { name: 'Write Media Pitch', prompt: 'Craft a compelling media pitch email to journalists that hooks with a newsworthy angle, includes key stats, and closes with a clear ask' },
  { name: 'Create PR Campaign', prompt: 'Design a full PR campaign strategy including objectives, target media outlets, key messages, timeline, and distribution plan' },
  { name: 'Build Media List', prompt: 'Generate a targeted media list with journalist names, outlets, beats, and personalized pitch angles for each contact' },
];

const RELEASE_STATUSES = ['draft', 'review', 'scheduled', 'published'];
const RELATIONSHIP_OPTIONS = ['new', 'warm', 'active', 'pitched', 'responded'];

function Toast({ message, type = 'error', onDismiss }) {
  const bg = type === 'success' ? '#22c55e20' : type === 'info' ? '#6366f120' : '#ef444420';
  const color = type === 'success' ? '#22c55e' : type === 'info' ? '#6366f1' : '#ef4444';
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: bg, border: `1px solid ${color}30`, color, borderRadius: 12, padding: '10px 16px', fontSize: 13, maxWidth: 340, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ color, opacity: 0.6, fontSize: 16, cursor: 'pointer', background: 'none', border: 'none' }}>&times;</button>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ padding: 24, borderRadius: 16, maxWidth: 360, width: '90%' }}>
        <p className="text-sm text-gray-300 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="chip text-xs">Cancel</button>
          <button onClick={onConfirm} className="chip text-xs" style={{ background: '#ef444420', borderColor: '#ef444440', color: '#ef4444' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function PrPressPage() {
  usePageTitle('PR & Press');
  const [tab, setTab] = useState('releases');
  const [releases, setReleases] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [showAddRelease, setShowAddRelease] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newRelease, setNewRelease] = useState({ title: '', content: '', status: 'draft', target_date: '', distribution_list: '' });
  const [newContact, setNewContact] = useState({ name: '', outlet: '', email: '', beat: '', relationship: 'new' });
  const [mediaAngles, setMediaAngles] = useState(null);
  const [angleAnnouncement, setAngleAnnouncement] = useState('');
  const [angleLoading, setAngleLoading] = useState(false);
  const [contactScores, setContactScores] = useState({});
  const [scoringContactId, setScoringContactId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'release'|'contact', id, label }
  const [toast, setToast] = useState(null); // { message, type }
  const toastTimer = useRef(null);

  // Pitch tab state
  const [pitchContact, setPitchContact] = useState({ name: '', outlet: '', beat: '', release_title: '', release_excerpt: '', announcement_type: 'Product launch' });
  const [pitchOutput, setPitchOutput] = useState('');
  const [pitchGenerating, setPitchGenerating] = useState(false);
  const [followUpContact, setFollowUpContact] = useState({ name: '', outlet: '', original_subject: '', days_since: '5', context: '' });
  const [followUpOutput, setFollowUpOutput] = useState('');
  const [followUpGenerating, setFollowUpGenerating] = useState(false);

  const showToast = (message, type = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJSON('/api/pr-press/'),
      fetchJSON('/api/pr-press/contacts/list'),
    ]).then(([r, c]) => {
      setReleases(r);
      setContacts(c);
    }).catch(() => showToast('Failed to load data')).finally(() => setLoading(false));
  }, []);

  const addRelease = async () => {
    if (!newRelease.title.trim()) return;
    try {
      const created = await postJSON('/api/pr-press/', newRelease);
      setReleases(prev => [created, ...prev]);
      setNewRelease({ title: '', content: '', status: 'draft', target_date: '', distribution_list: '' });
      setShowAddRelease(false);
      showToast('Release created', 'success');
    } catch (err) { showToast(err.message || 'Failed to create release'); }
  };

  const confirmRemoveRelease = (r) => setConfirmDelete({ type: 'release', id: r.id, label: r.title });
  const confirmRemoveContact = (c) => setConfirmDelete({ type: 'contact', id: c.id, label: c.name });

  const executeDelete = async () => {
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      if (type === 'release') {
        await deleteJSON(`/api/pr-press/${id}`);
        setReleases(prev => prev.filter(r => r.id !== id));
        showToast('Release deleted', 'success');
      } else {
        await deleteJSON(`/api/pr-press/contacts/${id}`);
        setContacts(prev => prev.filter(c => c.id !== id));
        showToast('Contact deleted', 'success');
      }
    } catch (err) { showToast(err.message || 'Delete failed'); }
  };

  const addContact = async () => {
    if (!newContact.name.trim()) return;
    try {
      const created = await postJSON('/api/pr-press/contacts', newContact);
      setContacts(prev => [created, ...prev]);
      setNewContact({ name: '', outlet: '', email: '', beat: '', relationship: 'new' });
      setShowAddContact(false);
      showToast('Contact added', 'success');
    } catch (err) { showToast(err.message || 'Failed to add contact'); }
  };

  const updateReleaseStatus = async (id, status) => {
    try {
      const updated = await putJSON(`/api/pr-press/${id}`, { status });
      setReleases(prev => prev.map(r => r.id === id ? { ...r, status: updated.status || status } : r));
    } catch (err) { showToast(err.message || 'Update failed'); }
  };

  const updateContactRelationship = async (id, relationship) => {
    try {
      const updated = await putJSON(`/api/pr-press/contacts/${id}`, { relationship });
      setContacts(prev => prev.map(c => c.id === id ? { ...c, relationship: updated.relationship || relationship } : c));
    } catch (err) { showToast(err.message || 'Update failed'); }
  };

  const scoreContact = async (c) => {
    setScoringContactId(c.id);
    try {
      const result = await postJSON('/api/pr-press/score-contact', {
        contact_name: c.name,
        publication: c.outlet,
        beat: c.beat,
        announcement_type: angleAnnouncement || 'Product launch',
        contact_id: c.id,
      });
      setContactScores(prev => ({ ...prev, [c.id]: result }));
      // Update contacts with persisted score
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, ai_score: result.relevance_score, ai_tier: result.tier, ai_pitch_angle: result.pitch_angle, ai_best_time: result.best_contact_time, ai_warning: result.warning } : x));
    } catch (err) { showToast(err.message || 'Scoring failed'); }
    setScoringContactId(null);
  };

  const generate = (tool) => {
    setSelectedTool(tool); setGenerating(true); setOutput('');
    connectSSE('/api/pr-press/generate', { type: 'content', prompt: tool.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { showToast(err.message || 'Generation failed'); setGenerating(false); },
    });
  };

  const generateFromTemplate = (template) => {
    setSelectedTool({ name: template.label }); setGenerating(true); setOutput(''); setTab('ai-tools');
    connectSSE('/api/pr-press/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { showToast(err.message || 'Generation failed'); setGenerating(false); },
    });
  };

  const generatePitch = () => {
    if (!pitchContact.name.trim()) return;
    setPitchGenerating(true); setPitchOutput('');
    connectSSE('/api/pr-press/pitch-personalizer', pitchContact, {
      onChunk: (text) => setPitchOutput(p => p + text),
      onResult: (data) => { setPitchOutput(data.content); setPitchGenerating(false); },
      onError: (err) => { showToast(err.message || 'Pitch generation failed'); setPitchGenerating(false); },
    });
  };

  const generateFollowUp = () => {
    if (!followUpContact.name.trim()) return;
    setFollowUpGenerating(true); setFollowUpOutput('');
    connectSSE('/api/pr-press/follow-up', followUpContact, {
      onChunk: (text) => setFollowUpOutput(p => p + text),
      onResult: (data) => { setFollowUpOutput(data.content); setFollowUpGenerating(false); },
      onError: (err) => { showToast(err.message || 'Follow-up generation failed'); setFollowUpGenerating(false); },
    });
  };

  const saveAsRelease = (title, content) => {
    setNewRelease({ title, content, status: 'draft', target_date: '', distribution_list: '' });
    setTab('releases');
    setShowAddRelease(true);
    showToast('Draft ready — review and save below', 'info');
  };

  const statusColor = (s) => s === 'published' ? '#22c55e' : s === 'draft' ? '#6b7280' : s === 'scheduled' ? '#3b82f6' : '#f59e0b';
  const relationshipColor = (s) => s === 'active' ? '#22c55e' : s === 'pitched' ? '#f59e0b' : s === 'responded' ? '#3b82f6' : s === 'warm' ? '#f97316' : '#6b7280';

  const publishedReleases = releases.filter(r => r.status === 'published').length;
  const draftReleases = releases.filter(r => r.status === 'draft').length;
  const activeContacts = contacts.filter(c => c.relationship === 'active' || c.relationship === 'warm').length;
  const pitchedContacts = contacts.filter(c => c.relationship === 'pitched' || c.relationship === 'responded').length;

  // Get score for a contact: prefer fresh contactScores, fall back to persisted DB values
  const getScore = (c) => contactScores[c.id] || (c.ai_score ? { relevance_score: c.ai_score, tier: c.ai_tier, pitch_angle: c.ai_pitch_angle, best_contact_time: c.ai_best_time, warning: c.ai_warning } : null);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${confirmDelete.label}"? This cannot be undone.`}
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

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
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-2">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-2">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {['releases', 'contacts', 'ai-tools', 'pitch'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Releases Tab */}
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
                <input value={newRelease.target_date} onChange={e => setNewRelease({ ...newRelease, target_date: e.target.value })} type="date" className="input-field rounded px-3 py-2 text-xs" />
                <input value={newRelease.distribution_list} onChange={e => setNewRelease({ ...newRelease, distribution_list: e.target.value })} placeholder="Distribution list (e.g. PR Newswire)" className="input-field rounded px-3 py-2 text-xs" />
              </div>
              <textarea value={newRelease.content} onChange={e => setNewRelease({ ...newRelease, content: e.target.value })} placeholder="Release content (optional)" rows={3} className="w-full input-field rounded px-3 py-2 text-xs resize-none" />
              <button onClick={addRelease} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>Create Release</button>
            </div>
          )}

          {/* Quick-start templates */}
          <div className="panel rounded-2xl p-4">
            <p className="hud-label text-[10px] mb-3">QUICK-START TEMPLATES</p>
            <div className="flex flex-wrap gap-2">
              {RELEASE_TEMPLATES.map(t => (
                <button key={t.label} onClick={() => generateFromTemplate(t)} className="chip text-[10px] hover:bg-white/5 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

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
                    <button onClick={() => confirmRemoveRelease(r)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {tab === 'contacts' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <input
              value={angleAnnouncement}
              onChange={e => setAngleAnnouncement(e.target.value)}
              placeholder="Announcement type for scoring (e.g. Product launch)"
              className="input-field rounded px-3 py-1.5 text-xs flex-1 max-w-xs"
            />
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
            <div className="hidden md:grid grid-cols-[1fr_120px_120px_1fr_100px_90px_36px] gap-3 px-4 sm:px-6 py-3 border-b border-indigo-500/[0.06]">
              {['Name', 'Outlet', 'Beat', 'Email', 'Relationship', 'Score', ''].map(h => (
                <p key={h} className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-indigo-500/[0.04]">
              {contacts.length === 0 && <div className="p-6 text-center text-sm text-gray-600">{loading ? 'Loading...' : 'No media contacts yet'}</div>}
              {contacts.map(c => {
                const score = getScore(c);
                return (
                  <div key={c.id} className="group hover:bg-white/[0.01] transition-colors">
                    <div className="hidden md:grid grid-cols-[1fr_120px_120px_1fr_100px_90px_36px] gap-3 items-center px-4 sm:px-6 py-4">
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
                      {score ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-center" style={{ background: '#6366f120', color: '#6366f1' }}>
                            {score.tier} · {score.relevance_score}
                          </span>
                          <button
                            disabled={scoringContactId === c.id}
                            onClick={() => scoreContact(c)}
                            title="Re-score"
                            className="text-[9px] text-gray-600 hover:text-indigo-400 transition-colors"
                          >↺</button>
                        </div>
                      ) : (
                        <button
                          disabled={scoringContactId === c.id}
                          onClick={() => scoreContact(c)}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          {scoringContactId === c.id ? '...' : 'Score'}
                        </button>
                      )}
                      <button onClick={() => confirmRemoveContact(c)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                    </div>
                    {score && (
                      <div className="hidden md:block px-4 sm:px-6 pb-3 text-[10px] text-gray-500 space-y-0.5 border-t border-indigo-500/[0.04]">
                        <p><span className="text-gray-400">Pitch:</span> {score.pitch_angle}</p>
                        <p><span className="text-gray-400">Best time:</span> {score.best_contact_time}
                          {score.warning ? <span className="text-yellow-500/70 ml-2">{score.warning}</span> : null}
                        </p>
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
                          <button onClick={() => confirmRemoveContact(c)} className="text-gray-600 hover:text-red-400 text-xs">&times;</button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{c.outlet || '--'} &middot; {c.beat || '--'}</p>
                      <p className="text-xs text-gray-600 truncate">{c.email || '--'}</p>
                      {score && <p className="text-[10px]" style={{ color: '#6366f1' }}>{score.tier} · {score.relevance_score} — {score.pitch_angle}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          {/* Media Angle Generator */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[10px] mb-3">MEDIA ANGLE GENERATOR</p>
            <div className="flex gap-2 mb-3">
              <input className="input-field rounded-xl px-4 py-2 flex-1 text-sm" placeholder="Describe your announcement..."
                value={angleAnnouncement} onChange={e => setAngleAnnouncement(e.target.value)} />
              <button className="btn-accent px-4 py-2 rounded-xl text-xs font-semibold" disabled={!angleAnnouncement || angleLoading}
                style={{ background: MODULE_COLOR }}
                onClick={async () => {
                  setAngleLoading(true);
                  try {
                    const result = await postJSON('/api/pr-press/generate-angles', { announcement: angleAnnouncement });
                    setMediaAngles(result.angles);
                  } catch (err) { showToast(err.message || 'Angle generation failed'); }
                  setAngleLoading(false);
                }}>{angleLoading ? 'Generating...' : 'Generate Angles'}</button>
            </div>
            {mediaAngles && (
              <div className="grid gap-2.5">
                {mediaAngles.map((angle, i) => (
                  <div key={i} className="panel rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="chip text-[10px]">{angle.outlet_type}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-300 mb-1">{angle.angle}</p>
                    <p className="text-xs text-gray-500 italic mb-1">"{angle.hook}"</p>
                    <p className="text-xs text-gray-600">Why they care: {angle.why_they_care}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tool cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TOOLS.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTool?.name === tool.name ? 'border-pink-700/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>

          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                  <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
                </div>
                {!generating && output && (
                  <button
                    onClick={() => saveAsRelease(selectedTool?.name || 'AI Draft', output)}
                    className="chip text-[10px]"
                    style={{ background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR }}
                  >Save as Draft</button>
                )}
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}

      {/* Pitch Tab */}
      {tab === 'pitch' && (
        <div className="animate-fade-in space-y-6">
          {/* Pitch Personalizer */}
          <div className="panel rounded-2xl p-4 sm:p-6 space-y-3">
            <p className="hud-label text-[10px] mb-1">PITCH PERSONALIZER</p>
            <p className="text-xs text-gray-500">Generate a tailored pitch email for a specific journalist and announcement.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={pitchContact.name} onChange={e => setPitchContact({ ...pitchContact, name: e.target.value })} placeholder="Journalist name *" className="input-field rounded px-3 py-2 text-xs" />
              <input value={pitchContact.outlet} onChange={e => setPitchContact({ ...pitchContact, outlet: e.target.value })} placeholder="Outlet (e.g. TechCrunch)" className="input-field rounded px-3 py-2 text-xs" />
              <input value={pitchContact.beat} onChange={e => setPitchContact({ ...pitchContact, beat: e.target.value })} placeholder="Beat (e.g. AI Startups)" className="input-field rounded px-3 py-2 text-xs" />
              <input value={pitchContact.release_title} onChange={e => setPitchContact({ ...pitchContact, release_title: e.target.value })} placeholder="Release / announcement title" className="input-field rounded px-3 py-2 text-xs" />
              <input value={pitchContact.announcement_type} onChange={e => setPitchContact({ ...pitchContact, announcement_type: e.target.value })} placeholder="Type (e.g. Product launch)" className="input-field rounded px-3 py-2 text-xs" />
            </div>
            <textarea value={pitchContact.release_excerpt} onChange={e => setPitchContact({ ...pitchContact, release_excerpt: e.target.value })} placeholder="Paste key excerpt from your release (optional)" rows={2} className="w-full input-field rounded px-3 py-2 text-xs resize-none" />
            <button onClick={generatePitch} disabled={!pitchContact.name.trim() || pitchGenerating} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>
              {pitchGenerating ? 'Generating...' : 'Generate Pitch'}
            </button>
            {(pitchGenerating || pitchOutput) && (
              <div className="panel rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${pitchGenerating ? 'animate-pulse' : ''}`} style={{ background: pitchGenerating ? MODULE_COLOR : '#4ade80' }} />
                    <span className="hud-label text-[10px]" style={{ color: pitchGenerating ? MODULE_COLOR : '#4ade80' }}>{pitchGenerating ? 'WRITING PITCH...' : 'PITCH READY'}</span>
                  </div>
                  {!pitchGenerating && pitchOutput && (
                    <button onClick={() => navigator.clipboard?.writeText(pitchOutput).then(() => showToast('Copied!', 'success'))} className="chip text-[9px]">Copy</button>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{pitchOutput}{pitchGenerating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
              </div>
            )}
          </div>

          {/* Follow-up Generator */}
          <div className="panel rounded-2xl p-4 sm:p-6 space-y-3">
            <p className="hud-label text-[10px] mb-1">FOLLOW-UP GENERATOR</p>
            <p className="text-xs text-gray-500">Generate a non-pushy follow-up when a journalist hasn't responded.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={followUpContact.name} onChange={e => setFollowUpContact({ ...followUpContact, name: e.target.value })} placeholder="Journalist name *" className="input-field rounded px-3 py-2 text-xs" />
              <input value={followUpContact.outlet} onChange={e => setFollowUpContact({ ...followUpContact, outlet: e.target.value })} placeholder="Outlet" className="input-field rounded px-3 py-2 text-xs" />
              <input value={followUpContact.original_subject} onChange={e => setFollowUpContact({ ...followUpContact, original_subject: e.target.value })} placeholder="Original pitch subject line" className="input-field rounded px-3 py-2 text-xs" />
              <input value={followUpContact.days_since} onChange={e => setFollowUpContact({ ...followUpContact, days_since: e.target.value })} type="number" placeholder="Days since original pitch" className="input-field rounded px-3 py-2 text-xs" min="1" />
              <input value={followUpContact.context} onChange={e => setFollowUpContact({ ...followUpContact, context: e.target.value })} placeholder="New context or hook (optional)" className="input-field rounded px-3 py-2 text-xs sm:col-span-2" />
            </div>
            <button onClick={generateFollowUp} disabled={!followUpContact.name.trim() || followUpGenerating} className="btn-accent px-4 py-1.5 rounded text-[10px]" style={{ background: MODULE_COLOR }}>
              {followUpGenerating ? 'Generating...' : 'Generate Follow-up'}
            </button>
            {(followUpGenerating || followUpOutput) && (
              <div className="panel rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${followUpGenerating ? 'animate-pulse' : ''}`} style={{ background: followUpGenerating ? MODULE_COLOR : '#4ade80' }} />
                    <span className="hud-label text-[10px]" style={{ color: followUpGenerating ? MODULE_COLOR : '#4ade80' }}>{followUpGenerating ? 'WRITING FOLLOW-UP...' : 'FOLLOW-UP READY'}</span>
                  </div>
                  {!followUpGenerating && followUpOutput && (
                    <button onClick={() => navigator.clipboard?.writeText(followUpOutput).then(() => showToast('Copied!', 'success'))} className="chip text-[9px]">Copy</button>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{followUpOutput}{followUpGenerating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <AIInsightsPanel moduleId="pr-press" />
    </div>
  );
}

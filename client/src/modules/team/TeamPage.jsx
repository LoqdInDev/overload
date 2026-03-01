import { useState, useEffect } from 'react';
import { fetchJSON, postJSON, connectSSE } from '../../lib/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#64748b';

const AI_TEMPLATES = [
  { name: 'Draft Team Onboarding', prompt: 'Create a comprehensive team onboarding guide for new marketing team members joining the Overload platform' },
  { name: 'Permission Structure Guide', prompt: 'Design an optimal permission and access control structure for a marketing team with admins, editors, and viewers' },
  { name: 'Team Workflow Recommendations', prompt: 'Recommend efficient team workflows and collaboration processes for a marketing team using an all-in-one marketing OS' },
  { name: 'Role Description Generator', prompt: 'Generate detailed role descriptions for admin, editor, and viewer roles in a marketing operations platform' },
];

const roleColor = (r) => {
  const map = { admin: '#f59e0b', editor: '#3b82f6', viewer: '#6b7280' };
  return map[r] || '#6b7280';
};

const statusColor = (s) => {
  const map = { active: '#22c55e', inactive: '#6b7280', pending: '#f59e0b', expired: '#ef4444' };
  return map[s] || '#6b7280';
};

const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

export default function TeamPage() {
  usePageTitle('Team & Permissions');
  const [tab, setTab] = useState('members');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJSON('/api/team/members')
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to fetch members:', err))
      .finally(() => setLoading(false));
  }, []);

  const memberCount = members.length;
  const activeCount = members.filter(m => m.status === 'active').length;
  const inviteCount = invites.length;
  const rolesCount = new Set(members.map(m => m.role)).size;

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    try {
      const invite = await postJSON('/api/team/invites', { email: inviteEmail, role: inviteRole });
      setInvites(prev => [invite, ...prev]);
      setInviteEmail('');
      setInviteRole('editor');
    } catch (err) {
      console.error('Failed to send invite:', err);
    }
  };

  const generate = async (template) => {
    setSelectedTemplate(template);
    setGenerating(true);
    setOutput('');
    const cancel = connectSSE('/api/team/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); }
    });
    return cancel;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>TEAM MANAGEMENT</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Team</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'TEAM MEMBERS', value: String(memberCount), sub: 'Across all roles' },
          { label: 'ACTIVE NOW', value: String(activeCount), sub: 'Currently online' },
          { label: 'PENDING INVITES', value: String(inviteCount), sub: invites.filter(i => i.status === 'expired').length > 0 ? `${invites.filter(i => i.status === 'expired').length} expired` : 'None expired' },
          { label: 'ROLES', value: String(rolesCount), sub: [...new Set(members.map(m => m.role))].map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ') || 'None' },
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
        {['members', 'invites', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(100,116,139,0.2)', borderColor: 'rgba(100,116,139,0.35)', color: '#94a3b8' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="animate-fade-in space-y-3">
          {loading ? (
            <div className="panel rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading team members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="panel rounded-2xl p-8 sm:p-12 text-center">
              <p className="text-sm text-gray-500">No team members yet. Send an invite to get started.</p>
            </div>
          ) : (
            members.map(member => (
              <div key={member.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 hover:border-indigo-500/15 transition-all">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: `${roleColor(member.role)}20`, color: roleColor(member.role), border: `1px solid ${roleColor(member.role)}30` }}>
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-semibold text-gray-200">{member.name}</p>
                    {member.status === 'active' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleColor(member.role)}15`, color: roleColor(member.role), border: `1px solid ${roleColor(member.role)}25` }}>
                  {member.role}
                </span>
                <span className="text-xs text-gray-500 w-24 text-right hidden md:block">{member.status === 'active' ? 'Active' : member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Inactive'}</span>
                <div className="flex flex-wrap gap-1 flex-shrink-0">
                  <button className="chip text-[10px]">Edit</button>
                  <button className="chip text-[10px]" style={{ color: '#ef4444' }}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invites Tab */}
      {tab === 'invites' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          {/* Invite Form */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-5" style={{ color: MODULE_COLOR }}>SEND INVITE</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com"
                className="flex-1 bg-white/[0.03] border border-indigo-500/[0.08] rounded-xl px-4 py-3 text-sm sm:text-base text-gray-200 focus:outline-none focus:border-indigo-500/30" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="bg-white/[0.03] border border-indigo-500/[0.08] rounded-xl px-4 py-3 text-sm sm:text-base text-gray-200 focus:outline-none focus:border-indigo-500/30 appearance-none w-full sm:w-32">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button onClick={handleSendInvite} className="px-5 py-3 rounded-xl text-sm sm:text-base font-bold tracking-wide transition-all whitespace-nowrap"
                style={{ background: MODULE_COLOR, boxShadow: `0 4px 20px -4px ${MODULE_COLOR}66` }}>
                Send Invite
              </button>
            </div>
          </div>

          {/* Pending Invites */}
          <div className="panel rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-indigo-500/[0.04]">
              <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>PENDING INVITES</p>
            </div>
            <div className="overflow-x-auto">
              <div className="divide-y divide-indigo-500/[0.04]">
                {invites.length === 0 ? (
                  <div className="px-4 sm:px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">No pending invites. Use the form above to invite team members.</p>
                  </div>
                ) : (
                  invites.map(invite => (
                    <div key={invite.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                      <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-300">{invite.email}</p>
                        <p className="text-xs text-gray-600 mt-0.5">Just sent</p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleColor(invite.role)}15`, color: roleColor(invite.role), border: `1px solid ${roleColor(invite.role)}25` }}>
                          {invite.role}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(invite.status)}15`, color: statusColor(invite.status), border: `1px solid ${statusColor(invite.status)}25` }}>
                          {invite.status}
                        </span>
                        <button className="chip text-[10px]">Resend</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-slate-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : 'bg-emerald-400'}`} style={{ background: generating ? MODULE_COLOR : undefined }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? '#94a3b8' : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
      <AIInsightsPanel moduleId="team" />
    </div>
  );
}

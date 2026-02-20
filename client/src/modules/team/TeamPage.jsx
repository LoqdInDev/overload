import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import AIToolsTab from '../../components/shared/AIToolsTab';

const MODULE_COLOR = '#64748b';

const INITIAL_MEMBERS = [
  { id: 1, name: 'Daniel Rivera', email: 'daniel@overload.app', role: 'admin', status: 'active', lastActive: 'Now', initials: 'DR' },
  { id: 2, name: 'Sarah Chen', email: 'sarah@overload.app', role: 'editor', status: 'active', lastActive: '5 min ago', initials: 'SC' },
  { id: 3, name: 'Mike Ross', email: 'mike@overload.app', role: 'editor', status: 'active', lastActive: '1 hour ago', initials: 'MR' },
  { id: 4, name: 'Lisa Park', email: 'lisa@overload.app', role: 'viewer', status: 'inactive', lastActive: '3 days ago', initials: 'LP' },
  { id: 5, name: 'James Liu', email: 'james@overload.app', role: 'viewer', status: 'inactive', lastActive: '1 week ago', initials: 'JL' },
];

const INITIAL_INVITES = [
  { id: 1, email: 'emma@newco.com', role: 'editor', status: 'pending', sentAt: '2 hours ago' },
  { id: 2, email: 'tom@agency.io', role: 'viewer', status: 'expired', sentAt: '7 days ago' },
];

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

export default function TeamPage() {
  const { dark } = useTheme();
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [toast, setToast] = useState(null);

  // Edit modal state
  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('');

  // Confirm remove state
  const [removingId, setRemovingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setEditRole(member.role);
  };

  const saveEdit = () => {
    setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, role: editRole } : m));
    showToast(`Updated ${editingMember.name}'s role to ${editRole}`);
    setEditingMember(null);
  };

  const confirmRemove = (id) => setRemovingId(id);

  const handleRemove = () => {
    const member = members.find(m => m.id === removingId);
    setMembers(prev => prev.filter(m => m.id !== removingId));
    showToast(`Removed ${member?.name} from the team`);
    setRemovingId(null);
  };

  const handleResend = (inviteId) => {
    setInvites(prev => prev.map(inv =>
      inv.id === inviteId ? { ...inv, status: 'pending', sentAt: 'Just now' } : inv
    ));
    showToast('Invite resent successfully');
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (invites.some(i => i.email === inviteEmail) || members.some(m => m.email === inviteEmail)) {
      showToast('This email is already on the team or has a pending invite', 'error');
      return;
    }
    const newInvite = {
      id: Date.now(),
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      sentAt: 'Just now',
    };
    setInvites(prev => [newInvite, ...prev]);
    setInviteEmail('');
    showToast(`Invite sent to ${inviteEmail}`);
  };

  const panelCls = dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm';
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-500' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-600' : 'text-gray-400';
  const inputCls = dark
    ? 'bg-white/[0.03] border border-indigo-500/[0.08] text-gray-200 focus:border-indigo-500/30'
    : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-blue-400';

  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingInvites = invites.filter(i => i.status === 'pending').length;
  const expiredInvites = invites.filter(i => i.status === 'expired').length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>TEAM MANAGEMENT</p>
        <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Team</h1>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-xs font-semibold shadow-lg animate-fade-in transition-all ${
          toast.type === 'error'
            ? `${dark ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-red-50 text-red-600 border border-red-200'}`
            : `${dark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'TEAM MEMBERS', value: String(members.length), sub: 'Across all roles' },
          { label: 'ACTIVE NOW', value: String(activeMembers), sub: 'Currently online' },
          { label: 'PENDING INVITES', value: String(pendingInvites), sub: expiredInvites > 0 ? `${expiredInvites} expired` : 'None expired' },
          { label: 'ROLES', value: '3', sub: 'Admin, Editor, Viewer' },
        ].map((s, i) => (
          <div key={i} className={`${panelCls} rounded-xl p-4`}>
            <p className="hud-label mb-1">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${textPrimary}`}>{s.value}</p>
            <p className={`text-[10px] mt-1 ${textSecondary}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {['members', 'invites', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`chip text-xs ${tab === t ? 'active' : ''}`}
            style={tab === t ? { background: dark ? 'rgba(100,116,139,0.2)' : 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.35)', color: dark ? '#94a3b8' : '#475569' } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="animate-fade-in space-y-2">
          {members.map(member => (
            <div key={member.id} className={`${panelCls} rounded-xl p-4 flex items-center gap-4 transition-all ${dark ? 'hover:border-indigo-500/15' : 'hover:shadow-md'}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${roleColor(member.role)}20`, color: roleColor(member.role), border: `1px solid ${roleColor(member.role)}30` }}>
                {member.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{member.name}</p>
                  {member.status === 'active' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
                <p className={`text-[10px] mt-0.5 ${textSecondary}`}>{member.email}</p>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleColor(member.role)}15`, color: roleColor(member.role), border: `1px solid ${roleColor(member.role)}25` }}>
                {member.role}
              </span>
              <span className={`text-[10px] w-24 text-right hidden md:block ${textSecondary}`}>{member.lastActive}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(member)} className="chip text-[10px]">Edit</button>
                {member.role !== 'admin' && (
                  <button onClick={() => confirmRemove(member.id)} className="chip text-[10px]" style={{ color: '#ef4444' }}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invites Tab */}
      {tab === 'invites' && (
        <div className="animate-fade-in space-y-4">
          {/* Invite Form */}
          <div className={`${panelCls} rounded-xl p-5`}>
            <p className="hud-label mb-4" style={{ color: MODULE_COLOR }}>SEND INVITE</p>
            <div className="flex gap-2">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com"
                className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none ${inputCls}`}
                onKeyDown={e => e.key === 'Enter' && handleSendInvite()} />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className={`rounded-lg px-3 py-2 text-sm focus:outline-none appearance-none w-28 ${inputCls}`}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button onClick={handleSendInvite} className="px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all text-white"
                style={{ background: MODULE_COLOR, boxShadow: `0 4px 20px -4px ${MODULE_COLOR}66` }}>
                Send Invite
              </button>
            </div>
          </div>

          {/* Pending Invites */}
          <div className={`${panelCls} rounded-xl overflow-hidden`}>
            <div className="px-4 py-3" style={{ borderBottom: dark ? '1px solid rgba(99,102,241,0.04)' : '1px solid #e5e7eb' }}>
              <p className="hud-label" style={{ color: MODULE_COLOR }}>PENDING INVITES</p>
            </div>
            {invites.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className={`text-xs ${textSecondary}`}>No pending invites</p>
              </div>
            ) : (
              <div className={`divide-y ${dark ? 'divide-indigo-500/[0.04]' : 'divide-gray-100'}`}>
                {invites.map(invite => (
                  <div key={invite.id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${dark ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                      <svg className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{invite.email}</p>
                      <p className={`text-[10px] mt-0.5 ${textMuted}`}>Sent {invite.sentAt}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleColor(invite.role)}15`, color: roleColor(invite.role), border: `1px solid ${roleColor(invite.role)}25` }}>
                      {invite.role}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(invite.status)}15`, color: statusColor(invite.status), border: `1px solid ${statusColor(invite.status)}25` }}>
                      {invite.status}
                    </span>
                    <button onClick={() => handleResend(invite.id)} className="chip text-[10px]">Resend</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {tab === 'ai-tools' && (
        <AIToolsTab templates={AI_TEMPLATES} color={MODULE_COLOR} apiEndpoint="/api/team/generate" />
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)}>
          <div className={`${dark ? 'bg-[#0c0c14] border-white/[0.06]' : 'bg-white border-gray-200'} border rounded-2xl p-6 w-full max-w-sm mx-4`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Edit Member</h3>
            <p className={`text-sm mb-5 ${textSecondary}`}>Change role for {editingMember.name}</p>

            <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${textSecondary}`}>Role</label>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {['admin', 'editor', 'viewer'].map(r => (
                <button key={r} onClick={() => setEditRole(r)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    editRole === r
                      ? `border-${r === 'admin' ? 'amber' : r === 'editor' ? 'blue' : 'gray'}-500/30`
                      : dark ? 'border-white/[0.06]' : 'border-gray-200'
                  }`}
                  style={editRole === r ? { background: `${roleColor(r)}15`, color: roleColor(r), borderColor: `${roleColor(r)}40` } : {}}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditingMember(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${dark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.04]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}>
                Cancel
              </button>
              <button onClick={saveEdit}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: MODULE_COLOR }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setRemovingId(null)}>
          <div className={`${dark ? 'bg-[#0c0c14] border-white/[0.06]' : 'bg-white border-gray-200'} border rounded-2xl p-6 w-full max-w-sm mx-4`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Remove Member</h3>
            <p className={`text-sm mb-5 ${textSecondary}`}>
              Are you sure you want to remove <strong>{members.find(m => m.id === removingId)?.name}</strong> from the team? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemovingId(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${dark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.04]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}>
                Cancel
              </button>
              <button onClick={handleRemove}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function WorkspaceSettingsPage() {
  const { dark } = useTheme();
  const { current, updateWorkspace, deleteWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const ink = dark ? '#F5EDE6' : '#2C2825';
  const muted = dark ? '#A39B91' : '#8C857D';
  const terra = '#C45D3E';
  const cardBg = dark ? '#262320' : '#fff';
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';

  useEffect(() => {
    if (current) {
      setName(current.name);
      if (current.id !== 'local') fetchMembers();
      else setLoading(false);
    }
  }, [current?.id]);

  async function fetchMembers() {
    if (!current) return;
    setLoading(true);
    try {
      const data = await fetchJSON(`/api/workspaces/${current.id}/members`);
      setMembers(data);
    } catch (e) {
      console.error('Failed to fetch members:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === current.name) return;
    try {
      await updateWorkspace(current.id, name.trim());
      toast.success('Workspace renamed');
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await postJSON(`/api/workspaces/${current.id}/members`, { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invited ${inviteEmail.trim()}`);
      setInviteEmail('');
      fetchMembers();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await putJSON(`/api/workspaces/${current.id}/members/${userId}`, { role: newRole });
      toast.success('Role updated');
      fetchMembers();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleRemoveMember(userId, email) {
    if (!confirm(`Remove ${email} from this workspace?`)) return;
    try {
      await deleteJSON(`/api/workspaces/${current.id}/members/${userId}`);
      toast.success('Member removed');
      fetchMembers();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete() {
    if (workspaces.length <= 1) {
      toast.error('Cannot delete your only workspace');
      return;
    }
    if (!confirm(`Delete workspace "${current.name}"? This cannot be undone. All data in this workspace will be lost.`)) return;
    try {
      await deleteWorkspace(current.id);
      toast.success('Workspace deleted');
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!current) return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 flex items-center justify-center" style={{ color: muted }}>
      <div className="text-center">
        <p className="text-sm">Loading workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8" style={{ color: ink }}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Workspace Settings</h1>
          <p className="text-sm mt-1" style={{ color: muted }}>Manage your workspace name, members, and permissions.</p>
        </div>

        {/* Workspace Switcher */}
        <div className="flex items-start gap-4 flex-wrap">
          {workspaces.map(ws => {
            const isActive = ws.id === current.id;
            return (
              <button key={ws.id}
                onClick={() => { if (!isActive) switchWorkspace(ws); }}
                className="flex flex-col items-center gap-2 group transition-all duration-200"
                style={{ cursor: isActive ? 'default' : 'pointer' }}
              >
                <div className="flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={{
                    width: 72, height: 72,
                    background: isActive
                      ? (dark ? `linear-gradient(135deg, ${terra}25, ${terra}12)` : `linear-gradient(135deg, ${terra}15, ${terra}08)`)
                      : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'),
                    border: `2px solid ${isActive ? terra : borderColor}`,
                    boxShadow: isActive ? `0 4px 16px -4px ${terra}30` : 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)'; e.currentTarget.style.borderColor = terra; e.currentTarget.style.boxShadow = `0 4px 12px -4px ${terra}20`; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; } }}
                >
                  <svg className="w-7 h-7" fill="none" stroke={isActive ? terra : muted} viewBox="0 0 24 24" strokeWidth={1.3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <span className="text-[11px] font-medium max-w-[80px] truncate" style={{ color: isActive ? terra : muted }}>
                  {ws.name}
                </span>
              </button>
            );
          })}

          {creating ? (
            <div className="flex flex-col items-center gap-2">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newWsName.trim()) return;
                try {
                  const ws = await createWorkspace(newWsName.trim());
                  setNewWsName(''); setCreating(false);
                  switchWorkspace(ws);
                } catch (err) { toast.error(err.message); }
              }}>
                <input autoFocus value={newWsName} onChange={e => setNewWsName(e.target.value)}
                  placeholder="Name..."
                  className="px-3 py-2 rounded-2xl text-sm border outline-none text-center"
                  style={{ background: dark ? '#1E1B18' : '#FDFBF8', borderColor, color: ink, width: 72, height: 72 }}
                  onKeyDown={e => { if (e.key === 'Escape') { setCreating(false); setNewWsName(''); } }}
                  onBlur={() => { if (!newWsName.trim()) { setCreating(false); setNewWsName(''); } }}
                />
              </form>
              <span className="text-[11px] font-medium" style={{ color: muted }}>New</span>
            </div>
          ) : (
            <button onClick={() => setCreating(true)}
              className="flex flex-col items-center gap-2 group transition-all duration-200"
            >
              <div className="flex items-center justify-center rounded-2xl transition-all duration-200"
                style={{
                  width: 72, height: 72,
                  background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                  border: `2px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(44,40,37,0.15)'}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)'; e.currentTarget.style.borderColor = terra; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(44,40,37,0.15)'; }}
              >
                <svg className="w-7 h-7" fill="none" stroke={muted} viewBox="0 0 24 24" strokeWidth={1.3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-[11px] font-medium" style={{ color: muted }}>New</span>
            </button>
          )}
        </div>

        {/* Rename */}
        <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: ink }}>Workspace Name</h2>
          <form onSubmit={handleRename} className="flex gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
              style={{ background: dark ? '#1E1B18' : '#FDFBF8', borderColor, color: ink }}
            />
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: terra }}>
              Save
            </button>
          </form>
        </div>

        {/* Members */}
        <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: ink }}>Members</h2>

          {/* Invite */}
          <form onSubmit={handleInvite} className="flex gap-2 mb-5">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Email address..."
              type="email"
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: dark ? '#1E1B18' : '#FDFBF8', borderColor, color: ink }}
            />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="px-2 py-2 rounded-lg text-sm border outline-none"
              style={{ background: dark ? '#1E1B18' : '#FDFBF8', borderColor, color: ink }}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: terra }}>
              Invite
            </button>
          </form>

          {/* Members list */}
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(44,40,37,0.02)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${terra}18`, color: terra }}>
                  {(member.display_name || member.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{member.display_name || 'Unnamed'}</div>
                  <div className="text-[11px] truncate" style={{ color: muted }}>{member.email}</div>
                </div>
                {member.role === 'owner' ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${terra}15`, color: terra }}>Owner</span>
                ) : (
                  <>
                    <select value={member.role}
                      onChange={e => handleRoleChange(member.user_id, e.target.value)}
                      className="text-[11px] px-2 py-1 rounded border outline-none"
                      style={{ background: dark ? '#1E1B18' : '#FDFBF8', borderColor, color: ink }}>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button onClick={() => handleRemoveMember(member.user_id, member.email)}
                      className="text-[11px] px-2 py-1 rounded transition-colors hover:opacity-80"
                      style={{ color: '#e74c3c' }}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        {current.role === 'owner' && workspaces.length > 1 && (
          <div className="rounded-xl p-6" style={{ background: cardBg, border: '1px solid rgba(231,76,60,0.2)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#e74c3c' }}>Danger Zone</h2>
            <p className="text-[12px] mb-4" style={{ color: muted }}>
              Permanently delete this workspace and all its data. This action cannot be undone.
            </p>
            <button onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#e74c3c' }}>
              Delete Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

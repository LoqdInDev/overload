import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function WorkspaceSettingsPage() {
  const { dark } = useTheme();
  const { current, updateWorkspace, deleteWorkspace, workspaces } = useWorkspace();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [loading, setLoading] = useState(true);

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

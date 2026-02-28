import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const WS_COLORS = ['#C45D3E', '#5E8E6E', '#4A7FB5', '#8B6BAE', '#C4873E', '#3E8E8E', '#7B6348', '#B55A7A'];

function getWsColor(index) {
  return WS_COLORS[index % WS_COLORS.length];
}

export default function WorkspaceSettingsPage() {
  const { dark } = useTheme();
  const { current, updateWorkspace, deleteWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');

  const ink = dark ? '#F5EDE6' : '#2C2825';
  const sub = dark ? '#C4BAB0' : '#5C5650';
  const muted = dark ? '#A39B91' : '#8C857D';
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const cardBg = dark ? '#262320' : '#fff';
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const inputBg = dark ? '#1E1B18' : '#FDFBF8';
  const pageBg = dark ? '#1A1714' : '#FBF7F0';
  const hoverBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.04)';

  useEffect(() => {
    if (current) {
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
    if (!renameName.trim() || renameName.trim() === current.name) { setRenaming(false); return; }
    try {
      await updateWorkspace(current.id, renameName.trim());
      toast.success('Workspace renamed');
      setRenaming(false);
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
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${terra}12` }}>
          <svg className="w-5 h-5 animate-spin" fill="none" stroke={terra} viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
          </svg>
        </div>
        <p className="text-sm font-medium">Loading workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10" style={{ color: ink }}>
      <div className="max-w-[680px] mx-auto">

        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: dark ? `${terra}18` : `${terra}10` }}>
              <svg className="w-5 h-5" fill="none" stroke={terra} viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Workspace Settings</h1>
              <p className="text-[13px] mt-0.5" style={{ color: muted }}>Manage your workspace, team members, and permissions.</p>
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: muted }}>Your Workspaces</span>
            <div className="flex-1 h-px" style={{ background: borderColor }} />
          </div>
          <div className="flex items-start gap-5 flex-wrap">
            {workspaces.map((ws, i) => {
              const isActive = ws.id === current.id;
              const color = getWsColor(i);
              return (
                <div key={ws.id} className="flex flex-col items-center gap-2.5 group transition-all duration-200">
                  <button
                    onClick={() => { if (!isActive) switchWorkspace(ws); }}
                    className="relative flex items-center justify-center rounded-2xl transition-all duration-200"
                    style={{
                      width: 80, height: 80,
                      cursor: isActive ? 'default' : 'pointer',
                      background: isActive
                        ? (dark ? `linear-gradient(145deg, ${color}30, ${color}15)` : `linear-gradient(145deg, ${color}18, ${color}08)`)
                        : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'),
                      border: `2px solid ${isActive ? color : borderColor}`,
                      boxShadow: isActive ? `0 6px 20px -6px ${color}35` : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = dark ? `${color}12` : `${color}08`; e.currentTarget.style.borderColor = `${color}60`; e.currentTarget.style.boxShadow = `0 4px 12px -4px ${color}20`; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)'; e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                  >
                    <span className="text-[22px] font-bold" style={{ color: isActive ? color : muted, fontFamily: "'Fraunces', Georgia, serif" }}>
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: color, boxShadow: `0 2px 6px ${color}40` }}>
                        <svg className="w-3 h-3" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                  </button>
                  {isActive && renaming ? (
                    <form onSubmit={handleRename} className="flex items-center gap-1">
                      <input autoFocus value={renameName} onChange={e => setRenameName(e.target.value)}
                        className="w-[88px] text-[12px] font-medium text-center px-1.5 py-0.5 rounded-md border outline-none"
                        style={{ background: inputBg, borderColor: color, color: ink, boxShadow: `0 0 0 2px ${color}15` }}
                        onKeyDown={e => { if (e.key === 'Escape') setRenaming(false); }}
                        onBlur={() => { if (!renameName.trim() || renameName.trim() === current.name) setRenaming(false); }}
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => { if (isActive) { setRenameName(current.name); setRenaming(true); } }}
                      className="flex items-center gap-1 max-w-[100px] transition-colors duration-150"
                      style={{ cursor: isActive ? 'pointer' : 'default' }}
                      title={isActive ? 'Click to rename' : ws.name}
                    >
                      <span className="text-[12px] font-medium truncate leading-tight" style={{ color: isActive ? color : muted }}>
                        {ws.name}
                      </span>
                      {isActive && (
                        <svg className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {creating ? (
              <div className="flex flex-col items-center gap-2.5">
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
                    className="rounded-2xl text-sm border-2 outline-none text-center font-medium"
                    style={{ background: inputBg, borderColor: terra, color: ink, width: 80, height: 80, boxShadow: `0 0 0 3px ${terra}15` }}
                    onKeyDown={e => { if (e.key === 'Escape') { setCreating(false); setNewWsName(''); } }}
                    onBlur={() => { if (!newWsName.trim()) { setCreating(false); setNewWsName(''); } }}
                  />
                </form>
                <span className="text-[12px] font-medium" style={{ color: terra }}>Create</span>
              </div>
            ) : (
              <button onClick={() => setCreating(true)}
                className="flex flex-col items-center gap-2.5 group transition-all duration-200"
              >
                <div className="flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={{
                    width: 80, height: 80,
                    background: 'transparent',
                    border: `2px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(44,40,37,0.15)'}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = terra; e.currentTarget.style.background = dark ? `${terra}08` : `${terra}05`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(44,40,37,0.15)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <svg className="w-6 h-6 transition-colors duration-200" fill="none" stroke={muted} viewBox="0 0 24 24" strokeWidth={1.5}
                    style={{ color: muted }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[12px] font-medium" style={{ color: muted }}>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: dark ? 'none' : '0 1px 3px rgba(44,40,37,0.04)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: dark ? `${sage}18` : `${sage}10` }}>
              <svg className="w-4 h-4" fill="none" stroke={sage} viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[14px] font-semibold" style={{ color: ink }}>Team Members</h2>
              <p className="text-[11px]" style={{ color: muted }}>Invite people and manage access</p>
            </div>
            {members.length > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: dark ? `${sage}18` : `${sage}10`, color: sage }}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>

          <div className="p-6">
            {/* Invite Form */}
            <form onSubmit={handleInvite} className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke={muted} viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="Email address..."
                  type="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all duration-200"
                  style={{ background: inputBg, borderColor, color: ink }}
                  onFocus={e => { e.currentTarget.style.borderColor = sage; e.currentTarget.style.boxShadow = `0 0 0 3px ${sage}10`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2.5 rounded-xl text-sm border outline-none transition-all duration-200 cursor-pointer"
                style={{ background: inputBg, borderColor, color: ink }}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center gap-2"
                style={{ background: sage, boxShadow: `0 2px 8px ${sage}30` }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${sage}40`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 8px ${sage}30`; }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Invite
              </button>
            </form>

            {/* Members List */}
            {members.length > 0 ? (
              <div className="mt-5 space-y-1">
                {members.map((member, i) => {
                  const color = getWsColor(i + 2);
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                        style={{ background: `${color}15`, color }}>
                        {(member.display_name || member.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{member.display_name || 'Unnamed'}</div>
                        <div className="text-[11px] truncate" style={{ color: muted }}>{member.email}</div>
                      </div>
                      {member.role === 'owner' ? (
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
                          style={{ background: dark ? `${terra}15` : `${terra}10`, color: terra }}>
                          Owner
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select value={member.role}
                            onChange={e => handleRoleChange(member.user_id, e.target.value)}
                            className="text-[12px] px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors"
                            style={{ background: inputBg, borderColor, color: sub }}>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button onClick={() => handleRemoveMember(member.user_id, member.email)}
                            className="text-[12px] px-2.5 py-1.5 rounded-lg transition-all duration-150 font-medium"
                            style={{ color: muted }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#e74c3c'; e.currentTarget.style.background = 'rgba(231,76,60,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = muted; e.currentTarget.style.background = 'transparent'; }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !loading && (
              <div className="mt-6 text-center py-8 rounded-xl" style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(44,40,37,0.015)', border: `1px dashed ${borderColor}` }}>
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: dark ? `${sage}12` : `${sage}08` }}>
                  <svg className="w-6 h-6" fill="none" stroke={sage} viewBox="0 0 24 24" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium mb-1" style={{ color: sub }}>No team members yet</p>
                <p className="text-[12px]" style={{ color: muted }}>Invite people by email to collaborate in this workspace.</p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        {current.role === 'owner' && workspaces.length > 1 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${dark ? 'rgba(231,76,60,0.15)' : 'rgba(231,76,60,0.12)'}`, boxShadow: dark ? 'none' : '0 1px 3px rgba(44,40,37,0.04)' }}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${dark ? 'rgba(231,76,60,0.1)' : 'rgba(231,76,60,0.08)'}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(231,76,60,0.08)' }}>
                <svg className="w-4 h-4" fill="none" stroke="#e74c3c" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold" style={{ color: '#e74c3c' }}>Danger Zone</h2>
                <p className="text-[11px]" style={{ color: muted }}>Irreversible and destructive actions</p>
              </div>
            </div>
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium" style={{ color: sub }}>Delete this workspace</p>
                <p className="text-[12px] mt-0.5" style={{ color: muted }}>
                  Permanently delete "{current.name}" and all its data. This cannot be undone.
                </p>
              </div>
              <button onClick={handleDelete}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex-shrink-0"
                style={{ background: '#e74c3c', boxShadow: '0 2px 8px rgba(231,76,60,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(231,76,60,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(231,76,60,0.25)'; }}
              >
                Delete Workspace
              </button>
            </div>
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}

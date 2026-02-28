import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJSON, postJSON, putJSON, deleteJSON } from '../lib/api';

const WORKSPACE_KEY = 'overload_workspace_id';

const WorkspaceContext = createContext({
  workspaces: [],
  current: null,
  loading: true,
  switchWorkspace: () => {},
  createWorkspace: () => {},
  updateWorkspace: () => {},
  deleteWorkspace: () => {},
  refreshWorkspaces: () => {},
});

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/workspaces');
      setWorkspaces(data);

      const savedId = localStorage.getItem(WORKSPACE_KEY);
      const match = data.find(w => w.id === savedId) || data[0];
      if (match) {
        setCurrent(match);
        localStorage.setItem(WORKSPACE_KEY, match.id);
      } else if (data.length === 0) {
        // No workspaces exist — create a default one
        try {
          const ws = await postJSON('/api/workspaces', { name: 'My Workspace' });
          setWorkspaces([ws]);
          setCurrent(ws);
          localStorage.setItem(WORKSPACE_KEY, ws.id);
        } catch (createErr) {
          console.error('Failed to create default workspace:', createErr);
          // Use a local fallback so the UI still works
          const fallback = { id: 'local', name: 'My Workspace', role: 'owner' };
          setCurrent(fallback);
          setWorkspaces([fallback]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch workspaces:', e);
      // Fallback workspace when API is unreachable
      const fallback = { id: 'local', name: 'My Workspace', role: 'owner' };
      setCurrent(fallback);
      setWorkspaces([fallback]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshWorkspaces(); }, [refreshWorkspaces]);

  const switchWorkspace = useCallback((workspace) => {
    setCurrent(workspace);
    localStorage.setItem(WORKSPACE_KEY, workspace.id);
    // Force page reload to refresh all data with new workspace context
    window.location.reload();
  }, []);

  const createWorkspace = useCallback(async (name) => {
    const ws = await postJSON('/api/workspaces', { name });
    setWorkspaces(prev => [...prev, ws]);
    return ws;
  }, []);

  const updateWorkspace = useCallback(async (id, name) => {
    const ws = await putJSON(`/api/workspaces/${id}`, { name });
    setWorkspaces(prev => prev.map(w => w.id === id ? ws : w));
    if (current?.id === id) setCurrent(ws);
    return ws;
  }, [current]);

  const deleteWorkspace = useCallback(async (id) => {
    await deleteJSON(`/api/workspaces/${id}`);
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    if (current?.id === id) {
      const remaining = workspaces.filter(w => w.id !== id);
      if (remaining.length > 0) {
        switchWorkspace(remaining[0]);
      }
    }
  }, [current, workspaces, switchWorkspace]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, current, loading,
      switchWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);

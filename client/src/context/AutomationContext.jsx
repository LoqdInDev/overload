import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchJSON, postJSON } from '../lib/api';

const AutomationContext = createContext(null);

export function AutomationProvider({ children }) {
  const [modes, setModes] = useState({});
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingByModule, setPendingByModule] = useState({});
  const [actionStats, setActionStats] = useState({ today: 0, completed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const refreshModes = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/automation/modes');
      setModes(data);
    } catch {
      // Server unavailable — default everything to manual
      setModes({});
    }
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/automation/approvals/count');
      setPendingCount(data.total || 0);
      setPendingByModule(data.byModule || {});
    } catch {
      setPendingCount(0);
      setPendingByModule({});
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/automation/actions/stats');
      setActionStats({
        today: data.today || 0,
        completed: data.completed || 0,
        failed: data.failed || 0,
      });
    } catch {
      setActionStats({ today: 0, completed: 0, failed: 0 });
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.allSettled([refreshModes(), refreshPending(), refreshStats()])
      .finally(() => setLoading(false));
  }, [refreshModes, refreshPending, refreshStats]);

  // Poll pending count every 30s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      refreshPending();
      refreshStats();
    }, 30000);
    return () => clearInterval(pollRef.current);
  }, [refreshPending, refreshStats]);

  const getMode = useCallback((moduleId) => {
    return modes[moduleId]?.mode || 'manual';
  }, [modes]);

  const setMode = useCallback(async (moduleId, mode) => {
    try {
      await postJSON(`/api/automation/modes/${moduleId}`, { mode });
      setModes(prev => ({
        ...prev,
        [moduleId]: { ...prev[moduleId], mode },
      }));
    } catch (err) {
      console.error('Failed to set mode:', err);
      throw err;
    }
  }, []);

  const value = {
    modes,
    pendingCount,
    pendingByModule,
    actionStats,
    getMode,
    setMode,
    refreshModes,
    refreshPending,
    loading,
  };

  return (
    <AutomationContext.Provider value={value}>
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomation() {
  const ctx = useContext(AutomationContext);
  if (!ctx) {
    // Return safe defaults when used outside provider (e.g., landing page)
    return {
      modes: {},
      pendingCount: 0,
      pendingByModule: {},
      actionStats: { today: 0, completed: 0, failed: 0 },
      getMode: () => 'manual',
      setMode: async () => {},
      refreshModes: async () => {},
      refreshPending: async () => {},
      loading: false,
    };
  }
  return ctx;
}

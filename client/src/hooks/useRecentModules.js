import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MODULE_REGISTRY } from '../config/modules';

const STORAGE_KEY = 'overload_recents';
const MAX_RECENTS = 5;

export function useRecentModules() {
  const location = useLocation();
  const [recents, setRecents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const mod = MODULE_REGISTRY.find(m =>
      m.path !== '/dashboard' && location.pathname.startsWith(m.path)
    );
    if (mod) {
      setRecents(prev => {
        const filtered = prev.filter(id => id !== mod.id);
        const updated = [mod.id, ...filtered].slice(0, MAX_RECENTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [location.pathname]);

  return recents.map(id => MODULE_REGISTRY.find(m => m.id === id)).filter(Boolean);
}

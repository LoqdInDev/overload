import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MODULE_REGISTRY } from '../config/modules';

export function useModule() {
  const location = useLocation();

  return useMemo(() => {
    const path = location.pathname;
    const mod = MODULE_REGISTRY.find(m => path.startsWith(m.path));
    return mod || null;
  }, [location.pathname]);
}

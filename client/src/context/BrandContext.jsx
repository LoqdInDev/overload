import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJSON } from '../lib/api';

const BrandContext = createContext({ brand: null, loading: true, refreshBrand: () => {} });

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshBrand = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/brand-profile/profile');
      setBrand(data && data.brand_name ? data : null);
    } catch (e) {
      console.error('Failed to fetch brand profile:', e);
      setBrand(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshBrand(); }, [refreshBrand]);

  return (
    <BrandContext.Provider value={{ brand, loading, refreshBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);

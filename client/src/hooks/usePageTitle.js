import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Overload` : 'Overload';
    return () => { document.title = prev; };
  }, [title]);
}

import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function reportWebVitals(onReport) {
  onCLS(onReport);
  onINP(onReport);
  onLCP(onReport);
  onFCP(onReport);
  onTTFB(onReport);
}

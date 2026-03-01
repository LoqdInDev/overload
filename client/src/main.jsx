import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { setupAuthInterceptor } from './lib/api';
import { reportWebVitals } from './lib/webVitals';
import { initErrorReporting, reportError } from './lib/errorReporting';
import './index.css';

setupAuthInterceptor();
initErrorReporting();

// Global unhandled error listener
window.addEventListener('error', (event) => {
  reportError(event.error, { source: 'window.onerror' });
});
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { source: 'unhandledrejection' });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Report Web Vitals — logs to console; pipe to analytics when ready
reportWebVitals((metric) => {
  if (import.meta.env.DEV) {
    console.debug('[WebVitals]', metric.name, metric.value.toFixed(2));
  }
});

// Register service worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

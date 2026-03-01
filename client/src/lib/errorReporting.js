/**
 * Error reporting module — Sentry-ready placeholder.
 * Set VITE_SENTRY_DSN in your .env to enable Sentry integration.
 */

let isInitialized = false;

export function initErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    // Placeholder: replace with actual Sentry SDK initialization
    // e.g. Sentry.init({ dsn, environment: import.meta.env.MODE })
    console.info('[ErrorReporting] Sentry DSN detected — would initialize Sentry with DSN:', dsn);
    isInitialized = true;
  } else {
    console.info('[ErrorReporting] No VITE_SENTRY_DSN set — errors will be logged to console only.');
  }
}

export function reportError(error, context = {}) {
  const payload = {
    message: error?.message || String(error),
    stack: error?.stack,
    ...context,
    timestamp: new Date().toISOString(),
  };

  console.error('[ErrorReporting]', payload);

  if (isInitialized) {
    // Placeholder: would send to Sentry
    // e.g. Sentry.captureException(error, { extra: context })
  }
}

/**
 * Error reporting module — Sentry integration.
 * Set VITE_SENTRY_DSN in your .env to enable Sentry.
 */
import * as Sentry from '@sentry/react';

let isInitialized = false;

export function initErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      enabled: import.meta.env.PROD,
      tracesSampleRate: 0.1,
    });
    isInitialized = true;
  }
}

export function reportError(error, context = {}) {
  if (import.meta.env.DEV) {
    console.error('[ErrorReporting]', error, context);
  }

  if (isInitialized) {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      extra: context,
    });
  }
}

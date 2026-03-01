/**
 * Analytics placeholder module.
 * Set VITE_GA_ID in your .env to enable Google Analytics integration.
 */

let isInitialized = false;

export function initAnalytics() {
  const gaId = import.meta.env.VITE_GA_ID;
  if (gaId) {
    // Placeholder: replace with actual GA4 or analytics SDK setup
    // e.g. load gtag.js script and configure with gaId
    console.info('[Analytics] GA ID detected — would initialize Google Analytics with ID:', gaId);
    isInitialized = true;
  } else {
    console.info('[Analytics] No VITE_GA_ID set — analytics events will be logged to console only.');
  }
}

export function trackEvent(name, properties = {}) {
  if (import.meta.env.DEV) {
    console.debug('[Analytics] trackEvent:', name, properties);
  }

  if (isInitialized) {
    // Placeholder: would send to GA4
    // e.g. gtag('event', name, properties)
  }
}

export function trackPageView(path) {
  if (import.meta.env.DEV) {
    console.debug('[Analytics] trackPageView:', path);
  }

  if (isInitialized) {
    // Placeholder: would send page view to GA4
    // e.g. gtag('config', gaId, { page_path: path })
  }
}

import * as Sentry from '@sentry/node';
import { appConfig } from './env.js';

/**
 * Initialises Sentry error tracking. Gracefully no-ops if SENTRY_DSN is not
 * configured so the server still boots cleanly in development or in Render
 * environments that haven't set the key yet.
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    if (appConfig.nodeEnv === 'production') {
      console.warn('⚠️  WARNING: SENTRY_DSN is not set. Error tracking is disabled in production.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: appConfig.nodeEnv,
    // Strip PII from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http') {
        delete breadcrumb.data?.['Authorization'];
      }
      return breadcrumb;
    },
    // Capture 100% of errors; adjust tracesSampleRate for performance tracing
    tracesSampleRate: appConfig.nodeEnv === 'production' ? 0.1 : 0,
  });
}

/**
 * Express error-handler that forwards unhandled errors to Sentry before
 * returning a generic 500. Must be registered AFTER all route handlers.
 */
export { Sentry };

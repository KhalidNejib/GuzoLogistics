c: \Users\HP\Downloads\socket.tsimport * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: SENTRY_DSN is not set. Error tracking is disabled in production.');
  }
}

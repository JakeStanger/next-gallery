import * as Sentry from '@sentry/nextjs';

// Sentry v8+ initialises the server SDK via Next's instrumentation hook
// instead of the auto-injected sentry.server.config.js.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
}

export const onRequestError = Sentry.captureRequestError;

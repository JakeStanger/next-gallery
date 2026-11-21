import * as Sentry from '@sentry/nextjs';

// Initialises the server SDK via Next's instrumentation hook. On Cloudflare
// Workers, Sentry is initialised by `withSentry` in worker.ts, so only
// initialise here when running on Node.js (`next start`).
export async function register() {
  const isCloudflareWorker =
    typeof navigator !== 'undefined' &&
    navigator.userAgent === 'Cloudflare-Workers';

  if (process.env.NEXT_RUNTIME === 'nodejs' && !isCloudflareWorker) {
    await import('./sentry.server.config');
  }
}

export const onRequestError = Sentry.captureRequestError;

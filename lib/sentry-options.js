/**
 * Shared Sentry init options (client / server / edge).
 * DSN via env — without DSN the SDK no-ops.
 */

function tracesSampleRate() {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (raw != null && String(raw).trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 0;
}

export function getSentryDsn() {
  return (
    String(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '').trim() || undefined
  );
}

export function buildSentryOptions({ runtime }) {
  const dsn = getSentryDsn();
  return {
    dsn,
    enabled: Boolean(dsn),
    environment:
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'development',
    tracesSampleRate: tracesSampleRate(),
    // Avoid sending PII by default
    sendDefaultPii: false,
    // Tag for filtering in Sentry UI
    initialScope: {
      tags: { runtime, product: '30team' },
    },
  };
}

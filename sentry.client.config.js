// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { buildSentryOptions } from './lib/sentry-options.js';

Sentry.init({
  ...buildSentryOptions({ runtime: 'browser' }),
  // Session Replay off by default (cost + privacy); enable via env if needed
  replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0),
  replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 0),
  integrations: [
    ...(Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 0) > 0 ||
    Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0) > 0
      ? [Sentry.replayIntegration()]
      : []),
  ],
});

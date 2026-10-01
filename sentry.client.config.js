// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { buildSentryOptions } from './lib/sentry-options.js';

// Session Replay off by default (cost + privacy); enable via env if needed
const replaysSessionSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0);
const replaysOnErrorSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 0);

Sentry.init({
  ...buildSentryOptions({ runtime: 'browser' }),
  replaysSessionSampleRate,
  replaysOnErrorSampleRate,
});

// Replay (rrweb) is fetched from the Sentry CDN only when enabled, so it stays out of every page bundle.
if (replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0) {
  Sentry.lazyLoadIntegration('replayIntegration')
    .then((replayIntegration) => Sentry.addIntegration(replayIntegration()))
    .catch(() => {});
}

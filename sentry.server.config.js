// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { buildSentryOptions } from './lib/sentry-options.js';

Sentry.init(buildSentryOptions({ runtime: 'nodejs' }));

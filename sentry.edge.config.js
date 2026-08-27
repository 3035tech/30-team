// This file configures the initialization of Sentry for edge runtimes
// (middleware, edge routes). https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { buildSentryOptions } from './lib/sentry-options.js';

Sentry.init(buildSentryOptions({ runtime: 'edge' }));

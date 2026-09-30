'use client';

import './globals.css';
import { AppErrorScreen } from './_components/AppErrorScreen';

/**
 * Root layout error boundary. Renders its own document, so global styles are imported here.
 * Sentry capture happens inside `AppErrorScreen`.
 */
export default function GlobalError({ error, retry, reset }) {
  const onRetry = typeof retry === 'function' ? retry : reset;
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-canvas font-ui text-ink antialiased">
        <title>30Grow</title>
        <AppErrorScreen error={error} onRetry={onRetry} className="min-h-screen" />
      </body>
    </html>
  );
}

'use client';

import { AppErrorScreen } from './_components/AppErrorScreen';

/** Route-level error boundary: keeps the root layout (styles, theme) and shows the friendly error state. */
export default function AppError({ error, retry, reset }) {
  const onRetry = typeof retry === 'function' ? retry : reset;
  return <AppErrorScreen error={error} onRetry={onRetry} className="min-h-screen bg-canvas" />;
}

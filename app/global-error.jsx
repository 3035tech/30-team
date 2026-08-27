'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * App Router global error boundary — reports to Sentry when DSN is set.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo deu errado</h1>
        <p style={{ color: '#555', marginBottom: 16 }}>
          O erro foi registrado. Tente novamente ou volte ao painel.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#f5f5f5',
            cursor: 'pointer',
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}

import { NextResponse } from 'next/server';
import { query, getPoolStats } from '../../../lib/db';

export const dynamic = 'force-dynamic';

function authorizedDetailed(request) {
  const secret = String(process.env.HEALTH_METRICS_SECRET ?? '').trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('token') === secret;
}

/**
 * GET /api/health — liveness + ping ao Postgres.
 * Detalhes (filas do pool): Authorization: Bearer HEALTH_METRICS_SECRET ou ?token= (mesmo valor).
 */
export async function GET(request) {
  const started = Date.now();
  let database = 'down';
  try {
    await query('SELECT 1 AS ok');
    database = 'up';
  } catch (e) {
    console.error('health db check failed:', e);
  }

  const base = {
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    uptimeProcessSec: Math.round(process.uptime()),
    latencyMs: Date.now() - started,
  };

  if (!authorizedDetailed(request)) {
    return NextResponse.json(base);
  }

  return NextResponse.json({
    ...base,
    pg: getPoolStats(),
  });
}

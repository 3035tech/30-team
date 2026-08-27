import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, ERR } from '../../../../lib/api-error';
import { runManagerWeeklyDigest } from '../../../../lib/manager-weekly-digest';

export const dynamic = 'force-dynamic';

function verifyCron(request) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer === secret) return true;
  const hdr = (request.headers.get('x-cron-secret') || '').trim();
  return hdr === secret;
}

/**
 * POST /api/cron/manager-weekly-digest
 * Resumo semanal: retention_watch recentes + 1:1 em atraso (notif in-app + e-mail opcional).
 */
export async function POST(request) {
  try {
    if (!verifyCron(request)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const url = new URL(request.url);
    const retentionDays = parseInt(url.searchParams.get('retentionDays') || '7', 10);
    const staleOneOnOneDays = parseInt(url.searchParams.get('staleDays') || '21', 10);
    const sendEmail = url.searchParams.get('email') !== '0';

    const result = await runManagerWeeklyDigest(query, {
      retentionDays,
      staleOneOnOneDays,
      sendEmail,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/cron/manager-weekly-digest', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

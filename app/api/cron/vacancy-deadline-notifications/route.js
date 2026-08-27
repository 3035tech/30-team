import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, ERR } from '../../../../lib/api-error';
import { notifyApproachingVacancyDeadlines } from '../../../../lib/manager-notifications';

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
 * POST /api/cron/vacancy-deadline-notifications
 * Notifica o time RH da empresa quando o target_date da vaga está próximo (padrão: 7 dias).
 * Requer CRON_SECRET (Bearer ou X-Cron-Secret).
 */
export async function POST(request) {
  try {
    if (!verifyCron(request)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const url = new URL(request.url);
    const withinDays = parseInt(url.searchParams.get('withinDays') || '7', 10);
    const result = await notifyApproachingVacancyDeadlines(query, { withinDays });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/cron/vacancy-deadline-notifications', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

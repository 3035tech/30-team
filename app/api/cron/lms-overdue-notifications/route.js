import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, ERR } from '../../../../lib/api-error';
import { notifyLmsOverdueEnrollments } from '../../../../lib/lms.js';

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
 * POST /api/cron/lms-overdue-notifications
 * Notifies company managers about overdue LMS enrollments (dedupe per enrollment+day).
 */
export async function POST(request) {
  try {
    if (!verifyCron(request)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const url = new URL(request.url);
    const withinPastDays = parseInt(url.searchParams.get('withinPastDays') || '30', 10);
    const result = await notifyLmsOverdueEnrollments(query, { withinPastDays });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/cron/lms-overdue-notifications', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

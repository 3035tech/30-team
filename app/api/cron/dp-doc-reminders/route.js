import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, ERR } from '../../../../lib/api-error';
import { notifyDpPendingDocuments } from '../../../../lib/people/employee-dp.js';

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
 * POST /api/cron/dp-doc-reminders
 * Remind managers + collaborators about pending DP documents (dedupe per day).
 */
export async function POST(request) {
  try {
    if (!verifyCron(request)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const result = await notifyDpPendingDocuments(query);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/cron/dp-doc-reminders', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

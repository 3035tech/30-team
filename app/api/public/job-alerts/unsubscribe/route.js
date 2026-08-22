import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error';
import { unsubscribeJobAlert } from '../../../../../lib/job-alerts';

export async function GET(request) {
  const token = String(new URL(request.url).searchParams.get('token') || '').trim();
  const result = await unsubscribeJobAlert(token);
  if (!result.ok) return apiError(request, result.errorCode || 'INVALID_TOKEN', 400);
  return NextResponse.json({ ok: true, unsubscribed: Boolean(result.updated) });
}

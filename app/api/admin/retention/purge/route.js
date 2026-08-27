import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../lib/auth';
import { audit } from '../../../../../lib/audit';
import { apiError, ERR } from '../../../../../lib/api-error';
import { CAP, requireCapability } from '../../../../../lib/permissions';
import { purgeExpiredAssessmentsAndOrphans } from '../../../../../lib/retention';

export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);

  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  const days =
    parseInt(searchParams.get('days') || body.days || process.env.RETENTION_DAYS || '', 10) || 0;

  if (days <= 0) {
    return apiError(request, ERR.INVALID_RETENTION_DAYS, 400);
  }

  let result;
  try {
    result = await purgeExpiredAssessmentsAndOrphans({ days });
  } catch (err) {
    if (String(err?.message || '') === 'INVALID_RETENTION_DAYS') {
      return apiError(request, ERR.INVALID_RETENTION_DAYS, 400);
    }
    throw err;
  }

  await audit({
    actorUserId: payload.userId || null,
    action: 'retention.purge',
    targetType: 'retention',
    targetId: String(days),
    metadata: result,
  });

  return NextResponse.json({ ok: true, ...result });
}

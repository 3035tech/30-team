import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../../lib/api-error.js';
import { auditFromRequest, AUDIT_ACTOR_KIND } from '../../../../../../../lib/audit.js';
import { verify2faLogin } from '../../../../../../../lib/manager-2fa.js';
import {
  completeMobileAuthentication,
  loadMobileLoginUserById,
  verifyMobileSecondFactorToken,
} from '../../../../../../../lib/mobile-manager-session.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../../lib/rate-limit.js';
import { parseJsonBody } from '../../../../../../../lib/validate.js';

const verifySchema = z.object({
  challengeToken: z.string().min(1).max(4096),
  code: z.string().trim().regex(/^\d{6}$/),
});

function noStoreJson(body) {
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rate = await checkRateLimit(`mobile-2fa:${ip}`, 15, 15 * 60 * 1000);
    if (!rate.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, {
        headers: { 'Retry-After': String(rate.retryAfterSec), 'Cache-Control': 'no-store' },
      });
    }
    const parsed = await parseJsonBody(request, verifySchema);
    if (!parsed.ok) return parsed.response;
    const challenge = verifyMobileSecondFactorToken(parsed.data.challengeToken);
    if (!challenge) return apiError(request, ERR.TWO_FA_CHALLENGE_INVALID, 401);
    const verified = await verify2faLogin(challenge.userId, parsed.data.code);
    if (!verified.ok) return apiError(request, ERR.TOTP_INVALID, 401);
    const user = await loadMobileLoginUserById(challenge.userId);
    if (!user || Number(user.sessionVersion) !== challenge.sessionVersion) {
      return apiError(request, ERR.TWO_FA_CHALLENGE_INVALID, 401);
    }
    const result = await completeMobileAuthentication(user);
    if (!result.ok) return apiError(request, ERR.UNAVAILABLE, 403);
    await auditFromRequest(request, {
      actorUserId: challenge.userId,
      actorKind: AUDIT_ACTOR_KIND.MANAGER,
      companyId: result.session?.activeMembership?.company?.id ?? null,
      action: 'auth.mobile.login_2fa',
      targetType: 'user',
      targetId: challenge.userId,
      metadata: { outcome: result.outcome },
    });
    return noStoreJson(result);
  } catch (error) {
    console.error('[mobile-auth-2fa]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

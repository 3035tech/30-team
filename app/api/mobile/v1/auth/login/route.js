import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../lib/api-error.js';
import { auditFromRequest, AUDIT_ACTOR_KIND } from '../../../../../../lib/audit.js';
import { query } from '../../../../../../lib/db.js';
import {
  completeMobileAuthentication,
  loadMobileLoginUserByEmail,
  mobileLoginUserIsEligible,
  MOBILE_AUTH_OUTCOME,
  signMobileSecondFactorToken,
  verifyMobilePassword,
} from '../../../../../../lib/mobile-manager-session.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';
import { parseJsonBody } from '../../../../../../lib/validate.js';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

function noStoreJson(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

async function invalidCredentials(request) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return apiError(request, ERR.INVALID_CREDENTIALS, 401);
}

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rate = await checkRateLimit(`mobile-login:${ip}`, 20, 15 * 60 * 1000);
    if (!rate.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, {
        headers: { 'Retry-After': String(rate.retryAfterSec), 'Cache-Control': 'no-store' },
      });
    }
    const parsed = await parseJsonBody(request, loginSchema);
    if (!parsed.ok) return parsed.response;
    const user = await loadMobileLoginUserByEmail(parsed.data.email);
    if (!mobileLoginUserIsEligible(user)) return invalidCredentials(request);
    if (!(await verifyMobilePassword(user, parsed.data.password))) return invalidCredentials(request);

    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]).catch(() => {});
    if (user.totpEnabledAt) {
      return noStoreJson({
        outcome: MOBILE_AUTH_OUTCOME.REQUIRES_SECOND_FACTOR,
        challengeToken: signMobileSecondFactorToken(user),
      });
    }

    const result = await completeMobileAuthentication(user);
    if (!result.ok) return apiError(request, ERR.UNAVAILABLE, 403);
    await auditFromRequest(request, {
      actorUserId: user.id,
      actorKind: AUDIT_ACTOR_KIND.MANAGER,
      companyId: result.session?.activeMembership?.company?.id ?? null,
      action: 'auth.mobile.login',
      targetType: 'user',
      targetId: user.id,
      metadata: { outcome: result.outcome },
    });
    return noStoreJson(result);
  } catch (error) {
    console.error('[mobile-auth-login]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

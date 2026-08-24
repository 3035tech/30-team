import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit';
import {
  completePasswordSetup,
  peekPasswordSetupToken,
} from '../../../../lib/user-password-invite';
import { audit } from '../../../../lib/audit';

export const dynamic = 'force-dynamic';

/** GET /api/public/set-password?token= — valida convite (e-mail mascarado). */
export async function GET(request) {
  const ip = clientIpFromRequest(request);
  const rl = checkRateLimit(`set-password-peek:${ip}`, 40, 15 * 60 * 1000);
  if (!rl.ok) {
    return apiError(request, 'RATE_LIMIT', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }

  const token = new URL(request.url).searchParams.get('token') || '';
  const peek = await peekPasswordSetupToken(token);
  if (!peek.ok) {
    const status = peek.code === 'TOKEN_EXPIRED' ? 410 : 400;
    return apiError(request, peek.code, status);
  }
  return NextResponse.json({
    ok: true,
    email: peek.maskedEmail,
  });
}

/** POST /api/public/set-password — body: { token, password } */
export async function POST(request) {
  const ip = clientIpFromRequest(request);
  const rl = checkRateLimit(`set-password:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return apiError(request, 'RATE_LIMIT', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }

  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '').trim();
  const password = String(body.password || '');
  const result = await completePasswordSetup(token, password);
  if (!result.ok) {
    const status =
      result.code === 'PASSWORD_TOO_SHORT'
        ? 400
        : result.code === 'TOKEN_EXPIRED'
          ? 410
          : 400;
    return apiError(request, result.code, status);
  }

  await audit({
    actorUserId: result.userId || null,
    action: 'auth.password_setup',
    targetType: 'user',
    targetId: result.userId || null,
    metadata: { via: 'invite_token' },
  });

  return NextResponse.json({ ok: true });
}

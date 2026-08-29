import { NextResponse } from 'next/server';
import { apiError, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit.js';
import { verifyTurnstileToken } from '../../../../../lib/turnstile.js';
import { loginEmployeeWithPassword } from '../../../../../lib/employee-auth.js';
import { query } from '../../../../../lib/db.js';
import { signEmployee2faChallenge } from '../../../../../lib/employee-2fa.js';
import { buildEmployeeLoginResponse } from '../../../../../lib/employee-login-session.js';

export const dynamic = 'force-dynamic';

const FAIL_DELAY_MS = 500;

async function failDelay() {
  await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
}

/** POST /api/auth/employee/login — email + password → cookie (ou desafio 2FA se ativo) */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`employee-login:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, httpStatusForError(ERR.RATE_LIMIT), {}, {
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      });
    }

    const body = await request.json().catch(() => ({}));
    const turnstile = await verifyTurnstileToken({ token: body.turnstileToken, remoteIp: ip });
    if (!turnstile.ok) {
      return apiError(request, ERR.TURNSTILE_FAILED, httpStatusForError(ERR.TURNSTILE_FAILED));
    }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const companySlug = String(body.companySlug || '').trim() || null;
    const locale = body.locale === 'en' ? 'en' : 'pt-BR';

    if (email) {
      const rlEmail = await checkRateLimit(`employee-login-email:${email}`, 12, 15 * 60 * 1000);
      if (!rlEmail.ok) {
        return apiError(request, ERR.RATE_LIMIT, httpStatusForError(ERR.RATE_LIMIT), {}, {
          headers: { 'Retry-After': String(rlEmail.retryAfterSec) },
        });
      }
    }

    const result = await loginEmployeeWithPassword(query, {
      email,
      password,
      companySlug,
    });

    if (result.needsCompanySlug) {
      return apiError(request, ERR.COMPANY_SLUG_REQUIRED, httpStatusForError(ERR.COMPANY_SLUG_REQUIRED));
    }
    if (!result.ok) {
      await failDelay();
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    if (result.requires2fa) {
      return NextResponse.json({
        ok: true,
        requires2fa: true,
        challengeToken: signEmployee2faChallenge({
          candidateId: result.candidateId,
          companyId: result.companyId,
        }),
      });
    }

    return await buildEmployeeLoginResponse({
      candidateId: result.candidateId,
      companyId: result.companyId,
      email: result.email,
      locale,
      fullName: result.fullName,
      request,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('POST employee login', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

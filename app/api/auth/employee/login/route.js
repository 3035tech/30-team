import { NextResponse } from 'next/server';
import { apiError, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit.js';
import {
  loginEmployeeWithPassword,
} from '../../../../../lib/employee-auth.js';
import { query } from '../../../../../lib/db.js';
import { signEmployee2faChallenge } from '../../../../../lib/employee-2fa.js';
import { buildEmployeeLoginResponse } from '../../../../../lib/employee-login-session.js';

export const dynamic = 'force-dynamic';

/** POST /api/auth/employee/login — email + password → cookie (ou desafio 2FA) */
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
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const companyId = body.companyId != null ? parseInt(String(body.companyId), 10) : null;
    const locale = body.locale === 'en' ? 'en' : 'pt-BR';

    const result = await loginEmployeeWithPassword(query, {
      email,
      password,
      companyId: Number.isFinite(companyId) ? companyId : null,
    });

    if (result.ambiguous) {
      return NextResponse.json({
        ok: false,
        ambiguous: true,
        companies: result.companies || [],
      }, { status: 400 });
    }
    if (!result.ok) {
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

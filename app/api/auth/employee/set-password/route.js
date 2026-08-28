import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.js';
import { apiError, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit.js';
import {
  peekEmployeePasswordSetupToken,
  completeEmployeePasswordSetup,
  signEmployeeToken,
  employeeSessionCookieOptions,
  EMPLOYEE_COOKIE_NAME,
} from '../../../../../lib/employee-auth.js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/** GET /api/auth/employee/set-password?token= — peek masked email */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get('token') || '').trim();
    const peek = await peekEmployeePasswordSetupToken(query, token);
    if (!peek.ok) {
      return apiError(
        request,
        peek.errorCode || ERR.INVALID_TOKEN,
        httpStatusForError(peek.errorCode || ERR.INVALID_TOKEN)
      );
    }
    return NextResponse.json({ ok: true, email: peek.maskedEmail });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('GET employee set-password', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** POST /api/auth/employee/set-password — complete invite + optional auto-login */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`employee-set-pwd:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, httpStatusForError(ERR.RATE_LIMIT), {}, {
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    const locale = body.locale === 'en' ? 'en' : 'pt-BR';

    const result = await completeEmployeePasswordSetup(query, { token, password });
    if (!result.ok) {
      return apiError(
        request,
        result.errorCode || ERR.INVALID_TOKEN,
        httpStatusForError(result.errorCode || ERR.INVALID_TOKEN)
      );
    }

    const jwt = signEmployeeToken({
      candidateId: result.candidateId,
      companyId: result.companyId,
      email: result.email,
      locale,
    });
    cookies().set(EMPLOYEE_COOKIE_NAME, jwt, employeeSessionCookieOptions());

    return NextResponse.json({
      ok: true,
      candidateId: result.candidateId,
      companyId: result.companyId,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('POST employee set-password', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '../../../../../lib/db.js';
import { apiError, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit.js';
import {
  EMPLOYEE_COOKIE_NAME,
  employeeSessionCookieOptions,
  loginEmployeeWithPassword,
  signEmployeeToken,
} from '../../../../../lib/employee-auth.js';

export const dynamic = 'force-dynamic';

/** POST /api/auth/employee/login — email + password → cookie */
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
      fullName: result.fullName,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('POST employee login', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

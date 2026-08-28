import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '../../../../../lib/db.js';
import { apiError, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit.js';
import {
  EMPLOYEE_COOKIE_NAME,
  consumeEmployeeMagicToken,
  employeeSessionCookieOptions,
  signEmployeeToken,
} from '../../../../../lib/employee-auth.js';
import { getEmployeeSessionPayload } from '../../../../../lib/employee-session.js';

export const dynamic = 'force-dynamic';

/** GET /api/auth/employee/session — current collaborator session */
export async function GET(request) {
  try {
    const payload = await getEmployeeSessionPayload();
    if (!payload) return apiError(request, ERR.UNAUTHORIZED, 401);
    return NextResponse.json({
      ok: true,
      candidateId: payload.candidateId,
      companyId: payload.companyId,
      email: payload.email,
      locale: payload.locale,
    });
  } catch (err) {
    console.error('GET employee session', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** POST /api/auth/employee/session — exchange magic token for cookie */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`employee-session:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, httpStatusForError(ERR.RATE_LIMIT), {}, {
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const locale = body.locale === 'en' ? 'en' : 'pt-BR';
    const consumed = await consumeEmployeeMagicToken(query, { token });
    if (!consumed.ok) {
      return apiError(
        request,
        consumed.errorCode || ERR.NOT_FOUND,
        httpStatusForError(consumed.errorCode || ERR.NOT_FOUND)
      );
    }

    const jwt = signEmployeeToken({
      candidateId: consumed.candidateId,
      companyId: consumed.companyId,
      email: consumed.email,
      locale,
    });
    const jar = cookies();
    jar.set(EMPLOYEE_COOKIE_NAME, jwt, employeeSessionCookieOptions());

    return NextResponse.json({
      ok: true,
      candidateId: consumed.candidateId,
      companyId: consumed.companyId,
      fullName: consumed.fullName,
    });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('POST employee session', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** DELETE /api/auth/employee/session — logout */
export async function DELETE() {
  const jar = cookies();
  jar.set(EMPLOYEE_COOKIE_NAME, '', employeeSessionCookieOptions({ maxAge: 0 }));
  return NextResponse.json({ ok: true });
}

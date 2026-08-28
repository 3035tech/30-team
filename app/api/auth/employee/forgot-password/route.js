import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.js';
import { apiError, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit.js';
import { requestEmployeePasswordReset } from '../../../../../lib/employee-auth.js';

export const dynamic = 'force-dynamic';

/** POST /api/auth/employee/forgot-password — re-issue set-password email */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`employee-forgot:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, httpStatusForError(ERR.RATE_LIMIT), {}, {
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const companyId = body.companyId != null ? parseInt(String(body.companyId), 10) : null;
    const locale = body.locale === 'en' ? 'en' : 'pt-BR';

    const result = await requestEmployeePasswordReset(query, {
      email,
      companyId: Number.isFinite(companyId) ? companyId : null,
      locale,
    });

    if (!result.ok) {
      return apiError(
        request,
        result.errorCode || ERR.INTERNAL,
        httpStatusForError(result.errorCode || ERR.INTERNAL)
      );
    }

    return NextResponse.json({
      ok: true,
      sent: Boolean(result.sent),
      ambiguous: Boolean(result.ambiguous),
      companies: result.companies || undefined,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('POST employee forgot-password', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError, ERR } from '../../../../../lib/api-error';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit';
import {
  getEmployeePortalView,
  submitEmployeePortalPrep,
} from '../../../../../lib/people/employee-portal';

/** GET /api/public/employee-portal/[token] */
export async function GET(request, { params }) {
  try {
    const token = params?.token;
    if (!token) return apiError(request, ERR.NOT_FOUND, 404);
    const url = new URL(request.url);
    const locale = url.searchParams.get('locale') || 'pt-BR';
    const view = await getEmployeePortalView(query, { token, locale });
    if (!view.ok) {
      const code = view.errorCode || 'NOT_FOUND';
      const status = code === 'NOT_FOUND' ? 404 : 410;
      return apiError(request, code, status);
    }
    return NextResponse.json({
      personName: view.personName,
      plans: view.plans,
      recentAgreements: view.recentAgreements,
      oneOnOnePrompts: view.oneOnOnePrompts,
      expiresAt: view.expiresAt,
      preparedAt: view.preparedAt,
      noteToManager: view.noteToManager,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('GET public employee-portal', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** POST /api/public/employee-portal/[token] — mark prep + optional note */
export async function POST(request, { params }) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`public-employee-portal:${ip}`, 40, 10 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const token = params?.token;
    if (!token) return apiError(request, ERR.NOT_FOUND, 404);
    const body = await request.json().catch(() => ({}));
    if (!body.prepared && body.noteToManager == null) {
      return apiError(request, ERR.INVALID_DATA, 400);
    }
    const saved = await submitEmployeePortalPrep(query, {
      token,
      noteToManager: body.noteToManager,
    });
    if (!saved.ok) {
      const code = saved.errorCode || 'NOT_FOUND';
      const status = code === 'NOT_FOUND' ? 404 : 410;
      return apiError(request, code, status);
    }
    return NextResponse.json({
      ok: true,
      preparedAt: saved.preparedAt,
      noteToManager: saved.noteToManager,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('POST public employee-portal', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

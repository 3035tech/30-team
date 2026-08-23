import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError } from '../../../../../lib/api-error';
import { getEmployeePortalView } from '../../../../../lib/people/employee-portal';

/** GET /api/public/employee-portal/[token] */
export async function GET(request, { params }) {
  try {
    const token = params?.token;
    if (!token) return apiError(request, 'NOT_FOUND', 404);
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
    });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET public employee-portal', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

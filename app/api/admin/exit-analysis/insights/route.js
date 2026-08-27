import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../../lib/api-error.js';
import { getExitInsights } from '../../../../../lib/exit-analysis.js';

/**
 * GET /api/admin/exit-analysis/insights — get exit insights (M1/M3/M4 patterns)
 */

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    const data = await getExitInsights(null, { companyId });
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/exit-analysis/insights error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

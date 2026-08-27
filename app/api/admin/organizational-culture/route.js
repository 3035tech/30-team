import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { apiError, ERR } from '../../../../lib/api-error.js';
import { getOrganizationalCulture, getCultureSummary } from '../../../../lib/organizational-culture.js';

/**
 * GET /api/admin/organizational-culture — get organizational culture insights
 * Query param: summary=true for rollup, omit for full insights
 */

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.COMPANY_REQUIRED, 400);
    }

    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary') === 'true';

    if (summary) {
      const data = await getCultureSummary(null, { companyId });
      return NextResponse.json({ ok: true, summary: data }, { status: 200 });
    }

    const data = await getOrganizationalCulture(null, { companyId });
    return NextResponse.json({ ok: true, culture: data }, { status: 200 });
  } catch (err) {
    console.error('Failed to get organizational culture:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

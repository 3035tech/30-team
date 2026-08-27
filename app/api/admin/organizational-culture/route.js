import { NextResponse } from 'next/server';
import { requireManagerRole, getManagerScope } from '../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../lib/api-error.js';
import { getOrganizationalCulture, getCultureSummary } from '../../../../lib/organizational-culture.js';

/**
 * GET /api/admin/organizational-culture — get organizational culture insights
 * Query param: summary=true for rollup, omit for full insights
 */

export async function GET(request) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { searchParams } = new URL(request.url);
  const summary = searchParams.get('summary') === 'true';

  try {
    if (summary) {
      const data = await getCultureSummary({ companyId });
      return NextResponse.json({ ok: true, summary: data }, { status: 200 });
    } else {
      const data = await getOrganizationalCulture({ companyId });
      return NextResponse.json({ ok: true, culture: data }, { status: 200 });
    }
  } catch (err) {
    console.error('Failed to get organizational culture:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

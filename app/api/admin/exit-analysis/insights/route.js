import { NextResponse } from 'next/server';
import { requireManagerRole, getManagerScope } from '../../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../../lib/api-error.js';
import { getExitInsights } from '../../../../../lib/exit-analysis.js';

/**
 * GET /api/admin/exit-analysis/insights — get exit insights (M1/M3/M4 patterns)
 */

export async function GET(request) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const data = await getExitInsights({ companyId });
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

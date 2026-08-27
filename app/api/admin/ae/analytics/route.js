import { NextResponse } from 'next/server';
import { queryRead } from '../../../../../lib/db';
import { getAeAnalytics } from '../../../../../lib/ae/analytics';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../lib/api-error';

/** GET /api/admin/ae/analytics — dashboard RH (agregações no SQL). */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.MOTIVATORS_VIEW)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    const { isAdmin, companyId, authorized } = getManagerScope(payload);
    if (!authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const { searchParams } = new URL(request.url);
    const companyFilter = String(searchParams.get('company') || '').trim();
    const areaKey = String(searchParams.get('area') || '').trim();

    const body = await getAeAnalytics(queryRead, {
      isAdmin,
      companyId,
      companyFilter,
      areaKey,
    });

    return NextResponse.json(body);
  } catch (err) {
    console.error('GET /api/admin/ae/analytics', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

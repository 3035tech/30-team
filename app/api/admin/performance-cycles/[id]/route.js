/**
 * GET   /api/admin/performance-cycles/[id] — get cycle details
 * PATCH /api/admin/performance-cycles/[id] — update cycle
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { getPerformanceCycle, updatePerformanceCycle } from '../../../../../lib/performance-reviews.js';
import { audit } from '../../../../../lib/audit.js';

function resolveCompanyId(request, scope, bodyCompanyId) {
  if (scope.isAdmin) {
    const fromQuery = new URL(request.url).searchParams.get('companyId');
    const cid = bodyCompanyId != null
      ? Number(bodyCompanyId)
      : fromQuery != null
        ? Number(fromQuery)
        : Number(scope.companyId);
    return Number.isFinite(cid) && cid > 0 ? cid : null;
  }
  const cid = Number(scope.companyId);
  return Number.isFinite(cid) && cid > 0 ? cid : null;
}

export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = resolveCompanyId(request, scope);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const cycleId = Number(params.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const cycle = await getPerformanceCycle(null, { companyId, cycleId });
    if (!cycle) return apiError(request, 'NOT_FOUND', 404);

    return NextResponse.json(cycle);
  } catch (err) {
    console.error('GET /api/admin/performance-cycles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json();
    const companyId = resolveCompanyId(request, scope, body.companyId);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const cycleId = Number(params.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const { title, description, status, periodStart, periodEnd } = body;

    const result = await updatePerformanceCycle(null, {
      companyId,
      cycleId,
      title,
      description,
      status,
      periodStart,
      periodEnd,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_cycle_update',
      userId: payload.userId,
      companyId,
      resourceType: 'performance_cycle',
      resourceId: cycleId,
      metadata: { title: result.cycle.title, status: result.cycle.status },
    });

    return NextResponse.json(result.cycle);
  } catch (err) {
    console.error('PATCH /api/admin/performance-cycles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

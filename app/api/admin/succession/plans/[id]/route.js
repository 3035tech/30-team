/**
 * PATCH  /api/admin/succession/plans/[id] — update succession plan
 * DELETE /api/admin/succession/plans/[id] — delete succession plan
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../../lib/ae/require-admin.js';
import { updateSuccessionPlan, deleteSuccessionPlan } from '../../../../../../lib/succession-plans.js';
import { audit } from '../../../../../../lib/audit.js';

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

export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json();
    const companyId = resolveCompanyId(request, scope, body.companyId);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const planId = Number(params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const { readiness, notes, targetDate } = body;

    const result = await updateSuccessionPlan(null, {
      companyId,
      planId,
      readiness,
      notes,
      targetDate,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'succession_plan_update',
      userId: payload.userId,
      companyId,
      resourceType: 'succession_plan',
      resourceId: planId,
      metadata: { readiness: result.plan.readiness },
    });

    return NextResponse.json(result.plan);
  } catch (err) {
    console.error('PATCH /api/admin/succession/plans/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = resolveCompanyId(request, scope);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const planId = Number(params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const result = await deleteSuccessionPlan(null, { companyId, planId });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'succession_plan_delete',
      userId: payload.userId,
      companyId,
      resourceType: 'succession_plan',
      resourceId: planId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/succession/plans/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

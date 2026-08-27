/**
 * PATCH  /api/admin/succession/plans/[id] — update succession plan
 * DELETE /api/admin/succession/plans/[id] — delete succession plan
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../../lib/ae/require-admin.js';
import { updateSuccessionPlan, deleteSuccessionPlan } from '../../../../../../lib/succession-plans.js';
import { audit } from '../../../../../../lib/audit.js';

export async function PATCH(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const planId = Number(params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const body = await request.json();
    const { readiness, notes, targetDate } = body;

    const result = await updateSuccessionPlan(null, {
      companyId: company_id,
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
      userId: session.userId,
      companyId: company_id,
      resourceType: 'succession_plan',
      resourceId: planId,
      metadata: { readiness: result.plan.readiness },
    });

    return NextResponse.json(result.plan);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('PATCH /api/admin/succession/plans/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const planId = Number(params.id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const result = await deleteSuccessionPlan(null, { companyId: company_id, planId });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'succession_plan_delete',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'succession_plan',
      resourceId: planId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('DELETE /api/admin/succession/plans/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

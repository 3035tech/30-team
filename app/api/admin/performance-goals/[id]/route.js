/**
 * PATCH  /api/admin/performance-goals/[id] — update goal
 * DELETE /api/admin/performance-goals/[id] — delete goal
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { updatePerformanceGoal, deletePerformanceGoal } from '../../../../../lib/performance-reviews.js';
import { audit } from '../../../../../lib/audit.js';

export async function PATCH(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const goalId = Number(params.id);
    if (!Number.isFinite(goalId) || goalId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const body = await request.json();
    const { title, description, weight, sortOrder } = body;

    const result = await updatePerformanceGoal(null, {
      companyId: company_id,
      goalId,
      title,
      description,
      weight,
      sortOrder,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_goal_update',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'performance_goal',
      resourceId: goalId,
      metadata: { title: result.goal.title },
    });

    return NextResponse.json(result.goal);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('PATCH /api/admin/performance-goals/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const goalId = Number(params.id);
    if (!Number.isFinite(goalId) || goalId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const result = await deletePerformanceGoal(null, {
      companyId: company_id,
      goalId,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_goal_delete',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'performance_goal',
      resourceId: goalId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('DELETE /api/admin/performance-goals/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

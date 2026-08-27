/**
 * GET  /api/admin/succession/plans — list all succession plans (rollup)
 * POST /api/admin/succession/plans — create succession plan (assign successor)
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { listCompanySuccessionPlans, createSuccessionPlan } from '../../../../../lib/succession-plans.js';
import { audit } from '../../../../../lib/audit.js';

export async function GET(request) {
  try {
    const { company_id } = await requireManagerRole(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 40;

    const plans = await listCompanySuccessionPlans(null, { companyId: company_id, limit });
    return NextResponse.json({ plans });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/succession/plans error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const body = await request.json();
    const { roleId, successorId, readiness, notes, targetDate } = body;

    if (!Number.isFinite(roleId) || roleId <= 0 || !Number.isFinite(successorId) || successorId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    const result = await createSuccessionPlan(null, {
      companyId: company_id,
      roleId,
      successorId,
      readiness,
      notes,
      targetDate,
      createdByUserId: session.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'ROLE_NOT_FOUND' || result.errorCode === 'SUCCESSOR_NOT_FOUND') {
        return apiError(request, result.errorCode, 404);
      }
      if (result.errorCode === 'SUCCESSOR_ALREADY_ASSIGNED') {
        return apiError(request, result.errorCode, 409);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'succession_plan_create',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'succession_plan',
      resourceId: result.plan.id,
      metadata: { roleId, successorId, readiness: result.plan.readiness },
    });

    return NextResponse.json(result.plan, { status: 201 });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('POST /api/admin/succession/plans error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET   /api/admin/performance-cycles/[id] — get cycle details
 * PATCH /api/admin/performance-cycles/[id] — update cycle
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { getPerformanceCycle, updatePerformanceCycle } from '../../../../../lib/performance-reviews.js';
import { audit } from '../../../../../lib/audit.js';

export async function GET(request, { params }) {
  try {
    const { company_id } = await requireManagerRole(request);
    const cycleId = Number(params.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const cycle = await getPerformanceCycle(null, { companyId: company_id, cycleId });
    if (!cycle) return apiError(request, 'NOT_FOUND', 404);

    return NextResponse.json(cycle);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/performance-cycles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const cycleId = Number(params.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const body = await request.json();
    const { title, description, status, periodStart, periodEnd } = body;

    const result = await updatePerformanceCycle(null, {
      companyId: company_id,
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
      userId: session.userId,
      companyId: company_id,
      resourceType: 'performance_cycle',
      resourceId: cycleId,
      metadata: { title: result.cycle.title, status: result.cycle.status },
    });

    return NextResponse.json(result.cycle);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('PATCH /api/admin/performance-cycles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

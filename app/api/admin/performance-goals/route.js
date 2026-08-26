/**
 * GET  /api/admin/performance-goals?cycleId=X&candidateId=Y — list goals
 * POST /api/admin/performance-goals — create goal
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { listPerformanceGoals, createPerformanceGoal } from '../../../../lib/performance-reviews.js';
import { audit } from '../../../../lib/audit.js';

export async function GET(request) {
  try {
    const { company_id } = await requireManagerRole(request);
    const url = new URL(request.url);
    const cycleId = Number(url.searchParams.get('cycleId'));
    const candidateId = Number(url.searchParams.get('candidateId'));
    const limit = Number(url.searchParams.get('limit')) || 20;

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    const goals = await listPerformanceGoals(null, {
      companyId: company_id,
      cycleId,
      candidateId,
      limit,
    });

    return NextResponse.json({ goals });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/performance-goals error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const body = await request.json();
    const { cycleId, candidateId, title, description, weight, sortOrder } = body;

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    if (!title || String(title).trim().length === 0) {
      return apiError(request, 'TITLE_REQUIRED', 400);
    }

    const result = await createPerformanceGoal(null, {
      companyId: company_id,
      cycleId,
      candidateId,
      title,
      description,
      weight,
      sortOrder,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      if (result.errorCode === 'CYCLE_NOT_FOUND') {
        return apiError(request, 'CYCLE_NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_goal_create',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'performance_goal',
      resourceId: result.goal.id,
      metadata: { cycleId, candidateId, title: result.goal.title },
    });

    return NextResponse.json(result.goal, { status: 201 });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('POST /api/admin/performance-goals error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

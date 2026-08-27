/**
 * GET  /api/admin/performance-cycles — list cycles for company
 * POST /api/admin/performance-cycles — create cycle
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { listPerformanceCycles, createPerformanceCycle } from '../../../../lib/performance-reviews.js';
import { audit } from '../../../../lib/audit.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 40;

    const cycles = await listPerformanceCycles(null, { companyId, limit });
    return NextResponse.json({ cycles });
  } catch (err) {
    console.error('GET /api/admin/performance-cycles error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json();
    const companyId = scope.isAdmin
      ? Number(body.companyId || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    const { title, description, status, periodStart, periodEnd } = body;

    if (!title || String(title).trim().length === 0) {
      return apiError(request, 'TITLE_REQUIRED', 400);
    }

    const result = await createPerformanceCycle(null, {
      companyId,
      title,
      description,
      status,
      periodStart,
      periodEnd,
      createdByUserId: payload.userId,
    });

    if (!result.ok) {
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_cycle_create',
      userId: payload.userId,
      companyId,
      resourceType: 'performance_cycle',
      resourceId: result.cycle.id,
      metadata: { title: result.cycle.title, status: result.cycle.status },
    });

    return NextResponse.json(result.cycle, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/performance-cycles error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

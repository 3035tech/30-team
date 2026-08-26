/**
 * GET  /api/admin/performance-cycles — list cycles for company
 * POST /api/admin/performance-cycles — create cycle
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { listPerformanceCycles, createPerformanceCycle } from '../../../../lib/performance-reviews.js';
import { audit } from '../../../../lib/audit.js';

export async function GET(request) {
  try {
    const { company_id } = await requireManagerRole(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 40;

    const cycles = await listPerformanceCycles(null, { companyId: company_id, limit });
    return NextResponse.json({ cycles });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/performance-cycles error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const { session, company_id, is_admin } = await requireManagerRole(request);
    const body = await request.json();
    const { title, description, status, periodStart, periodEnd } = body;

    if (!title || String(title).trim().length === 0) {
      return apiError(request, 'TITLE_REQUIRED', 400);
    }

    const result = await createPerformanceCycle(null, {
      companyId: company_id,
      title,
      description,
      status,
      periodStart,
      periodEnd,
      createdByUserId: session.userId,
    });

    if (!result.ok) {
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_cycle_create',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'performance_cycle',
      resourceId: result.cycle.id,
      metadata: { title: result.cycle.title, status: result.cycle.status },
    });

    return NextResponse.json(result.cycle, { status: 201 });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('POST /api/admin/performance-cycles error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

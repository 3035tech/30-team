/**
 * GET /api/admin/performance-cycles/[id]/reviews — list reviews in a cycle
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../../lib/ae/require-admin.js';
import { listCycleReviews } from '../../../../../../lib/performance-reviews.js';

export async function GET(request, { params }) {
  try {
    const { company_id } = await requireManagerRole(request);
    const cycleId = Number(params.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 40;

    const reviews = await listCycleReviews(null, { companyId: company_id, cycleId, limit });
    return NextResponse.json({ reviews });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/performance-cycles/[id]/reviews error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

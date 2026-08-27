/**
 * POST /api/admin/performance-reviews/submit — submit review (auto-generate PDI for 'develop')
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { submitPerformanceReview } from '../../../../../lib/performance-reviews.js';
import { audit } from '../../../../../lib/audit.js';

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

    const { cycleId, candidateId } = body;

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    const { query } = await import('../../../../../lib/db.js');
    const cand = await query(
      `SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [candidateId, companyId]
    );
    if (cand.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const result = await submitPerformanceReview(null, {
      companyId,
      cycleId,
      candidateId,
      reviewerUserId: payload.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      if (result.errorCode === 'ALREADY_SUBMITTED') {
        return apiError(request, 'ALREADY_SUBMITTED', 409);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'performance_review_submit',
      userId: payload.userId,
      companyId,
      resourceType: 'performance_review',
      resourceId: result.review.id,
      metadata: { cycleId, candidateId, pdiGenerated: result.pdiGenerated },
    });

    return NextResponse.json({ review: result.review, pdiGenerated: result.pdiGenerated });
  } catch (err) {
    console.error('POST /api/admin/performance-reviews/submit error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

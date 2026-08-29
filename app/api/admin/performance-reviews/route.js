/**
 * GET  /api/admin/performance-reviews?cycleId=X&candidateId=Y — get or create review
 * POST /api/admin/performance-reviews — update review draft
 */

import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, CAP, requireCapability } from '../../../../lib/ae/require-admin.js';
import { getPerformanceReview, updatePerformanceReview, listPerformanceGoals } from '../../../../lib/performance-reviews.js';
import { listSideReviewsForCandidate } from '../../../../lib/performance-side-reviews.js';

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.PERFORMANCE_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.COMPANY_REQUIRED, 400);
    }

    const url = new URL(request.url);
    const cycleId = Number(url.searchParams.get('cycleId'));
    const candidateId = Number(url.searchParams.get('candidateId'));

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, ERR.INVALID_PARAMS, 400);
    }

    const { query } = await import('../../../../lib/db.js');
    const cand = await query(
      `SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [candidateId, companyId]
    );
    if (cand.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

    const result = await getPerformanceReview(null, {
      companyId,
      cycleId,
      candidateId,
      reviewerUserId: payload.userId,
    });

    if (!result.ok) {
      return apiError(request, result.errorCode, 400);
    }

    const goals = await listPerformanceGoals(null, {
      companyId,
      cycleId,
      candidateId,
    });

    const sideReviews = await listSideReviewsForCandidate(null, {
      companyId,
      cycleId,
      candidateId,
    });

    return NextResponse.json({ review: result.review, goals, sideReviews });
  } catch (err) {
    console.error('GET /api/admin/performance-reviews error:', err);
    return apiError(request, ERR.INTERNAL_ERROR, 500);
  }
}

export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.PERFORMANCE_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const body = await request.json();
    const companyId = scope.isAdmin
      ? Number(body.companyId || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.COMPANY_REQUIRED, 400);
    }

    const { cycleId, candidateId, outcomes, overallNotes } = body;

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, ERR.INVALID_PARAMS, 400);
    }

    const { query } = await import('../../../../lib/db.js');
    const cand = await query(
      `SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [candidateId, companyId]
    );
    if (cand.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

    const result = await updatePerformanceReview(null, {
      companyId,
      cycleId,
      candidateId,
      outcomes,
      overallNotes,
      reviewerUserId: payload.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, ERR.NOT_FOUND, 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    return NextResponse.json(result.review);
  } catch (err) {
    console.error('POST /api/admin/performance-reviews error:', err);
    return apiError(request, ERR.INTERNAL_ERROR, 500);
  }
}

/**
 * GET  /api/admin/performance-reviews?cycleId=X&candidateId=Y — get or create review
 * POST /api/admin/performance-reviews — update review draft
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { getPerformanceReview, updatePerformanceReview, listPerformanceGoals } from '../../../../lib/performance-reviews.js';

export async function GET(request) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const url = new URL(request.url);
    const cycleId = Number(url.searchParams.get('cycleId'));
    const candidateId = Number(url.searchParams.get('candidateId'));

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    // Check candidate belongs to company
    const { query } = await import('../../../../lib/db.js');
    const cand = await query(
      `SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [candidateId, company_id]
    );
    if (cand.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const result = await getPerformanceReview(null, {
      companyId: company_id,
      cycleId,
      candidateId,
      reviewerUserId: session.userId,
    });

    if (!result.ok) {
      return apiError(request, result.errorCode, 400);
    }

    // Also fetch goals for this candidate in this cycle
    const goals = await listPerformanceGoals(null, {
      companyId: company_id,
      cycleId,
      candidateId,
    });

    return NextResponse.json({ review: result.review, goals });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/performance-reviews error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const body = await request.json();
    const { cycleId, candidateId, outcomes, overallNotes } = body;

    if (!Number.isFinite(cycleId) || cycleId <= 0 || !Number.isFinite(candidateId) || candidateId <= 0) {
      return apiError(request, 'INVALID_PARAMS', 400);
    }

    // Check candidate belongs to company
    const { query } = await import('../../../../lib/db.js');
    const cand = await query(
      `SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [candidateId, company_id]
    );
    if (cand.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const result = await updatePerformanceReview(null, {
      companyId: company_id,
      cycleId,
      candidateId,
      outcomes,
      overallNotes,
      reviewerUserId: session.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    return NextResponse.json(result.review);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('POST /api/admin/performance-reviews error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

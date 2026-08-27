import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../lib/api-error.js';
import { createExitRecord, listExitRecords } from '../../../../lib/exit-analysis.js';

/**
 * GET /api/admin/exit-analysis — list exit records (admin/direction/hr)
 * POST /api/admin/exit-analysis — create exit record (admin/direction/hr)
 */

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

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 100;

    const records = await listExitRecords(null, { companyId, limit });
    return NextResponse.json({ ok: true, records }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/exit-analysis error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return apiError(request, 'INVALID_JSON', 400);
    }

    const companyId = scope.isAdmin
      ? Number(body.companyId || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    const { candidateId, exitDate, exitType, exitReason, notes } = body;
    if (!candidateId) {
      return apiError(request, 'MISSING_CANDIDATE_ID', 400);
    }

    const result = await createExitRecord(null, {
      companyId,
      candidateId: Number(candidateId),
      exitDate,
      exitType,
      exitReason,
      notes,
      createdByUserId: payload.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'CANDIDATE_NOT_FOUND') {
        return apiError(request, 'CANDIDATE_NOT_FOUND', 404);
      }
      if (result.errorCode === 'NOT_EMPLOYEE') {
        return apiError(request, 'NOT_EMPLOYEE', 400);
      }
      if (result.errorCode === 'EXIT_ALREADY_RECORDED') {
        return apiError(request, 'EXIT_ALREADY_RECORDED', 409);
      }
      return apiError(request, 'EXIT_RECORD_FAILED', 500);
    }

    return NextResponse.json({ ok: true, exitRecord: result.exitRecord }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/exit-analysis error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

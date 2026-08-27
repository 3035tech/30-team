import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, resolveScopedCompanyId, requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../../lib/api-error.js';
import { getExitRecord, updateExitRecord } from '../../../../../lib/exit-analysis.js';

/**
 * GET /api/admin/exit-analysis/[id] — get exit record by candidate_id
 * PATCH /api/admin/exit-analysis/[id] — update exit record
 */


export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = resolveScopedCompanyId(scope, new URL(request.url).searchParams.get('companyId'));
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const { id } = params;
    const candidateId = Number(id);
    if (!candidateId || candidateId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const record = await getExitRecord(null, { companyId, candidateId });
    if (!record) {
      return apiError(request, 'EXIT_RECORD_NOT_FOUND', 404);
    }

    return NextResponse.json({ ok: true, exitRecord: record }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/exit-analysis/[id] error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function PATCH(request, { params }) {
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

    const companyId = resolveScopedCompanyId(scope, body.companyId);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const { id } = params;
    const exitRecordId = Number(id);
    if (!exitRecordId || exitRecordId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const result = await updateExitRecord(null, {
      companyId,
      exitRecordId,
      exitDate: body.exitDate,
      exitType: body.exitType,
      exitReason: body.exitReason,
      notes: body.notes,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'EXIT_RECORD_NOT_FOUND', 404);
      }
      return apiError(request, 'EXIT_UPDATE_FAILED', 500);
    }

    return NextResponse.json({ ok: true, exitRecord: result.exitRecord }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/admin/exit-analysis/[id] error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

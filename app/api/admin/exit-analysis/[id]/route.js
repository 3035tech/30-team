import { NextResponse } from 'next/server';
import { requireManagerRole, getManagerScope } from '../../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../../lib/api-error.js';
import { getExitRecord, updateExitRecord } from '../../../../../lib/exit-analysis.js';

/**
 * GET /api/admin/exit-analysis/[id] — get exit record by candidate_id
 * PATCH /api/admin/exit-analysis/[id] — update exit record
 */

export async function GET(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const candidateId = Number(id);
  if (!candidateId || candidateId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  const record = await getExitRecord({ companyId, candidateId });
  if (!record) {
    return apiError(request, 'EXIT_RECORD_NOT_FOUND', 404);
  }

  return NextResponse.json({ ok: true, exitRecord: record }, { status: 200 });
}

export async function PATCH(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const exitRecordId = Number(id);
  if (!exitRecordId || exitRecordId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError(request, 'INVALID_JSON', 400);
  }

  const result = await updateExitRecord({
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
}

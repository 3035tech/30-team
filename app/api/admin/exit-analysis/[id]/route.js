import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, resolveScopedCompanyId, CAP, requireCapability } from '../../../../../lib/ae/require-admin.js';
import { apiError, apiErrorFromResult, ERR, httpStatusForError } from '../../../../../lib/api-error.js';
import { audit } from '../../../../../lib/audit.js';
import { deleteExitRecord, getExitRecord, updateExitRecord } from '../../../../../lib/exit-analysis.js';

/**
 * GET /api/admin/exit-analysis/[id] — get exit record by candidate_id
 * PATCH /api/admin/exit-analysis/[id] — update exit record by exit_records.id
 * DELETE /api/admin/exit-analysis/[id] — delete exit record by exit_records.id
 */

export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = resolveScopedCompanyId(scope, new URL(request.url).searchParams.get('companyId'));
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const { id } = params;
    const candidateId = Number(id);
    if (!candidateId || candidateId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
    }

    const record = await getExitRecord(null, { companyId, candidateId });
    if (!record) {
      return apiError(request, ERR.EXIT_RECORD_NOT_FOUND, httpStatusForError(ERR.EXIT_RECORD_NOT_FOUND));
    }

    return NextResponse.json({ ok: true, exitRecord: record }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/exit-analysis/[id] error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return apiError(request, ERR.INVALID_JSON, 400);
    }

    const companyId = resolveScopedCompanyId(scope, body.companyId);
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const { id } = params;
    const exitRecordId = Number(id);
    if (!exitRecordId || exitRecordId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
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
      return apiErrorFromResult(request, result, { fallbackCode: ERR.EXIT_UPDATE_FAILED });
    }

    await audit({
      actorUserId: payload.userId,
      action: 'exit_record.update',
      targetType: 'exit_record',
      targetId: exitRecordId,
      metadata: { companyId },
    });

    return NextResponse.json({ ok: true, exitRecord: result.exitRecord }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/admin/exit-analysis/[id] error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = resolveScopedCompanyId(
      scope,
      new URL(request.url).searchParams.get('companyId')
    );
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const { id } = params;
    const exitRecordId = Number(id);
    if (!exitRecordId || exitRecordId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
    }

    const result = await deleteExitRecord(null, { companyId, exitRecordId });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.EXIT_DELETE_FAILED });
    }

    await audit({
      actorUserId: payload.userId,
      action: 'exit_record.delete',
      targetType: 'exit_record',
      targetId: exitRecordId,
      metadata: { companyId, candidateId: result.candidateId },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/admin/exit-analysis/[id] error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

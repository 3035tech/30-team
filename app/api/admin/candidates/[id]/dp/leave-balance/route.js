import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR, httpStatusForError } from '../../../../../../../lib/api-error.js';
import {
  CAP,
  getManagerScope,
  getSessionPayload,
  requireAnyCapability,
} from '../../../../../../../lib/ae/require-admin.js';
import { upsertLeaveBalance } from '../../../../../../../lib/people/employee-dp.js';

const DP_OR_TEAM = Object.freeze([CAP.DP_VIEW, CAP.TEAM_VIEW]);

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: ERR.NOT_FOUND };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: ERR.UNAUTHORIZED };
  }
  return { candidate: c.rows[0] };
}

/** PUT /api/admin/candidates/[id]/dp/leave-balance — set entitlement + adjustment */
export async function PUT(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireAnyCapability(payload, DP_OR_TEAM)) {
      return apiError(request, ERR.UNAUTHORIZED, httpStatusForError(ERR.UNAUTHORIZED));
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) {
      return apiError(request, ERR.UNAUTHORIZED, httpStatusForError(ERR.UNAUTHORIZED));
    }

    const candidateId = params?.id;
    if (!candidateId) {
      return apiError(request, ERR.INVALID_ID, httpStatusForError(ERR.INVALID_ID));
    }
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(
        request,
        loaded.error,
        httpStatusForError(loaded.error === ERR.NOT_FOUND ? ERR.NOT_FOUND : ERR.UNAUTHORIZED)
      );
    }

    const body = await request.json().catch(() => ({}));
    const result = await upsertLeaveBalance({ query }, {
      companyId: loaded.candidate.companyId,
      candidateId,
      entitlementDays: body.entitlementDays,
      adjustmentDays: body.adjustmentDays,
      notes: body.notes,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      clearPeriod: body.clearPeriod === true,
      userId: payload.userId,
      allowAlumni: true,
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (err) {
    console.error('PUT leave-balance', err);
    return apiError(request, ERR.INTERNAL, httpStatusForError(ERR.INTERNAL));
  }
}

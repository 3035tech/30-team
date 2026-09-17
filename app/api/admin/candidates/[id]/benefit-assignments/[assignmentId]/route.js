import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../../lib/api-error.js';
import { audit } from '../../../../../../../lib/audit.js';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../../lib/ae/require-admin.js';
import {
  endEmployeeBenefitAssignment,
  updateEmployeeBenefitAssignment,
} from '../../../../../../../lib/people/employee-benefit-assignments.js';

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

/** PATCH /api/admin/candidates/[id]/benefit-assignments/[assignmentId] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const assignmentId = params?.assignmentId;
    if (!candidateId || !assignmentId) return apiError(request, ERR.INVALID_ID, 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const body = await request.json().catch(() => ({}));
    const companyId = loaded.candidate.companyId;

    if (body.end === true) {
      const ended = await endEmployeeBenefitAssignment(query, {
        companyId,
        candidateId,
        assignmentId,
        endsOn: body.endsOn,
      });
      if (!ended.ok) {
        return apiErrorFromResult(request, ended, { fallbackCode: ERR.INVALID_DATA });
      }
      await audit({
        actorUserId: payload.userId || null,
        action: 'employee_benefit.end',
        targetType: 'candidate',
        targetId: candidateId,
        metadata: { assignmentId },
      });
      return NextResponse.json({ ok: true });
    }

    const updated = await updateEmployeeBenefitAssignment(query, {
      companyId,
      candidateId,
      assignmentId,
      valueNote: body.valueNote,
    });
    if (!updated.ok) {
      return apiErrorFromResult(request, updated, { fallbackCode: ERR.INVALID_DATA });
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'employee_benefit.update',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { assignmentId },
    });

    return NextResponse.json({ ok: true, item: updated.item });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('PATCH benefit-assignment', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

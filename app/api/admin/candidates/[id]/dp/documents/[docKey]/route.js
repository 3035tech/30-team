import { NextResponse } from 'next/server';
import { query } from '../../../../../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../../../lib/api-error.js';
import {
  CAP,
  getManagerScope,
  getSessionPayload,
  requireAnyCapability,
} from '../../../../../../../../lib/ae/require-admin.js';
import { updateDpDocument } from '../../../../../../../../lib/people/employee-dp.js';

const DP_OR_TEAM = Object.freeze([CAP.DP_VIEW, CAP.TEAM_VIEW]);

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: ERR.NOT_FOUND };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: ERR.UNAUTHORIZED };
  }
  return { candidate: c.rows[0] };
}

/** PATCH /api/admin/candidates/[id]/dp/documents/[docKey] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireAnyCapability(payload, DP_OR_TEAM)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const docKey = params?.docKey;
    if (!candidateId || !docKey) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const body = await request.json().catch(() => ({}));
    const result = await updateDpDocument({ query }, {
      companyId: loaded.candidate.companyId,
      candidateId,
      docKey,
      status: body.status,
      notes: body.notes,
      userId: payload.userId,
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    return NextResponse.json({ ok: true, item: result.item });
  } catch (err) {
    console.error('PATCH dp documents', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

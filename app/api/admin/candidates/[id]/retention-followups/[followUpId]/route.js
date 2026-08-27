import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../../lib/api-error';
import { audit } from '../../../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../../lib/ae/require-admin';
import { markRetentionFollowUpReviewed } from '../../../../../../../lib/people/retention-followups';

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: 'NOT_FOUND' };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: 'UNAUTHORIZED' };
  }
  return { candidate: c.rows[0] };
}

/** PATCH /api/admin/candidates/[id]/retention-followups/[followUpId] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const followUpId = params?.followUpId;
    if (!candidateId || !followUpId) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const body = await request.json().catch(() => ({}));
    if (!body.reviewed) return apiError(request, ERR.INVALID_DATA, 400);

    const marked = await markRetentionFollowUpReviewed(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
      followUpId,
      reviewNotes: body.reviewNotes,
    });
    if (!marked.ok) return apiError(request, marked.errorCode || 'NOT_FOUND', 404);

    await audit({
      actorUserId: payload.userId || null,
      action: 'retention_followup.review',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { followUpId },
    });

    return NextResponse.json({ ok: true, followUp: marked.followUp });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('PATCH retention-followup', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

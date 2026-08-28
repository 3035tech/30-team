import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../lib/api-error';
import { audit } from '../../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import {
  createEmployeePortalToken,
  listEmployeePortalTokens,
  revokeEmployeePortalToken,
} from '../../../../../../lib/people/employee-portal';

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

/** GET /api/admin/candidates/[id]/employee-portal */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const items = await listEmployeePortalTokens(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
    });
    const prepRow = await query(
      `SELECT one_on_one_prep_at AS "preparedAt",
              one_on_one_prep_note AS "noteToManager"
       FROM candidates
       WHERE id = $1
       LIMIT 1`,
      [candidateId]
    );
    const sessionPrep = prepRow.rows[0] || null;
    const hasSessionPrep =
      sessionPrep?.preparedAt ||
      (sessionPrep?.noteToManager && String(sessionPrep.noteToManager).trim());
    return NextResponse.json({
      items,
      sessionPrep: hasSessionPrep ? sessionPrep : null,
    });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('GET employee-portal', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** POST /api/admin/candidates/[id]/employee-portal */
export async function POST(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const body = await request.json().catch(() => ({}));
    if (body.action === 'revoke') {
      const revoked = await revokeEmployeePortalToken(query, {
        companyId: loaded.candidate.companyId,
        candidateId,
        tokenId: body.tokenId,
      });
      if (!revoked.ok) return apiError(request, revoked.errorCode || 'NOT_FOUND', 404);
      return NextResponse.json({ ok: true });
    }

    const created = await createEmployeePortalToken(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
      createdByUserId: payload.userId || null,
      ttlDays: body.ttlDays,
    });
    if (!created.ok) return apiError(request, created.errorCode || 'INVALID_DATA', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'employee_portal.create',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { tokenId: created.invite?.id },
    });

    return NextResponse.json({ ok: true, invite: created.invite }, { status: 201 });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('POST employee-portal', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

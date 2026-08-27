import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../lib/api-error';
import { audit } from '../../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import {
  ensurePreOnboardingChecklist,
  listPreOnboardingItems,
  updatePreOnboardingItem,
} from '../../../../../../lib/people/pre-onboarding';

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId",
            employment_status AS "employmentStatus"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: 'NOT_FOUND' };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: 'UNAUTHORIZED' };
  }
  return { candidate: c.rows[0] };
}

/** GET /api/admin/candidates/[id]/pre-onboarding */
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

    const companyId = loaded.candidate.companyId;
    await ensurePreOnboardingChecklist(query, { companyId, candidateId });
    const items = await listPreOnboardingItems(query, { companyId, candidateId });
    return NextResponse.json({
      items,
      employmentStatus: loaded.candidate.employmentStatus,
    });
  } catch (err) {
    console.error('GET pre-onboarding', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** PATCH /api/admin/candidates/[id]/pre-onboarding */
export async function PATCH(request, { params }) {
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
    const itemId = Number(body.itemId || body.id);
    if (!Number.isFinite(itemId) || itemId <= 0) return apiError(request, ERR.INVALID_ID, 400);

    const result = await updatePreOnboardingItem(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
      itemId,
      status: body.status,
      notes: body.notes,
      completedByUserId: payload.userId || null,
    });
    if (!result.ok) {
      const code = result.errorCode || 'INVALID';
      const status = code === 'NOT_FOUND' ? 404 : 400;
      return apiError(request, code, status);
    }

    await audit({
      actorUserId: payload.userId || null,
      companyId: loaded.candidate.companyId,
      action: 'pre_onboarding.update',
      entityType: 'candidate',
      entityId: candidateId,
      meta: { itemId, status: result.item?.status, itemKey: result.item?.itemKey },
    });

    return NextResponse.json({ item: result.item });
  } catch (err) {
    console.error('PATCH pre-onboarding', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

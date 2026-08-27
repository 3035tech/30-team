import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../lib/api-error';
import { audit } from '../../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import {
  ensureOnboardingCheckins,
  listOnboardingCheckins,
  updateOnboardingCheckin,
} from '../../../../../../lib/people/onboarding-checkins';

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

/** GET /api/admin/candidates/[id]/onboarding-checkins */
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
    await ensureOnboardingCheckins(query, { companyId, candidateId });
    const items = await listOnboardingCheckins(query, { companyId, candidateId });
    return NextResponse.json({
      items,
      employmentStatus: loaded.candidate.employmentStatus,
    });
  } catch (err) {
    console.error('GET onboarding-checkins', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** PATCH /api/admin/candidates/[id]/onboarding-checkins */
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
    const checkinId = Number(body.checkinId || body.id);
    if (!Number.isFinite(checkinId) || checkinId <= 0) return apiError(request, ERR.INVALID_ID, 400);

    const locale = body.locale === 'en' ? 'en' : 'pt-BR';
    const result = await updateOnboardingCheckin(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
      checkinId,
      status: body.status,
      outcome: body.outcome,
      notes: body.notes,
      completedByUserId: payload.userId || null,
      seedPdi: Boolean(body.seedPdi),
      locale,
    });
    if (!result.ok) {
      const code = result.errorCode || 'INVALID';
      const status = code === 'NOT_FOUND' ? 404 : 400;
      return apiError(request, code, status);
    }

    await audit({
      actorUserId: payload.userId || null,
      companyId: loaded.candidate.companyId,
      action: 'onboarding_checkin.update',
      entityType: 'candidate',
      entityId: candidateId,
      meta: {
        checkinId,
        status: result.item?.status,
        outcome: result.item?.outcome,
        milestoneDays: result.item?.milestoneDays,
      },
    });

    return NextResponse.json({
      item: result.item,
      pdiItem: result.pdiItem,
    });
  } catch (err) {
    console.error('PATCH onboarding-checkins', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

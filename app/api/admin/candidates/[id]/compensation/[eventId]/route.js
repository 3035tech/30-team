import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../../lib/api-error.js';
import { audit } from '../../../../../../../lib/audit.js';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../../lib/ae/require-admin.js';
import {
  deleteCompensationEvent,
  getCompensationMarketContext,
  listCompensationEvents,
  updateCompensationEvent,
} from '../../../../../../../lib/people/employee-compensation.js';

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

/** PATCH /api/admin/candidates/[id]/compensation/[eventId] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const eventId = params?.eventId;
    if (!candidateId || !eventId) return apiError(request, ERR.INVALID_ID, 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const body = await request.json().catch(() => ({}));
    const companyId = loaded.candidate.companyId;

    const result = await updateCompensationEvent(query, {
      companyId,
      candidateId,
      eventId,
      eventType: body.eventType,
      amount: body.amount,
      effectiveDate: body.effectiveDate,
      notes: body.notes,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'compensation.update',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { eventId: result.event?.id },
    });

    const summary = await listCompensationEvents(query, { companyId, candidateId });
    const market = await getCompensationMarketContext(query, { companyId, candidateId });
    return NextResponse.json({
      ok: true,
      event: result.event,
      items: summary.ok ? summary.items : [],
      current: summary.ok ? summary.current : result.event,
      market: market.ok
        ? {
            jobRoleId: market.jobRoleId,
            jobRoleName: market.jobRoleName,
            marketSalaryMin: market.marketSalaryMin,
            marketSalaryMax: market.marketSalaryMax,
            compare: market.compare,
          }
        : null,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('PATCH compensation event', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** DELETE /api/admin/candidates/[id]/compensation/[eventId] */
export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const eventId = params?.eventId;
    if (!candidateId || !eventId) return apiError(request, ERR.INVALID_ID, 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const companyId = loaded.candidate.companyId;
    const result = await deleteCompensationEvent(query, { companyId, candidateId, eventId });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'compensation.delete',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { eventId: result.eventId },
    });

    const summary = await listCompensationEvents(query, { companyId, candidateId });
    const market = await getCompensationMarketContext(query, { companyId, candidateId });
    return NextResponse.json({
      ok: true,
      items: summary.ok ? summary.items : [],
      current: summary.ok ? summary.current : null,
      market: market.ok
        ? {
            jobRoleId: market.jobRoleId,
            jobRoleName: market.jobRoleName,
            marketSalaryMin: market.marketSalaryMin,
            marketSalaryMax: market.marketSalaryMax,
            compare: market.compare,
          }
        : null,
    });
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    }
    console.error('DELETE compensation event', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

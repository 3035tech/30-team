import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../../lib/api-error';
import { audit } from '../../../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../../lib/ae/require-admin';
import {
  addDevelopmentPlanItem,
  getDevelopmentPlan,
  updateDevelopmentPlan,
  updateDevelopmentPlanItem,
} from '../../../../../../../lib/people/development-plans';

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

/** GET /api/admin/candidates/[id]/development-plans/[planId] */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const planId = params?.planId;
    if (!candidateId || !planId) return apiError(request, ERR.INVALID_ID, 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const plan = await getDevelopmentPlan(query, {
      companyId: loaded.candidate.companyId,
      planId,
      candidateId,
    });
    if (!plan) return apiError(request, ERR.NOT_FOUND, 404);
    return NextResponse.json({ plan });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('GET development-plan', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** PATCH /api/admin/candidates/[id]/development-plans/[planId] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const planId = params?.planId;
    if (!candidateId || !planId) return apiError(request, ERR.INVALID_ID, 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const body = await request.json().catch(() => ({}));

    if (body.item && body.item.id) {
      const updItem = await updateDevelopmentPlanItem(query, {
        companyId: loaded.candidate.companyId,
        planId,
        itemId: body.item.id,
        title: body.item.title,
        notes: body.item.notes,
        status: body.item.status,
        dueDate: body.item.dueDate,
        oneOnOneId: body.item.oneOnOneId,
        ownerLabel: body.item.ownerLabel,
      });
      if (!updItem.ok) return apiError(request, updItem.errorCode || 'INVALID_DATA', 400);
      await audit({
        actorUserId: payload.userId || null,
        action: 'development_plan.item_update',
        targetType: 'candidate',
        targetId: candidateId,
        metadata: { planId, itemId: body.item.id },
      });
      const plan = await getDevelopmentPlan(query, {
        companyId: loaded.candidate.companyId,
        planId,
        candidateId,
      });
      return NextResponse.json({ ok: true, plan, item: updItem.item });
    }

    if (body.addItem) {
      const added = await addDevelopmentPlanItem(query, {
        companyId: loaded.candidate.companyId,
        planId,
        candidateId,
        title: body.addItem.title,
        notes: body.addItem.notes,
        status: body.addItem.status,
        source: body.addItem.source,
        dueDate: body.addItem.dueDate,
        oneOnOneId: body.addItem.oneOnOneId,
        ownerLabel: body.addItem.ownerLabel,
      });
      if (!added.ok) return apiError(request, added.errorCode || 'INVALID_DATA', 400);
      await audit({
        actorUserId: payload.userId || null,
        action: 'development_plan.item_add',
        targetType: 'candidate',
        targetId: candidateId,
        metadata: { planId, itemId: added.item.id },
      });
      const plan = await getDevelopmentPlan(query, {
        companyId: loaded.candidate.companyId,
        planId,
        candidateId,
      });
      return NextResponse.json({ ok: true, plan, item: added.item });
    }

    const updated = await updateDevelopmentPlan(query, {
      companyId: loaded.candidate.companyId,
      planId,
      candidateId,
      title: body.title,
      objective: body.objective,
      status: body.status,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });
    if (!updated.ok) return apiError(request, updated.errorCode || 'INVALID_DATA', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'development_plan.update',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { planId },
    });

    return NextResponse.json({ ok: true, plan: updated.plan });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('PATCH development-plan', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

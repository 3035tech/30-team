import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError } from '../../../../../../lib/api-error';
import { audit } from '../../../../../../lib/audit';
import {
  getManagerScope,
  getSessionPayload,
  requireManagerRole,
} from '../../../../../../lib/ae/require-admin';
import { deleteOneOnOne, updateOneOnOne } from '../../../../../../lib/people/one-on-ones';

async function assertOwned(oneOnOneId, scope) {
  const res = await query(
    `SELECT o.id, o.company_id AS "companyId", o.candidate_id AS "candidateId"
     FROM one_on_ones o WHERE o.id = $1 LIMIT 1`,
    [oneOnOneId]
  );
  if (res.rowCount === 0) return { error: 'NOT_FOUND' };
  if (!scope.isAdmin && String(res.rows[0].companyId) !== String(scope.companyId)) {
    return { error: 'UNAUTHORIZED' };
  }
  return { row: res.rows[0] };
}

/** PATCH /api/admin/candidates/[id]/one-on-ones/[ooId] */
export async function PATCH(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const candidateId = params?.id;
    const ooId = params?.ooId;
    if (!candidateId || !ooId) return apiError(request, 'INVALID_ID', 400);

    const owned = await assertOwned(ooId, scope);
    if (owned.error) return apiError(request, owned.error, owned.error === 'NOT_FOUND' ? 404 : 401);
    if (String(owned.row.candidateId) !== String(candidateId)) {
      return apiError(request, 'NOT_FOUND', 404);
    }

    const body = await request.json().catch(() => ({}));
    const updated = await updateOneOnOne(query, {
      id: ooId,
      companyId: scope.companyId,
      isAdmin: scope.isAdmin,
      meetingDate: body.meetingDate,
      notes: body.notes,
      nextSteps: body.nextSteps,
    });
    if (!updated.ok) {
      return apiError(request, updated.errorCode || 'INVALID_DATA', 400);
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'one_on_one.update',
      targetType: 'one_on_one',
      targetId: ooId,
      metadata: { candidateId },
    });

    return NextResponse.json({ ok: true, item: updated.item });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('PATCH one-on-one', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** DELETE /api/admin/candidates/[id]/one-on-ones/[ooId] */
export async function DELETE(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const candidateId = params?.id;
    const ooId = params?.ooId;
    if (!candidateId || !ooId) return apiError(request, 'INVALID_ID', 400);

    const owned = await assertOwned(ooId, scope);
    if (owned.error) return apiError(request, owned.error, owned.error === 'NOT_FOUND' ? 404 : 401);
    if (String(owned.row.candidateId) !== String(candidateId)) {
      return apiError(request, 'NOT_FOUND', 404);
    }

    const deleted = await deleteOneOnOne(query, {
      id: ooId,
      companyId: scope.companyId,
      isAdmin: scope.isAdmin,
    });
    if (!deleted.ok) return apiError(request, deleted.errorCode || 'INTERNAL', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'one_on_one.delete',
      targetType: 'one_on_one',
      targetId: ooId,
      metadata: { candidateId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('DELETE one-on-one', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

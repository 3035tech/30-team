import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError, ERR } from '../../../../../lib/api-error';
import { audit } from '../../../../../lib/audit';
import {
  CAP,
  getManagerScope,
  getSessionPayload,
  requireCapability,
} from '../../../../../lib/ae/require-admin';
import {
  getTeamGroup,
  softDeleteTeamGroup,
  updateTeamGroup,
} from '../../../../../lib/people/team-groups';

/** GET /api/admin/team-groups/[id] */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const id = params?.id;
    if (!id) return apiError(request, ERR.INVALID_ID, 400);

    const item = await getTeamGroup(query, {
      id,
      companyId: scope.companyId,
      isAdmin: scope.isAdmin,
    });
    if (!item) return apiError(request, ERR.NOT_FOUND, 404);
    return NextResponse.json({ item });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('GET team-group', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** PATCH /api/admin/team-groups/[id] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const id = params?.id;
    if (!id) return apiError(request, ERR.INVALID_ID, 400);

    const body = await request.json().catch(() => ({}));
    const updated = await updateTeamGroup(query, {
      id,
      companyId: scope.companyId,
      isAdmin: scope.isAdmin,
      name: body.name,
      baseAssessmentId: body.baseAssessmentId,
      memberAssessmentIds: body.memberAssessmentIds,
    });
    if (!updated.ok) {
      return apiError(
        request,
        updated.errorCode || 'INVALID_DATA',
        updated.errorCode === 'NOT_FOUND' ? 404 : 400
      );
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'team_group.update',
      targetType: 'team_group',
      targetId: String(id),
      metadata: { name: updated.item.name },
    });

    return NextResponse.json({ item: updated.item });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('PATCH team-group', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** DELETE /api/admin/team-groups/[id] — soft delete */
export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const id = params?.id;
    if (!id) return apiError(request, ERR.INVALID_ID, 400);

    const deleted = await softDeleteTeamGroup(query, {
      id,
      companyId: scope.companyId,
      isAdmin: scope.isAdmin,
    });
    if (!deleted.ok) return apiError(request, ERR.NOT_FOUND, 404);

    await audit({
      actorUserId: payload.userId || null,
      action: 'team_group.delete',
      targetType: 'team_group',
      targetId: String(id),
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('DELETE team-group', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

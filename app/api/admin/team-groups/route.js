import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, ERR } from '../../../../lib/api-error';
import { audit } from '../../../../lib/audit';
import {
  CAP,
  getManagerScope, resolveScopedCompanyId,
  getSessionPayload,
  requireCapability,
} from '../../../../lib/ae/require-admin';
import { createTeamGroup, listTeamGroups } from '../../../../lib/people/team-groups';


/** GET /api/admin/team-groups?companyId= */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = resolveScopedCompanyId(scope, new URL(request.url).searchParams.get('companyId'));
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    if (!scope.isAdmin && String(companyId) !== String(scope.companyId)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const items = await listTeamGroups(query, { companyId });
    return NextResponse.json({ items, companyId });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('GET team-groups', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** POST /api/admin/team-groups */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const body = await request.json().catch(() => ({}));
    const companyId = resolveScopedCompanyId(scope, body.companyId);
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);
    if (!scope.isAdmin && String(companyId) !== String(scope.companyId)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const created = await createTeamGroup(query, {
      companyId,
      name: body.name,
      baseAssessmentId: body.baseAssessmentId,
      memberAssessmentIds: body.memberAssessmentIds,
      createdByUserId: payload.userId || null,
    });
    if (!created.ok) {
      return apiError(request, created.errorCode || 'INVALID_DATA', 400);
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'team_group.create',
      targetType: 'team_group',
      targetId: String(created.item.id),
      metadata: { companyId, name: created.item.name },
    });

    return NextResponse.json({ item: created.item }, { status: 201 });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('POST team-groups', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';
import { audit } from '../../../../lib/audit';
import {
  CAP,
  getManagerScope,
  getSessionPayload,
  requireCapability,
} from '../../../../lib/ae/require-admin';
import { createTeamGroup, listTeamGroups } from '../../../../lib/people/team-groups';

function resolveCompanyId(scope, request, bodyCompanyId) {
  if (!scope.isAdmin && scope.companyId != null) return Number(scope.companyId);
  const url = new URL(request.url);
  const q = url.searchParams.get('companyId') || bodyCompanyId;
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** GET /api/admin/team-groups?companyId= */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = resolveCompanyId(scope, request, null);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    if (!scope.isAdmin && String(companyId) !== String(scope.companyId)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const items = await listTeamGroups(query, { companyId });
    return NextResponse.json({ items, companyId });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET team-groups', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/admin/team-groups */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json().catch(() => ({}));
    const companyId = resolveCompanyId(scope, request, body.companyId);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);
    if (!scope.isAdmin && String(companyId) !== String(scope.companyId)) {
      return apiError(request, 'UNAUTHORIZED', 401);
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
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST team-groups', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

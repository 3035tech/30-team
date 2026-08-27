/**
 * GET   /api/admin/succession/critical-roles/[id] — get role details
 * PATCH /api/admin/succession/critical-roles/[id] — update role
 * DELETE /api/admin/succession/critical-roles/[id] — deactivate role
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../../lib/ae/require-admin.js';
import { getCriticalRole, updateCriticalRole, deactivateCriticalRole } from '../../../../../../lib/succession-plans.js';
import { audit } from '../../../../../../lib/audit.js';

function resolveCompanyId(request, scope, bodyCompanyId) {
  if (scope.isAdmin) {
    const fromQuery = new URL(request.url).searchParams.get('companyId');
    const cid = bodyCompanyId != null
      ? Number(bodyCompanyId)
      : fromQuery != null
        ? Number(fromQuery)
        : Number(scope.companyId);
    return Number.isFinite(cid) && cid > 0 ? cid : null;
  }
  const cid = Number(scope.companyId);
  return Number.isFinite(cid) && cid > 0 ? cid : null;
}

export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = resolveCompanyId(request, scope);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const role = await getCriticalRole(null, { companyId, roleId });
    if (!role) return apiError(request, 'NOT_FOUND', 404);

    return NextResponse.json(role);
  } catch (err) {
    console.error('GET /api/admin/succession/critical-roles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json();
    const companyId = resolveCompanyId(request, scope, body.companyId);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const { title, description, areaKey, impactLevel, active } = body;

    const result = await updateCriticalRole(null, {
      companyId,
      roleId,
      title,
      description,
      areaKey,
      impactLevel,
      active,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'critical_role_update',
      userId: payload.userId,
      companyId,
      resourceType: 'critical_role',
      resourceId: roleId,
      metadata: { title: result.role.title },
    });

    return NextResponse.json(result.role);
  } catch (err) {
    console.error('PATCH /api/admin/succession/critical-roles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = resolveCompanyId(request, scope);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const result = await deactivateCriticalRole(null, { companyId, roleId });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'critical_role_deactivate',
      userId: payload.userId,
      companyId,
      resourceType: 'critical_role',
      resourceId: roleId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/succession/critical-roles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET   /api/admin/succession/critical-roles/[id] — get role details
 * PATCH /api/admin/succession/critical-roles/[id] — update role
 * DELETE /api/admin/succession/critical-roles/[id] — deactivate role
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../../lib/ae/require-admin.js';
import { getCriticalRole, updateCriticalRole, deactivateCriticalRole } from '../../../../../../lib/succession-plans.js';
import { audit } from '../../../../../../lib/audit.js';

export async function GET(request, { params }) {
  try {
    const { company_id } = await requireManagerRole(request);
    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const role = await getCriticalRole(null, { companyId: company_id, roleId });
    if (!role) return apiError(request, 'NOT_FOUND', 404);

    return NextResponse.json(role);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/succession/critical-roles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const body = await request.json();
    const { title, description, areaKey, impactLevel, active } = body;

    const result = await updateCriticalRole(null, {
      companyId: company_id,
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
      userId: session.userId,
      companyId: company_id,
      resourceType: 'critical_role',
      resourceId: roleId,
      metadata: { title: result.role.title },
    });

    return NextResponse.json(result.role);
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('PATCH /api/admin/succession/critical-roles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const result = await deactivateCriticalRole(null, { companyId: company_id, roleId });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, 'NOT_FOUND', 404);
      }
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'critical_role_deactivate',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'critical_role',
      resourceId: roleId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('DELETE /api/admin/succession/critical-roles/[id] error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

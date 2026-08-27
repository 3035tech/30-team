/**
 * GET  /api/admin/succession/critical-roles — list critical roles
 * POST /api/admin/succession/critical-roles — create role
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../lib/ae/require-admin.js';
import { listCriticalRoles, createCriticalRole } from '../../../../../lib/succession-plans.js';
import { audit } from '../../../../../lib/audit.js';

export async function GET(request) {
  try {
    const { company_id } = await requireManagerRole(request);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const limit = Number(url.searchParams.get('limit')) || 40;

    const roles = await listCriticalRoles(null, { companyId: company_id, includeInactive, limit });
    return NextResponse.json({ roles });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/succession/critical-roles error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const { session, company_id } = await requireManagerRole(request);
    const body = await request.json();
    const { title, description, areaKey, impactLevel } = body;

    if (!title || String(title).trim().length === 0) {
      return apiError(request, 'TITLE_REQUIRED', 400);
    }

    const result = await createCriticalRole(null, {
      companyId: company_id,
      title,
      description,
      areaKey,
      impactLevel,
      createdByUserId: session.userId,
    });

    if (!result.ok) {
      return apiError(request, result.errorCode, 400);
    }

    await audit({
      action: 'critical_role_create',
      userId: session.userId,
      companyId: company_id,
      resourceType: 'critical_role',
      resourceId: result.role.id,
      metadata: { title: result.role.title, impactLevel: result.role.impactLevel },
    });

    return NextResponse.json(result.role, { status: 201 });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('POST /api/admin/succession/critical-roles error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

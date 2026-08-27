/**
 * GET /api/admin/succession/critical-roles/[id]/successors — list successors for a role
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../../../../lib/ae/require-admin.js';
import { listSuccessors } from '../../../../../../../lib/succession-plans.js';

export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 20;

    const successors = await listSuccessors(null, { companyId, roleId, limit });
    return NextResponse.json({ successors });
  } catch (err) {
    console.error('GET /api/admin/succession/critical-roles/[id]/successors error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

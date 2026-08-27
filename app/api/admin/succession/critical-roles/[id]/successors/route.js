/**
 * GET /api/admin/succession/critical-roles/[id]/successors — list successors for a role
 */

import { NextResponse } from 'next/server';
import { apiError } from '../../../../../../../lib/api-error.js';
import { requireManagerRole } from '../../../../../../../lib/ae/require-admin.js';
import { listSuccessors } from '../../../../../../../lib/succession-plans.js';

export async function GET(request, { params }) {
  try {
    const { company_id } = await requireManagerRole(request);
    const roleId = Number(params.id);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 20;

    const successors = await listSuccessors(null, { companyId: company_id, roleId, limit });
    return NextResponse.json({ successors });
  } catch (err) {
    if (err?.name === 'UnauthorizedError') {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    console.error('GET /api/admin/succession/critical-roles/[id]/successors error:', err);
    return apiError(request, 'INTERNAL_ERROR', 500);
  }
}

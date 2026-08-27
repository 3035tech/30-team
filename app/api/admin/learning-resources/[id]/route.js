import { NextResponse } from 'next/server';
import { requireManagerRole, getManagerScope } from '../../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../../lib/api-error.js';
import {
  getLearningResource,
  updateLearningResource,
  deactivateLearningResource,
} from '../../../../../lib/learning-resources.js';

/**
 * GET /api/admin/learning-resources/[id] — get resource
 * PATCH /api/admin/learning-resources/[id] — update resource
 * DELETE /api/admin/learning-resources/[id] — deactivate resource
 */

export async function GET(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const resourceId = Number(id);
  if (!resourceId || resourceId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  const resource = await getLearningResource({ companyId, resourceId });
  if (!resource) {
    return apiError(request, 'NOT_FOUND', 404);
  }

  return NextResponse.json({ ok: true, resource }, { status: 200 });
}

export async function PATCH(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const resourceId = Number(id);
  if (!resourceId || resourceId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError(request, 'INVALID_JSON', 400);
  }

  const result = await updateLearningResource({
    companyId,
    resourceId,
    title: body.title,
    description: body.description,
    theme: body.theme,
    resourceType: body.resourceType,
    url: body.url,
    durationHours: body.durationHours,
    active: body.active,
  });

  if (!result.ok) {
    if (result.errorCode === 'NOT_FOUND') {
      return apiError(request, 'NOT_FOUND', 404);
    }
    if (result.errorCode === 'TITLE_REQUIRED') {
      return apiError(request, 'TITLE_REQUIRED', 400);
    }
    return apiError(request, 'UPDATE_FAILED', 500);
  }

  return NextResponse.json({ ok: true, resource: result.resource }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const resourceId = Number(id);
  if (!resourceId || resourceId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  const result = await deactivateLearningResource({ companyId, resourceId });
  if (!result.ok) {
    if (result.errorCode === 'NOT_FOUND') {
      return apiError(request, 'NOT_FOUND', 404);
    }
    return apiError(request, 'DELETE_FAILED', 500);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../lib/api-error.js';
import {
  listLearningResources,
  createLearningResource,
  getCompanyLearningThemes,
} from '../../../../lib/learning-resources.js';

/**
 * GET /api/admin/learning-resources — list resources (admin/direction/hr)
 * POST /api/admin/learning-resources — create resource (admin/direction/hr)
 */

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const theme = searchParams.get('theme') || null;
    const resourceType = searchParams.get('resourceType') || null;
    const themes = searchParams.get('themes') === 'true';
    const limit = Number(searchParams.get('limit')) || 100;

    if (themes) {
      const themesList = await getCompanyLearningThemes(null, { companyId });
      return NextResponse.json({ ok: true, themes: themesList }, { status: 200 });
    }

    const resources = await listLearningResources(null, { companyId, includeInactive, theme, resourceType, limit });
    return NextResponse.json({ ok: true, resources }, { status: 200 });
  } catch (err) {
    console.error('Failed to list learning resources:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return apiError(request, 'INVALID_JSON', 400);
    }

    const companyId = scope.isAdmin
      ? Number(body.companyId || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    const { title, description, theme, resourceType, url, durationHours } = body;

    const result = await createLearningResource(null, {
      companyId,
      title,
      description,
      theme,
      resourceType,
      url,
      durationHours,
      createdByUserId: payload.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'TITLE_REQUIRED') {
        return apiError(request, 'TITLE_REQUIRED', 400);
      }
      return apiError(request, 'CREATE_FAILED', 500);
    }

    return NextResponse.json({ ok: true, resource: result.resource }, { status: 201 });
  } catch (err) {
    console.error('Failed to create learning resource:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

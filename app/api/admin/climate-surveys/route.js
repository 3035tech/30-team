import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';
import { audit } from '../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../lib/ae/require-admin';
import { createClimateSurvey, getClimateCompanyBenchmark, listClimateSurveys } from '../../../../lib/people/climate-surveys';

function resolveCompanyId(scope, bodyCompanyId) {
  if (scope.isAdmin) {
    const cid = bodyCompanyId != null ? Number(bodyCompanyId) : Number(scope.companyId);
    return Number.isFinite(cid) && cid > 0 ? cid : null;
  }
  return scope.companyId;
}

/** GET /api/admin/climate-surveys */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const companyId = scope.isAdmin
      ? Number(url.searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, 'COMPANY_REQUIRED', 400);
    }

    if (url.searchParams.get('benchmark') === '1') {
      const bench = await getClimateCompanyBenchmark(query, { companyId });
      return NextResponse.json(bench);
    }

    const items = await listClimateSurveys(query, { companyId });
    return NextResponse.json({ items });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET climate-surveys', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/admin/climate-surveys */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json().catch(() => ({}));
    const companyId = resolveCompanyId(scope, body.companyId);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    const created = await createClimateSurvey(query, {
      companyId,
      title: body.title,
      description: body.description,
      status: body.status || 'draft',
      createdByUserId: payload.userId || null,
      seedDefaultQuestions: body.seedDefaultQuestions !== false,
      prompts: body.prompts,
    });
    if (!created.ok) return apiError(request, created.errorCode || 'INVALID_DATA', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'climate_survey.create',
      targetType: 'company',
      targetId: companyId,
      metadata: { surveyId: created.survey.id },
    });

    return NextResponse.json({ ok: true, survey: created.survey }, { status: 201 });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST climate-surveys', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError, ERR } from '../../../../lib/api-error';
import { audit } from '../../../../lib/audit';
import { CAP, getManagerScope, resolveScopedCompanyId, getSessionPayload, requireCapability } from '../../../../lib/ae/require-admin';
import { createClimateSurvey, getClimateCompanyBenchmark, listClimateSurveys, climateMinResponses } from '../../../../lib/people/climate-surveys';


/** GET /api/admin/climate-surveys */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const url = new URL(request.url);
    const companyId = resolveScopedCompanyId(scope, url.searchParams.get('companyId'));
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    if (url.searchParams.get('benchmark') === '1') {
      const bench = await getClimateCompanyBenchmark(query, { companyId });
      return NextResponse.json(bench);
    }

    const items = await listClimateSurveys(query, { companyId });
    return NextResponse.json({ items, minResponses: climateMinResponses() });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('GET climate-surveys', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** POST /api/admin/climate-surveys */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const body = await request.json().catch(() => ({}));
    const companyId = resolveScopedCompanyId(scope, body.companyId);
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

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
    if (err?.code === '42P01') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('POST climate-surveys', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

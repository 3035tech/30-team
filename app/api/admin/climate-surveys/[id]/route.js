import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError } from '../../../../../lib/api-error';
import { audit } from '../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../lib/ae/require-admin';
import {
  createClimateSurveyInvite,
  getClimateSurvey,
  getClimateSurveyAggregate,
  softDeleteClimateSurvey,
  updateClimateSurvey,
} from '../../../../../lib/people/climate-surveys';

async function loadScopedSurvey(surveyId, scope) {
  const res = await query(
    `SELECT id, company_id AS "companyId" FROM climate_surveys
     WHERE id = $1 AND deleted = FALSE LIMIT 1`,
    [surveyId]
  );
  if (res.rowCount === 0) return { error: 'NOT_FOUND' };
  if (!scope.isAdmin && String(res.rows[0].companyId) !== String(scope.companyId)) {
    return { error: 'UNAUTHORIZED' };
  }
  return { survey: res.rows[0] };
}

/** GET /api/admin/climate-surveys/[id] */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const surveyId = params?.id;
    if (!surveyId) return apiError(request, 'INVALID_ID', 400);

    const loaded = await loadScopedSurvey(surveyId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const url = new URL(request.url);
    if (url.searchParams.get('aggregate') === '1') {
      const agg = await getClimateSurveyAggregate(query, {
        companyId: loaded.survey.companyId,
        surveyId,
      });
      if (!agg.ok) return apiError(request, agg.errorCode || 'NOT_FOUND', 404);
      return NextResponse.json(agg);
    }

    const survey = await getClimateSurvey(query, {
      companyId: loaded.survey.companyId,
      surveyId,
    });
    if (!survey) return apiError(request, 'NOT_FOUND', 404);
    return NextResponse.json({ survey });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET climate-survey', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** PATCH /api/admin/climate-surveys/[id] */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const surveyId = params?.id;
    if (!surveyId) return apiError(request, 'INVALID_ID', 400);

    const loaded = await loadScopedSurvey(surveyId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const body = await request.json().catch(() => ({}));

    if (body.createInvite) {
      const inv = await createClimateSurveyInvite(query, {
        companyId: loaded.survey.companyId,
        surveyId,
        ttlDays: body.ttlDays,
      });
      if (!inv.ok) return apiError(request, inv.errorCode || 'INVALID_DATA', 400);
      await audit({
        actorUserId: payload.userId || null,
        action: 'climate_survey.invite',
        targetType: 'climate_survey',
        targetId: surveyId,
        metadata: { inviteId: inv.invite.id },
      });
      return NextResponse.json({ ok: true, invite: inv.invite });
    }

    const updated = await updateClimateSurvey(query, {
      companyId: loaded.survey.companyId,
      surveyId,
      title: body.title,
      description: body.description,
      status: body.status,
      opensAt: body.opensAt,
      closesAt: body.closesAt,
    });
    if (!updated.ok) return apiError(request, updated.errorCode || 'INVALID_DATA', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'climate_survey.update',
      targetType: 'climate_survey',
      targetId: surveyId,
      metadata: { status: updated.survey.status },
    });

    return NextResponse.json({ ok: true, survey: updated.survey });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('PATCH climate-survey', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** DELETE /api/admin/climate-surveys/[id] — soft delete */
export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.CLIMATE_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const surveyId = params?.id;
    if (!surveyId) return apiError(request, 'INVALID_ID', 400);

    const loaded = await loadScopedSurvey(surveyId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const del = await softDeleteClimateSurvey(query, {
      companyId: loaded.survey.companyId,
      surveyId,
    });
    if (!del.ok) return apiError(request, del.errorCode || 'NOT_FOUND', 404);

    await audit({
      actorUserId: payload.userId || null,
      action: 'climate_survey.delete',
      targetType: 'climate_survey',
      targetId: surveyId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('DELETE climate-survey', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

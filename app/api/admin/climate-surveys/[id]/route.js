import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError } from '../../../../../lib/api-error';
import { audit } from '../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../lib/ae/require-admin';
import {
  addClimateSurveyQuestion,
  createClimateSurveyInvite,
  createClimateSurveyInviteBatch,
  emailClimateSurveyInvites,
  getClimateSurvey,
  getClimateSurveyAggregate,
  softDeleteClimateSurvey,
  updateClimateSurvey,
  updateClimateSurveyQuestion,
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
    const companyId = loaded.survey.companyId;

    const body = await request.json().catch(() => ({}));

    if (body.createInvite) {
      const inv = await createClimateSurveyInvite(query, {
        companyId,
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

    if (body.createInviteBatch) {
      const batch = await createClimateSurveyInviteBatch(query, {
        companyId,
        surveyId,
        count: body.count,
        ttlDays: body.ttlDays,
      });
      if (!batch.ok) return apiError(request, batch.errorCode || 'INVALID_DATA', 400);
      await audit({
        actorUserId: payload.userId || null,
        action: 'climate_survey.invite_batch',
        targetType: 'climate_survey',
        targetId: surveyId,
        metadata: { n: batch.invites.length },
      });
      return NextResponse.json({ ok: true, invites: batch.invites });
    }

    if (body.emailInvites) {
      const origin =
        body.appOrigin ||
        process.env.NEXT_PUBLIC_APP_URL ||
        new URL(request.url).origin;
      const mailed = await emailClimateSurveyInvites(query, {
        companyId,
        surveyId,
        emails: body.emails,
        appOrigin: origin,
        locale: body.locale || payload.locale || 'pt-BR',
        ttlDays: body.ttlDays,
      });
      if (!mailed.ok) {
        const status = mailed.errorCode === 'MAIL_NOT_CONFIGURED' ? 503 : 400;
        return apiError(request, mailed.errorCode || 'INVALID_DATA', status);
      }
      await audit({
        actorUserId: payload.userId || null,
        action: 'climate_survey.invite_email',
        targetType: 'climate_survey',
        targetId: surveyId,
        metadata: { sent: mailed.sent },
      });
      return NextResponse.json({
        ok: true,
        sent: mailed.sent,
        skipped: mailed.skipped,
        invites: mailed.invites,
      });
    }

    if (body.addQuestion) {
      const added = await addClimateSurveyQuestion(query, {
        companyId,
        surveyId,
        prompt: body.addQuestion.prompt,
        sortOrder: body.addQuestion.sortOrder,
        questionKind: body.addQuestion.questionKind || body.addQuestion.kind,
      });
      if (!added.ok) return apiError(request, added.errorCode || 'INVALID_DATA', 400);
      const survey = await getClimateSurvey(query, { companyId, surveyId });
      return NextResponse.json({ ok: true, question: added.question, survey });
    }

    if (body.updateQuestion && body.updateQuestion.id) {
      const upd = await updateClimateSurveyQuestion(query, {
        companyId,
        surveyId,
        questionId: body.updateQuestion.id,
        prompt: body.updateQuestion.prompt,
        sortOrder: body.updateQuestion.sortOrder,
        active: body.updateQuestion.active,
      });
      if (!upd.ok) return apiError(request, upd.errorCode || 'INVALID_DATA', 400);
      const survey = await getClimateSurvey(query, { companyId, surveyId });
      return NextResponse.json({ ok: true, question: upd.question, survey });
    }

    const updated = await updateClimateSurvey(query, {
      companyId,
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

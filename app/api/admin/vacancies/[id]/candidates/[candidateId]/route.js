import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../../../lib/auth';
import { query } from '../../../../../../../lib/db';
import { sanitizeInterviewNotesHtml } from '../../../../../../../lib/sanitize-html';
import { apiError, ERR } from '../../../../../../../lib/api-error';
import { CAP, isAdminRole, requireCapability } from '../../../../../../../lib/permissions';
import {
  PIPELINE_STAGE,
  PIPELINE_STAGE_SET,
  normalizeRejectionReason,
  normalizeStartDate,
} from '../../../../../../../lib/pipeline';
import { markCandidateHired, maybeCloseVacancyIfFilled } from '../../../../../../../lib/hire';
import { pipelineStageToFunnelEvent, scheduleJobFunnelEvent } from '../../../../../../../lib/job-funnel';
import { notifyCompanyManagers, NOTIF } from '../../../../../../../lib/manager-notifications';


async function loadLink(request, vacancyId, candidateId, payload) {
  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return { error: apiError(request, ERR.UNAUTHORIZED, 401) };

  const r = await query(
    `SELECT vc.id, vc.vacancy_id AS "vacancyId", vc.candidate_id AS "candidateId",
            vc.company_id AS "companyId", vc.interview_notes AS "interviewNotes",
            vc.pipeline_stage AS "pipelineStage",
            c.full_name AS "fullName", c.email,
            v.status AS "vacancyStatus", v.title AS "vacancyTitle",
            co.name AS "companyName"
     FROM vacancy_candidates vc
     JOIN candidates c ON c.id = vc.candidate_id
     JOIN vacancies v ON v.id = vc.vacancy_id
     JOIN companies co ON co.id = v.company_id
     WHERE vc.vacancy_id = $1 AND vc.candidate_id = $2
       AND v.deleted = FALSE AND co.deleted = FALSE
     LIMIT 1`,
    [vacancyId, candidateId]
  );
  if (r.rowCount === 0) return { error: apiError(request, ERR.NOT_FOUND, 404) };
  if (!isAdmin && String(r.rows[0].companyId) !== String(companyId)) {
    return { error: apiError(request, ERR.UNAUTHORIZED, 401) };
  }
  return { link: r.rows[0] };
}

/** Atualiza anotações da entrevista (HTML) e/ou estágio do funil. */
export async function PATCH(request, { params }) {
  try {
    const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
    if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);

    const vacancyId = params?.id;
    const candidateId = params?.candidateId;
    if (!vacancyId || !candidateId) return apiError(request, ERR.INVALID_PARAMS, 400);

    const loaded = await loadLink(request, vacancyId, candidateId, payload);
    if (loaded.error) return loaded.error;

    const body = await request.json().catch(() => ({}));
    if (body.interviewNotes === undefined && body.notes === undefined && body.pipelineStage === undefined) {
      return apiError(request, ERR.NOTHING_TO_UPDATE, 400);
    }

    let notes = loaded.link.interviewNotes;
    if (body.interviewNotes !== undefined || body.notes !== undefined) {
      notes = sanitizeInterviewNotesHtml(body.interviewNotes ?? body.notes);
    }

    let stage = undefined;
    let rejectionReason = null;
    let startDate = null;
    if (body.pipelineStage !== undefined) {
      const s = body.pipelineStage == null ? null : String(body.pipelineStage).trim();
      if (s != null && !PIPELINE_STAGE_SET.has(s)) {
        return apiError(request, ERR.INVALID_PIPELINE_STAGE, 400);
      }
      stage = s;
      rejectionReason = normalizeRejectionReason(body.rejectionReason ?? body.reason);
      startDate = normalizeStartDate(body.startDate);
      if (stage === PIPELINE_STAGE.REJECTED && !rejectionReason) {
        return apiError(request, ERR.REJECTION_REASON_REQUIRED, 400);
      }
      if (stage === PIPELINE_STAGE.HIRED && !startDate) {
        return apiError(request, ERR.START_DATE_REQUIRED, 400);
      }
    }

    const currentStage = loaded.link.pipelineStage || null;

    const upd = await query(
      `UPDATE vacancy_candidates
       SET interview_notes = CASE WHEN $3::boolean THEN $4 ELSE interview_notes END,
           pipeline_stage = CASE WHEN $5::boolean THEN $6 ELSE pipeline_stage END,
           rejection_reason = CASE
             WHEN $5::boolean AND $6 = '${PIPELINE_STAGE.REJECTED}' THEN $7
             WHEN $5::boolean AND $6 IS DISTINCT FROM '${PIPELINE_STAGE.REJECTED}' THEN NULL
             ELSE rejection_reason
           END,
           start_date = CASE
             WHEN $5::boolean AND $6 = '${PIPELINE_STAGE.HIRED}' THEN $8::date
             ELSE start_date
           END,
           hired_at = CASE
             WHEN $5::boolean AND $6 = '${PIPELINE_STAGE.HIRED}' THEN COALESCE(hired_at, NOW())
             ELSE hired_at
           END,
           updated_at = NOW()
       WHERE vacancy_id = $1 AND candidate_id = $2
       RETURNING id, vacancy_id AS "vacancyId", candidate_id AS "candidateId",
                 interview_notes AS "interviewNotes", pipeline_stage AS "pipelineStage",
                 rejection_reason AS "rejectionReason", start_date AS "startDate",
                 hired_at AS "hiredAt", updated_at AS "updatedAt"`,
      [
        vacancyId,
        candidateId,
        body.interviewNotes !== undefined || body.notes !== undefined,
        body.interviewNotes !== undefined || body.notes !== undefined ? notes : null,
        body.pipelineStage !== undefined,
        stage ?? null,
        rejectionReason,
        startDate,
      ]
    );

    if (body.pipelineStage !== undefined && stage != null) {
      await query(
        `INSERT INTO vacancy_candidate_pipeline_history
           (vacancy_candidate_id, from_stage, to_stage, reason, start_date, changed_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          loaded.link.id,
          currentStage,
          stage,
          stage === PIPELINE_STAGE.REJECTED ? rejectionReason : null,
          stage === PIPELINE_STAGE.HIRED ? startDate : null,
          payload.userId || null,
        ]
      ).catch(() => {});

      const funnelEvent = pipelineStageToFunnelEvent(stage);
      if (funnelEvent && stage !== currentStage) {
        scheduleJobFunnelEvent({
          companyId: loaded.link.companyId,
          vacancyId: Number(vacancyId),
          eventType: funnelEvent,
          candidateId: Number(candidateId),
        });
      }
    }

    if (stage === PIPELINE_STAGE.HIRED) {
      await markCandidateHired({ candidateId, vacancyId, startDate });
      await maybeCloseVacancyIfFilled(vacancyId);
      await notifyCompanyManagers(query, {
        companyId: loaded.link.companyId,
        type: NOTIF.HIRE_ONBOARDING_KIT,
        entityType: 'candidate',
        entityId: Number(candidateId),
        dedupeKey: `hire_kit:vacancy:${vacancyId}:candidate:${candidateId}`,
        payload: {
          candidateId: Number(candidateId),
          vacancyId: Number(vacancyId),
          candidateName: loaded.link.fullName || null,
          vacancyTitle: loaded.link.vacancyTitle || null,
          startDate: startDate || null,
        },
      });
    }

    return NextResponse.json({
      ...upd.rows[0],
      fullName: loaded.link.fullName,
      email: loaded.link.email,
    });
  } catch (error) {
    console.error(error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

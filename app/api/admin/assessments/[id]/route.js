import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query, queryRead } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';
import { apiError } from '../../../../../lib/api-error';
import {
  PIPELINE_STAGE_SET,
  normalizeRejectionReason,
  normalizeStartDate,
} from '../../../../../lib/pipeline';
import { markCandidateHired, maybeCloseVacancyIfFilled } from '../../../../../lib/hire';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const id = params?.id;
    if (!id) return apiError(request, 'INVALID_ID', 400);

    const body = await request.json().catch(() => ({}));
    const stage = body.pipelineStage != null ? String(body.pipelineStage).trim() : null;
    if (stage == null || !PIPELINE_STAGE_SET.has(stage)) {
      return apiError(request, 'INVALID_PIPELINE_STAGE', 400);
    }

    const rejectionReason = normalizeRejectionReason(body.rejectionReason ?? body.reason);
    const startDate = normalizeStartDate(body.startDate);

    if (stage === 'rejected' && !rejectionReason) {
      return apiError(request, 'REJECTION_REASON_REQUIRED', 400);
    }
    if (stage === 'hired' && !startDate) {
      return apiError(request, 'START_DATE_REQUIRED', 400);
    }

    const own = await queryRead(
      `SELECT ass.id, ass.pipeline_stage AS "currentStage",
              ass.candidate_id AS "candidateId", ass.vacancy_id AS "vacancyId"
       FROM assessments ass
       WHERE ass.id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}
       LIMIT 1`,
      !isAdmin ? [id, companyId] : [id]
    );
    if (own.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);
    const currentStage = own.rows[0]?.currentStage || null;
    const candidateId = own.rows[0]?.candidateId;
    const vacancyId = own.rows[0]?.vacancyId;

    const up = await query(
      `UPDATE assessments SET
         pipeline_stage = $2,
         rejection_reason = CASE WHEN $2 = 'rejected' THEN $3 ELSE NULL END,
         start_date = CASE WHEN $2 = 'hired' THEN $4::date ELSE start_date END,
         hired_at = CASE
           WHEN $2 = 'hired' THEN COALESCE(hired_at, NOW())
           ELSE hired_at
         END
       WHERE id = $1
       RETURNING id, pipeline_stage AS "pipelineStage",
                 rejection_reason AS "rejectionReason",
                 start_date AS "startDate",
                 hired_at AS "hiredAt"`,
      [id, stage, rejectionReason, startDate]
    );

    await query(
      `INSERT INTO assessment_pipeline_history
         (assessment_id, from_stage, to_stage, reason, start_date, changed_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        currentStage,
        stage,
        stage === 'rejected' ? rejectionReason : null,
        stage === 'hired' ? startDate : null,
        payload.userId || null,
      ]
    ).catch(() => {});

    if (stage === 'hired' && candidateId) {
      await markCandidateHired({ candidateId, vacancyId, startDate });
      if (vacancyId) {
        await query(
          `UPDATE vacancy_candidates SET
             pipeline_stage = 'hired',
             start_date = COALESCE($3::date, start_date),
             hired_at = COALESCE(hired_at, NOW()),
             rejection_reason = NULL,
             updated_at = NOW()
           WHERE vacancy_id = $1 AND candidate_id = $2`,
          [vacancyId, candidateId, startDate]
        ).catch(() => {});
        await maybeCloseVacancyIfFilled(vacancyId);
      }
    }

    if (stage === 'rejected' && vacancyId && candidateId) {
      await query(
        `UPDATE vacancy_candidates SET
           pipeline_stage = 'rejected',
           rejection_reason = $3,
           updated_at = NOW()
         WHERE vacancy_id = $1 AND candidate_id = $2`,
        [vacancyId, candidateId, rejectionReason]
      ).catch(() => {});
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'assessment.pipeline_update',
      targetType: 'assessment',
      targetId: String(id),
      metadata: {
        pipelineStage: stage,
        rejectionReason: stage === 'rejected' ? rejectionReason : undefined,
        startDate: stage === 'hired' ? startDate : undefined,
      },
    });

    return NextResponse.json(up.rows[0]);
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const id = params?.id;
    if (!id) return apiError(request, 'INVALID_ID', 400);

    const row = await queryRead(
      `SELECT ass.id, ass.invite_id AS "inviteId"
       FROM assessments ass
       WHERE ass.id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}
       LIMIT 1`,
      !isAdmin ? [id, companyId] : [id]
    );
    if (row.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const inviteId = row.rows[0]?.inviteId;

    await query(`DELETE FROM assessments WHERE id = $1`, [id]);

    if (inviteId != null) {
      await query(
        `UPDATE candidate_invites SET status = 'opened', completed_at = NULL WHERE id = $1`,
        [inviteId]
      );
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'assessment.delete_retake',
      targetType: 'assessment',
      targetId: String(id),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}

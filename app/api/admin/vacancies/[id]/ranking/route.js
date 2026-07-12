import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { queryRead } from '../../../../../../lib/db';
import { computeAreaScore010 } from '../../../../../../lib/area-fit';
import { apiError } from '../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const own = await queryRead(
      `SELECT v.id, v.company_id AS "companyId"
       FROM vacancies v
       WHERE v.id = $1 AND v.deleted = FALSE ${!isAdmin ? 'AND v.company_id = $2' : ''}
       LIMIT 1`,
      !isAdmin ? [vacancyId, companyId] : [vacancyId]
    );
    if (own.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const rub = await queryRead(
      `SELECT desired_type_weights AS weights FROM vacancy_rubrics WHERE vacancy_id = $1 LIMIT 1`,
      [vacancyId]
    );
    const weights = rub.rows?.[0]?.weights && Object.keys(rub.rows[0].weights).length ? rub.rows[0].weights : {};

    const rows = await queryRead(
      `SELECT * FROM (
         SELECT
           ass.id AS "assessmentId",
           vc.id AS "vacancyCandidateId",
           c.id AS "candidateId",
           c.full_name AS "name",
           c.email AS "email",
           ass.top_type AS "topType",
           ass.scores,
           ass.pipeline_stage AS "pipelineStage",
           ass.rejection_reason AS "rejectionReason",
           ass.start_date AS "startDate",
           ass.created_at AS "createdAt",
           FALSE AS "pendingTest",
           inv.status AS "inviteStatus",
           inv.sent_at AS "inviteSentAt",
           CASE
             WHEN vc.interview_notes IS NULL THEN FALSE
             WHEN TRIM(regexp_replace(vc.interview_notes, '<[^>]*>', '', 'g')) = '' THEN FALSE
             ELSE TRUE
           END AS "hasNotes"
         FROM assessments ass
         JOIN candidates c ON c.id = ass.candidate_id
         LEFT JOIN vacancy_candidates vc
           ON vc.vacancy_id = ass.vacancy_id AND vc.candidate_id = ass.candidate_id
         LEFT JOIN LATERAL (
           SELECT ci.status, ci.sent_at
           FROM candidate_invites ci
           WHERE ci.vacancy_id = ass.vacancy_id
             AND ci.status <> 'cancelled'
             AND (
               ci.candidate_id = ass.candidate_id
               OR (c.email IS NOT NULL AND LOWER(ci.candidate_email) = LOWER(c.email))
             )
           ORDER BY ci.sent_at DESC NULLS LAST, ci.id DESC
           LIMIT 1
         ) inv ON TRUE
         WHERE ass.vacancy_id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}

         UNION ALL

         SELECT
           NULL::bigint AS "assessmentId",
           vc.id AS "vacancyCandidateId",
           c.id AS "candidateId",
           c.full_name AS "name",
           c.email AS "email",
           NULL::integer AS "topType",
           NULL::jsonb AS scores,
           COALESCE(vc.pipeline_stage, 'new') AS "pipelineStage",
           vc.rejection_reason AS "rejectionReason",
           vc.start_date AS "startDate",
           vc.created_at AS "createdAt",
           TRUE AS "pendingTest",
           inv.status AS "inviteStatus",
           inv.sent_at AS "inviteSentAt",
           CASE
             WHEN vc.interview_notes IS NULL THEN FALSE
             WHEN TRIM(regexp_replace(vc.interview_notes, '<[^>]*>', '', 'g')) = '' THEN FALSE
             ELSE TRUE
           END AS "hasNotes"
         FROM vacancy_candidates vc
         JOIN candidates c ON c.id = vc.candidate_id
         LEFT JOIN LATERAL (
           SELECT ci.status, ci.sent_at
           FROM candidate_invites ci
           WHERE ci.vacancy_id = vc.vacancy_id
             AND ci.status <> 'cancelled'
             AND (
               ci.candidate_id = vc.candidate_id
               OR (c.email IS NOT NULL AND LOWER(ci.candidate_email) = LOWER(c.email))
             )
           ORDER BY ci.sent_at DESC NULLS LAST, ci.id DESC
           LIMIT 1
         ) inv ON TRUE
         WHERE vc.vacancy_id = $1
           AND (
             vc.pipeline_stage IS NOT NULL
             OR inv.status IS NOT NULL
           )
           ${!isAdmin ? 'AND vc.company_id = $2' : ''}
           AND NOT EXISTS (
             SELECT 1 FROM assessments a
             WHERE a.vacancy_id = vc.vacancy_id AND a.candidate_id = vc.candidate_id
           )
       ) ranking
       ORDER BY "createdAt" DESC
       LIMIT 500`,
      !isAdmin ? [vacancyId, companyId] : [vacancyId]
    );

    const ranked = rows.rows.map((r) => {
      const fit = computeAreaScore010(r.scores, weights);
      return {
        ...r,
        vacancyFitScore010: fit.score010,
        vacancyFitLabel: fit.label,
      };
    });

    ranked.sort((a, b) => {
      const av = a.vacancyFitScore010;
      const bv = b.vacancyFitScore010;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });

    return NextResponse.json({ vacancyId: Number(vacancyId), ranking: ranked });
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}

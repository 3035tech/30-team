import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/db';
import { upsertCandidatePreInterview } from '../../../../../../lib/ae/candidate-upsert';
import { sanitizeInterviewNotesHtml } from '../../../../../../lib/sanitize-html';
import { apiError } from '../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadVacancyForActor(request, vacancyId, payload) {
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return { error: apiError(request, 'UNAUTHORIZED', 401) };

  if (!isAdmin) {
    const owned = await query(
      `SELECT v.id, v.company_id AS "companyId", v.title, v.status
       FROM vacancies v
       JOIN companies c ON c.id = v.company_id
       WHERE v.id = $1 AND v.company_id = $2 AND v.deleted = FALSE AND c.deleted = FALSE
       LIMIT 1`,
      [vacancyId, companyId]
    );
    if (owned.rowCount === 0) return { error: apiError(request, 'UNAUTHORIZED', 401) };
    return { vacancy: owned.rows[0], isAdmin };
  }

  const exists = await query(
    `SELECT v.id, v.company_id AS "companyId", v.title, v.status
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     WHERE v.id = $1 AND v.deleted = FALSE AND c.deleted = FALSE
     LIMIT 1`,
    [vacancyId]
  );
  if (exists.rowCount === 0) return { error: apiError(request, 'VACANCY_NOT_FOUND', 404) };
  return { vacancy: exists.rows[0], isAdmin };
}

/** Lista candidatos pré-cadastrados na vaga + status do último convite eneagrama. */
export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const loaded = await loadVacancyForActor(request, vacancyId, payload);
    if (loaded.error) return loaded.error;

    const rows = await query(
      `SELECT
         vc.id,
         vc.vacancy_id AS "vacancyId",
         vc.candidate_id AS "candidateId",
         vc.interview_notes AS "interviewNotes",
         vc.created_at AS "createdAt",
         vc.updated_at AS "updatedAt",
         c.full_name AS "fullName",
         c.email,
         inv.id AS "inviteId",
         inv.status AS "inviteStatus",
         inv.sent_at AS "inviteSentAt",
         inv.opened_at AS "inviteOpenedAt",
         inv.completed_at AS "inviteCompletedAt",
         ass.id AS "assessmentId",
         ass.pipeline_stage AS "pipelineStage",
         ass.top_type AS "topType"
       FROM vacancy_candidates vc
       JOIN candidates c ON c.id = vc.candidate_id
       LEFT JOIN LATERAL (
         SELECT ci.id, ci.status, ci.sent_at, ci.opened_at, ci.completed_at
         FROM candidate_invites ci
         WHERE ci.vacancy_id = vc.vacancy_id
           AND (
             ci.candidate_id = vc.candidate_id
             OR (c.email IS NOT NULL AND LOWER(ci.candidate_email) = LOWER(c.email))
           )
           AND ci.status <> 'cancelled'
         ORDER BY ci.sent_at DESC NULLS LAST, ci.id DESC
         LIMIT 1
       ) inv ON TRUE
       LEFT JOIN LATERAL (
         SELECT a.id, a.pipeline_stage, a.top_type
         FROM assessments a
         WHERE a.candidate_id = vc.candidate_id AND a.vacancy_id = vc.vacancy_id
         ORDER BY a.created_at DESC
         LIMIT 1
       ) ass ON TRUE
       WHERE vc.vacancy_id = $1
       ORDER BY vc.created_at DESC`,
      [vacancyId]
    );

    return NextResponse.json({ items: rows.rows });
  } catch (error) {
    console.error(error);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** Cadastra candidato (nome+email) na vaga após a entrevista. */
export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const loaded = await loadVacancyForActor(request, vacancyId, payload);
    if (loaded.error) return loaded.error;
    const { vacancy } = loaded;

    const body = await request.json().catch(() => ({}));
    const fullName = String(body.fullName || body.name || body.candidateName || '').trim();
    const email = String(body.email || body.candidateEmail || '').trim().toLowerCase();
    const notes = sanitizeInterviewNotesHtml(body.interviewNotes ?? body.notes ?? null);

    if (!fullName || fullName.length > 200) {
      return apiError(request, 'CANDIDATE_NAME_REQUIRED', 400);
    }
    if (!email || !EMAIL_RE.test(email)) {
      return apiError(request, 'INVALID_CANDIDATE_EMAIL', 400);
    }

    const up = await upsertCandidatePreInterview({
      companyId: vacancy.companyId,
      fullName,
      email,
    });
    if (!up.ok) return apiError(request, up.errorCode || 'INTERNAL', 400);

    const createdBy = payload?.userId != null ? Number(payload.userId) : null;
    const createdBySql = Number.isFinite(createdBy) ? createdBy : null;

    const link = await query(
      `INSERT INTO vacancy_candidates (
         vacancy_id, candidate_id, company_id, interview_notes, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (vacancy_id, candidate_id)
       DO UPDATE SET
         interview_notes = COALESCE(EXCLUDED.interview_notes, vacancy_candidates.interview_notes),
         updated_at = NOW()
       RETURNING id, vacancy_id AS "vacancyId", candidate_id AS "candidateId",
                 interview_notes AS "interviewNotes", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [vacancy.id, up.candidateId, vacancy.companyId, notes, createdBySql]
    );

    return NextResponse.json(
      {
        ...link.rows[0],
        fullName: up.fullName,
        email: up.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return apiError(request, 'INTERNAL', 500);
  }
}

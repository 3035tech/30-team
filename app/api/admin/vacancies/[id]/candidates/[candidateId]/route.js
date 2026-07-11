import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../../lib/auth';
import { query } from '../../../../../../../lib/db';
import { sanitizeInterviewNotesHtml } from '../../../../../../../lib/sanitize-html';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

async function loadLink(vacancyId, candidateId, payload) {
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };

  const r = await query(
    `SELECT vc.id, vc.vacancy_id AS "vacancyId", vc.candidate_id AS "candidateId",
            vc.company_id AS "companyId", vc.interview_notes AS "interviewNotes",
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
  if (r.rowCount === 0) return { error: NextResponse.json({ error: 'Não encontrado' }, { status: 404 }) };
  if (!isAdmin && String(r.rows[0].companyId) !== String(companyId)) {
    return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }
  return { link: r.rows[0] };
}

/** Atualiza anotações da entrevista (HTML). */
export async function PATCH(request, { params }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const payload = token ? verifyToken(token) : null;
    if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const vacancyId = params?.id;
    const candidateId = params?.candidateId;
    if (!vacancyId || !candidateId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

    const loaded = await loadLink(vacancyId, candidateId, payload);
    if (loaded.error) return loaded.error;

    const body = await request.json().catch(() => ({}));
    if (body.interviewNotes === undefined && body.notes === undefined && body.pipelineStage === undefined) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    const PIPELINE = new Set([
      'new',
      'test_completed',
      'screening',
      'interview',
      'approved',
      'rejected',
      'archived',
    ]);

    let notes = loaded.link.interviewNotes;
    if (body.interviewNotes !== undefined || body.notes !== undefined) {
      notes = sanitizeInterviewNotesHtml(body.interviewNotes ?? body.notes);
    }

    let stage = undefined;
    if (body.pipelineStage !== undefined) {
      const s = body.pipelineStage == null ? null : String(body.pipelineStage).trim();
      if (s != null && !PIPELINE.has(s)) {
        return NextResponse.json({ error: 'pipelineStage inválido' }, { status: 400 });
      }
      stage = s;
    }

    const upd = await query(
      `UPDATE vacancy_candidates
       SET interview_notes = CASE WHEN $3::boolean THEN $4 ELSE interview_notes END,
           pipeline_stage = CASE WHEN $5::boolean THEN $6 ELSE pipeline_stage END,
           updated_at = NOW()
       WHERE vacancy_id = $1 AND candidate_id = $2
       RETURNING id, vacancy_id AS "vacancyId", candidate_id AS "candidateId",
                 interview_notes AS "interviewNotes", pipeline_stage AS "pipelineStage",
                 updated_at AS "updatedAt"`,
      [
        vacancyId,
        candidateId,
        body.interviewNotes !== undefined || body.notes !== undefined,
        body.interviewNotes !== undefined || body.notes !== undefined ? notes : null,
        body.pipelineStage !== undefined,
        stage ?? null,
      ]
    );

    return NextResponse.json({
      ...upd.rows[0],
      fullName: loaded.link.fullName,
      email: loaded.link.email,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

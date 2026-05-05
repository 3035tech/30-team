import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { queryRead } from '../../../../../../lib/db';
import { computeAreaScore010 } from '../../../../../../lib/area-fit';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function GET(_request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const vacancyId = params?.id;
    if (!vacancyId) return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 });

    const own = await queryRead(
      `SELECT v.id, v.company_id AS "companyId"
       FROM vacancies v
       WHERE v.id = $1 AND v.deleted = FALSE ${!isAdmin ? 'AND v.company_id = $2' : ''}
       LIMIT 1`,
      !isAdmin ? [vacancyId, companyId] : [vacancyId]
    );
    if (own.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const rub = await queryRead(
      `SELECT desired_type_weights AS weights FROM vacancy_rubrics WHERE vacancy_id = $1 LIMIT 1`,
      [vacancyId]
    );
    const weights = rub.rows?.[0]?.weights && Object.keys(rub.rows[0].weights).length ? rub.rows[0].weights : {};

    const rows = await queryRead(
      `SELECT
         ass.id AS "assessmentId",
         c.full_name AS "name",
         c.email AS "email",
         ass.top_type AS "topType",
         ass.scores,
         ass.pipeline_stage AS "pipelineStage",
         ass.created_at AS "createdAt"
       FROM assessments ass
       JOIN candidates c ON c.id = ass.candidate_id
       WHERE ass.vacancy_id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}
       ORDER BY ass.created_at DESC
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
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { assessmentListWhereParts, sqlWhere } from '../../../../lib/assessment-filters';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

const BASE_JOIN = `
FROM assessments ass
JOIN candidates c ON c.id = ass.candidate_id
JOIN areas ar ON ar.id = ass.area_id
LEFT JOIN vacancies v ON v.id = ass.vacancy_id
`;

/**
 * Lista completa de assessments (filtros iguais ao dashboard) para a aba Comparativo.
 */
export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const url = new URL(request.url);
  const selectedArea = (url.searchParams.get('area') || 'all').toString();
  const selectedVacancy = (url.searchParams.get('vacancy') || 'all').toString();
  const rawCompany = (url.searchParams.get('company') || 'all').toString();
  let scopeCompanyFilter = null;
  if (isAdmin && rawCompany !== 'all') {
    const cid = parseInt(rawCompany, 10);
    if (Number.isFinite(cid)) {
      const ok = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [cid]);
      if (ok.rowCount > 0) scopeCompanyFilter = cid;
    }
  }

  const enneRaw = String(url.searchParams.get('enneagram') || '').trim();
  const enneagram = /^[1-9]$/.test(enneRaw) ? enneRaw : 'all';

  const { whereParts, params } = assessmentListWhereParts({
    isAdmin,
    companyId,
    scopeCompanyFilter,
    selectedArea,
    selectedVacancy,
    enneagram,
  });
  const where = sqlWhere(whereParts);

  const result = await query(
    `SELECT
       ass.id AS "assessmentId",
       c.id AS "candidateId",
       c.full_name AS name,
       ar.key AS "areaKey",
       ar.label AS "areaLabel",
       ass.vacancy_id AS "vacancyId",
       v.title AS "vacancyTitle",
       ass.top_type AS "topType",
       ass.scores,
       ass.created_at AS "createdAt"
     ${BASE_JOIN}
     ${where}
     ORDER BY ass.created_at DESC, ass.id DESC`,
    params
  );

  return NextResponse.json({ rows: result.rows });
}

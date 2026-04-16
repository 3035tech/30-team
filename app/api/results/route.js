import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { verifyToken, COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';
import { computeAreaScore010 } from '../../../lib/area-fit';

function normalizeEmail(email) {
  const e = (email || '').trim();
  return e.length ? e.toLowerCase() : null;
}

// POST /api/results — salva resultado de um candidato (com área)
export async function POST(request) {
  try {
    const { name, email, areaKey, consent, topType, scores, companyToken, vacancyToken } = await request.json();

    if ((!companyToken && !vacancyToken) || !name || !areaKey || !topType || !scores || consent !== true) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    let companyId = null;
    let resolvedVacancyId = null;

    if (vacancyToken) {
      const token = String(vacancyToken || '').trim();
      const link = await query(
        `SELECT v.id AS "vacancyId", v.company_id AS "companyId", v.status
         FROM vacancy_links l
         JOIN vacancies v ON v.id = l.vacancy_id
         JOIN companies c ON c.id = v.company_id
         WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
           AND v.deleted = FALSE AND c.deleted = FALSE
         LIMIT 1`,
        [token]
      );
      if (link.rowCount === 0) {
        return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 });
      }
      if (String(link.rows[0].status || '') === 'closed') {
        return NextResponse.json({ error: 'Essa vaga não está mais aberta' }, { status: 403 });
      }
      companyId = link.rows[0].companyId;
      resolvedVacancyId = link.rows[0].vacancyId;
    } else {
      const token = String(companyToken || '').trim();
      const link = await query(
        `SELECT l.company_id AS "companyId"
         FROM company_links l
         JOIN companies c ON c.id = l.company_id
         WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
           AND c.deleted = FALSE
         LIMIT 1`,
        [token]
      );
      if (link.rowCount === 0) {
        return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 });
      }
      companyId = link.rows[0].companyId;
    }

    const safeName = name.trim();
    const safeEmail = normalizeEmail(email);

    const areaRes = await query(`SELECT id FROM areas WHERE key = $1 LIMIT 1`, [areaKey]);
    if (areaRes.rowCount === 0) {
      return NextResponse.json({ error: 'Área inválida' }, { status: 400 });
    }
    const areaId = areaRes.rows[0].id;

    // Candidate upsert (prefer email; otherwise best-effort by name)
    let candidateId = null;
    if (safeEmail) {
      const up = await query(
        `INSERT INTO candidates (company_id, full_name, email, consent_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (company_id, LOWER(email)) WHERE email IS NOT NULL
         DO UPDATE SET full_name = EXCLUDED.full_name, consent_at = NOW()
         RETURNING id`,
        [companyId, safeName, safeEmail]
      );
      candidateId = up.rows[0].id;
    } else {
      const existing = await query(
        `SELECT id
         FROM candidates
         WHERE company_id = $1 AND LOWER(full_name) = LOWER($2) AND (email IS NULL OR email = '')
         ORDER BY created_at DESC
         LIMIT 1`,
        [companyId, safeName]
      );
      if (existing.rowCount > 0) {
        candidateId = existing.rows[0].id;
      } else {
        const ins = await query(
          `INSERT INTO candidates (company_id, full_name, consent_at) VALUES ($1, $2, NOW()) RETURNING id`,
          [companyId, safeName]
        );
        candidateId = ins.rows[0].id;
      }
    }

    const assessment = resolvedVacancyId
      ? await query(
          `INSERT INTO assessments (candidate_id, company_id, area_id, top_type, scores, vacancy_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, created_at AS "createdAt"`,
          [candidateId, companyId, areaId, topType, JSON.stringify(scores), resolvedVacancyId]
        )
      : await query(
          `INSERT INTO assessments (candidate_id, company_id, area_id, top_type, scores)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, created_at AS "createdAt"`,
          [candidateId, companyId, areaId, topType, JSON.stringify(scores)]
        );

    const rub = await query(
      `SELECT r.desired_type_weights AS weights
       FROM area_rubrics r
       WHERE r.area_id = $1
       LIMIT 1`,
      [areaId]
    );
    const weights = rub.rows?.[0]?.weights || {};
    const fit = computeAreaScore010(scores, weights);

    // Backward compatible write (legacy dashboards/scripts)
    await query(
      `INSERT INTO results (name, top_type, scores)
       VALUES ($1, $2, $3)
       ON CONFLICT (LOWER(name))
       DO UPDATE SET top_type = $2, scores = $3, created_at = NOW()`,
      [safeName, topType, JSON.stringify(scores)]
    );

    return NextResponse.json(
      { ok: true, candidateId, assessmentId: assessment.rows[0].id, createdAt: assessment.rows[0].createdAt, areaFitScore010: fit.score010, areaFitLabel: fit.label, vacancyId: resolvedVacancyId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao salvar resultado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET /api/results — retorna todos os resultados (apenas admin autenticado)
export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload?.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const result = await query(
      `SELECT id, name, top_type AS "topType", scores, created_at AS "createdAt"
       FROM results
       ORDER BY created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

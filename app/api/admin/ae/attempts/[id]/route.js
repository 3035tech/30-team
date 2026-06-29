import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { getManagerScope, getSessionPayload, requireManagerRole } from '../../../../../../lib/ae/require-admin';

/** GET /api/admin/ae/attempts/[id] — detalhe + histórico do colaborador */
export async function GET(_request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const sqlParams = [params.id];
    let companyScope = '';
    if (!scope.isAdmin) {
      companyScope = 'AND a.company_id = $2';
      sqlParams.push(scope.companyId);
    }

    const res = await query(
      `SELECT a.id, a.status, a.started_at AS "startedAt", a.completed_at AS "completedAt",
              a.dimension_scores AS "dimensionScores", a.ranking, a.profile_summary AS "profileSummary",
              a.manager_recommendations AS "managerRecommendations",
              c.id AS "candidateId", c.full_name AS "candidateName", c.email AS "candidateEmail",
              ar.label AS "areaLabel", co.name AS "companyName"
       FROM ae_attempts a
       JOIN candidates c ON c.id = a.candidate_id
       JOIN companies co ON co.id = a.company_id
       LEFT JOIN areas ar ON ar.id = a.area_id
       WHERE a.id = $1 ${companyScope}
       LIMIT 1`,
      sqlParams
    );
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Resultado não encontrado.' }, { status: 404 });
    }
    const attempt = res.rows[0];

    const hist = await query(
      `SELECT a.id, a.completed_at AS "completedAt", a.dimension_scores AS "dimensionScores", a.ranking
       FROM ae_attempts a
       WHERE a.candidate_id = $1 AND a.company_id = (
         SELECT company_id FROM ae_attempts WHERE id = $2
       ) AND a.status = 'completed'
       ORDER BY a.completed_at ASC`,
      [attempt.candidateId, params.id]
    );

    const dimRes = await query(
      `SELECT d.key, d.label, d.color FROM ae_dimensions d
       JOIN ae_attempts a ON a.definition_id = d.definition_id
       WHERE a.id = $1 AND d.active = TRUE ORDER BY d.sort_order`,
      [params.id]
    );

    const rankingWithLabels = (attempt.ranking || []).map((key) => {
      const meta = dimRes.rows.find((d) => d.key === key);
      return {
        key,
        label: meta?.label || key,
        color: meta?.color || '#7C3AED',
        score: attempt.dimensionScores?.[key] ?? 0,
      };
    });

    return NextResponse.json({
      attempt: { ...attempt, ranking: rankingWithLabels },
      history: hist.rows,
      dimensions: dimRes.rows,
    });
  } catch (err) {
    console.error('GET /api/admin/ae/attempts/[id]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

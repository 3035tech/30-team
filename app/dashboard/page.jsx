import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '../../lib/auth';
import { query } from '../../lib/db';
import DashboardClient from './DashboardClient';
import { computeAreaScore010 } from '../../lib/area-fit';
import {
  buildAreaSummaries,
  globalTopTypeCounts,
  rubricAlignmentShare,
} from '../../lib/leadership-analytics';

function toNum(x) {
  const n = typeof x === 'number' ? x : parseFloat(x);
  return Number.isFinite(n) ? n : 0;
}

function computeStatsFromScores(rows) {
  const sums = {}; const sums2 = {}; const counts = {};
  for (let t = 1; t <= 9; t++) { sums[t] = 0; sums2[t] = 0; counts[t] = 0; }
  for (const r of rows) {
    const s = r.scores || {};
    for (let t = 1; t <= 9; t++) {
      const v = toNum(s[t] ?? s[String(t)] ?? 0);
      sums[t] += v;
      sums2[t] += v * v;
      counts[t] += 1;
    }
  }
  const means = {}; const stds = {};
  const n = rows.length;
  for (let t = 1; t <= 9; t++) {
    const c = Math.max(counts[t], 1);
    const mean = sums[t] / c;
    const variance = Math.max(0, (sums2[t] / c) - mean * mean);
    const std = Math.sqrt(variance) || 1;
    means[t] = mean;
    stds[t] = std;
  }
  return { n, means, stds };
}

function fitForCandidate(scores, stats, weights) {
  if (!stats) return { fitScore: null, fitLabel: null };
  const w = weights && Object.keys(weights).length ? weights : null;
  let score = 0;
  let wsum = 0;
  for (let t = 1; t <= 9; t++) {
    const v = toNum(scores?.[t] ?? scores?.[String(t)] ?? 0);
    const z = (v - toNum(stats.means?.[t])) / Math.max(toNum(stats.stds?.[t]), 1e-6);
    const wt = w ? toNum(w[String(t)] ?? w[t] ?? 0) : (t === 0 ? 0 : 0);
    if (w) {
      score += wt * z;
      wsum += Math.abs(wt);
    }
  }
  if (!w) return { fitScore: null, fitLabel: null };
  const norm = wsum ? score / wsum : score;
  const label = norm >= 0.75 ? 'Alto' : norm >= 0.25 ? 'Médio' : 'Baixo';
  return { fitScore: norm, fitLabel: label };
}

// Server Component — roda no servidor, acessa o banco diretamente
export default async function DashboardPage({ searchParams }) {
  // Verifica autenticação (middleware já protege, mas validamos novamente)
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  const allowed = payload?.role === 'admin' || payload?.role === 'direction' || payload?.role === 'hr';
  if (!allowed) redirect('/login');
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) redirect('/login');

  const selectedArea = (searchParams?.area || 'all').toString();
  const selectedVacancy = (searchParams?.vacancy || 'all').toString();

  // Busca candidatos/resultados DIRETAMENTE no banco — sem API, sem fetch
  let results = [];
  let areas = [];
  let counts = [];
  let vacancies = [];
  let areaStats = null;
  let areaRubric = null;
  let rubricByAreaKey = {};
  let analytics = null;
  try {
    const a = await query(`SELECT key, label FROM areas ORDER BY label ASC`);
    areas = a.rows;

    const vWhere = isAdmin ? '' : 'WHERE company_id = $1';
    const vParams = isAdmin ? [] : [companyId];
    const v = await query(
      `SELECT id, title, status, created_at AS "createdAt"
       FROM vacancies
       ${vWhere}
       ORDER BY created_at DESC`,
      vParams
    );
    vacancies = v.rows;

    const cWhere = isAdmin ? '' : 'WHERE ass.company_id = $1';
    const cParams = isAdmin ? [] : [companyId];
    const c = await query(
      `SELECT ar.key, ar.label, COUNT(*)::int AS count
       FROM assessments ass
       JOIN areas ar ON ar.id = ass.area_id
       ${cWhere}
       GROUP BY ar.key, ar.label
       ORDER BY ar.label ASC`,
      cParams
    );
    counts = c.rows;

    const whereParts = [];
    const params = [];
    if (!isAdmin) {
      params.push(companyId);
      whereParts.push(`ass.company_id = $${params.length}`);
    }
    if (selectedArea !== 'all') {
      params.push(selectedArea);
      whereParts.push(`ar.key = $${params.length}`);
    }
    if (selectedVacancy !== 'all') {
      params.push(selectedVacancy);
      whereParts.push(`ass.vacancy_id = $${params.length}`);
    }
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    if (selectedArea !== 'all') {
      const areaRow = await query(`SELECT id FROM areas WHERE key = $1 LIMIT 1`, [selectedArea]);
      const areaId = areaRow.rows?.[0]?.id;
      if (areaId) {
        const statsRow = await query(`SELECT type_means AS "means", type_stds AS "stds", n FROM area_stats WHERE area_id = $1 LIMIT 1`, [areaId]);
        if (statsRow.rowCount > 0) {
          areaStats = { means: statsRow.rows[0].means, stds: statsRow.rows[0].stds, n: statsRow.rows[0].n };
        } else {
          const rawWhere = isAdmin ? `WHERE area_id = $1` : `WHERE company_id = $1 AND area_id = $2`;
          const rawParams = isAdmin ? [areaId] : [companyId, areaId];
          const raw = await query(`SELECT scores FROM assessments ${rawWhere}`, rawParams);
          areaStats = computeStatsFromScores(raw.rows);
          await query(
            `INSERT INTO area_stats (area_id, type_means, type_stds, n, computed_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (area_id)
             DO UPDATE SET type_means = EXCLUDED.type_means, type_stds = EXCLUDED.type_stds, n = EXCLUDED.n, computed_at = NOW()`,
            [areaId, JSON.stringify(areaStats.means), JSON.stringify(areaStats.stds), areaStats.n]
          );
        }

        const rub = await query(`SELECT desired_type_weights AS weights FROM area_rubrics WHERE area_id = $1 LIMIT 1`, [areaId]);
        if (rub.rowCount > 0) {
          areaRubric = rub.rows[0].weights || {};
        } else {
          await query(`INSERT INTO area_rubrics (area_id, desired_type_weights) VALUES ($1, '{}'::jsonb) ON CONFLICT (area_id) DO NOTHING`, [areaId]);
          areaRubric = {};
        }
      }
    }

    const rubAll = await query(
      `SELECT a.key AS "areaKey", r.desired_type_weights AS weights
       FROM area_rubrics r
       JOIN areas a ON a.id = r.area_id`
    );
    rubricByAreaKey = Object.fromEntries(rubAll.rows.map(x => [x.areaKey, x.weights || {}]));

    const distWhere = isAdmin ? '' : 'WHERE ass.company_id = $1';
    const distParams = isAdmin ? [] : [companyId];
    const distAgg = await query(
      `SELECT ar.key AS "areaKey", ar.label AS "areaLabel", ass.top_type AS "topType", COUNT(*)::int AS cnt
       FROM assessments ass
       JOIN areas ar ON ar.id = ass.area_id
       ${distWhere}
       GROUP BY ar.key, ar.label, ass.top_type
       ORDER BY ar.label, ass.top_type`
      ,distParams
    );
    const monthlyWhere = isAdmin ? '' : 'WHERE company_id = $1';
    const monthlyParams = isAdmin ? [] : [companyId];
    const monthlyAgg = await query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS period, COUNT(*)::int AS cnt
       FROM assessments
       ${monthlyWhere}
       GROUP BY 1
       ORDER BY 1`,
      monthlyParams
    );
    const totalsWhere = isAdmin ? '' : 'WHERE company_id = $1';
    const totalsParams = isAdmin ? [] : [companyId];
    const totalsAgg = await query(
      `SELECT
         COUNT(*)::int AS assessments,
         COUNT(DISTINCT candidate_id)::int AS candidates,
         COUNT(DISTINCT area_id)::int AS areas_active
       FROM assessments
       ${totalsWhere}`,
      totalsParams
    );
    const scoresWhere = isAdmin ? '' : 'WHERE ass.company_id = $1';
    const scoresParams = isAdmin ? [] : [companyId];
    const scoresAll = await query(
      `SELECT ar.key AS "areaKey", ass.scores
       FROM assessments ass
       JOIN areas ar ON ar.id = ass.area_id
       ${scoresWhere}`,
      scoresParams
    );
    const scoresRowsByKey = {};
    for (const row of scoresAll.rows) {
      const k = row.areaKey;
      if (!scoresRowsByKey[k]) scoresRowsByKey[k] = [];
      scoresRowsByKey[k].push({ scores: row.scores });
    }
    const areaSummaries = buildAreaSummaries(
      distAgg.rows,
      areas,
      scoresRowsByKey,
      rubricByAreaKey
    ).map((s) => ({
      ...s,
      rubricAlignPct: rubricAlignmentShare(s.topTypeCounts, rubricByAreaKey[s.areaKey] || {}),
    }));
    const gCounts = globalTopTypeCounts(distAgg.rows);
    const gTotal = Object.values(gCounts).reduce((a, b) => a + b, 0);
    const tRow = totalsAgg.rows[0] || {};
    analytics = {
      kpis: {
        assessments: tRow.assessments ?? 0,
        candidates: tRow.candidates ?? 0,
        areasActive: tRow.areas_active ?? 0,
      },
      monthlyTrend: monthlyAgg.rows.map((r) => ({ period: r.period, cnt: r.cnt })),
      globalTopTypeCounts: gCounts,
      globalTotal: gTotal,
      areaSummaries,
    };

    const result = await query(
      `SELECT
         ass.id AS "assessmentId",
         c.full_name AS name,
         ar.key AS "areaKey",
         ar.label AS "areaLabel",
         ass.vacancy_id AS "vacancyId",
         v.title AS "vacancyTitle",
         ass.top_type AS "topType",
         ass.scores,
         ass.created_at AS "createdAt"
       FROM assessments ass
       JOIN candidates c ON c.id = ass.candidate_id
       JOIN areas ar ON ar.id = ass.area_id
       LEFT JOIN vacancies v ON v.id = ass.vacancy_id
       ${where}
       ORDER BY ass.created_at DESC`,
      params
    );
    results = result.rows.map(r => {
      const fit = selectedArea !== 'all' ? fitForCandidate(r.scores, areaStats, areaRubric) : { fitScore: null, fitLabel: null };
      const weights = rubricByAreaKey[r.areaKey] || {};
      const areaFit = computeAreaScore010(r.scores, weights);
      return { ...r, ...fit, areaFitScore010: areaFit.score010, areaFitLabel: areaFit.label };
    });
  } catch (e) {
    console.error('Erro ao buscar resultados:', e);
  }

  return (
    <DashboardClient
      results={results}
      areas={areas}
      counts={counts}
      vacancies={vacancies}
      selectedArea={selectedArea}
      selectedVacancy={selectedVacancy}
      areaStats={areaStats}
      areaRubric={areaRubric}
      analytics={analytics}
      auth={{ role: payload?.role || null, companyId: payload?.companyId ?? null }}
    />
  );
}

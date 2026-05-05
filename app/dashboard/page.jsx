import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, COOKIE_NAME } from '../../lib/auth';
import { query, queryRead } from '../../lib/db';
import { normalizeLocale, t } from '../../lib/i18n';
import DashboardClient from './DashboardClient';
import {
  parseDashboardPagination,
  parseTeamSort,
  sqlTeamOrderBy,
  assessmentListWhereParts,
  parsePipelineFilter,
  sqlWhere,
} from '../../lib/assessment-filters';
import { enrichAssessmentDashboardRow, toNum } from '../../lib/dashboard-assessment-row';
import { getCompat } from '../../lib/data';
import {
  buildAreaSummaries,
  buildLeadershipPotentialsByCompany,
  globalTopTypeCounts,
  rubricAlignmentShare,
} from '../../lib/leadership-analytics';

function buildCompatBundles(lightRows) {
  const people = lightRows.map((r) => ({
    assessmentId: r.assessmentId,
    candidateId: r.candidateId,
    name: r.name,
    areaKey: '',
    areaLabel: r.areaLabel || '',
    vacancyId: null,
    vacancyTitle: '',
    topType: r.topType,
    scores: {},
  }));
  const pairs = []; const tensions = []; const synergies = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]; const b = people[j];
      const compat = getCompat(a.topType, b.topType);
      const row = { a, b, compat };
      pairs.push(row);
      if (compat.level === 'tension') tensions.push(row);
      if (compat.level === 'synergy') synergies.push(row);
    }
  }
  return { pairs, tensions, synergies, people };
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
  const locale = normalizeLocale(payload?.locale);
  if (!isAdmin && !companyId) redirect('/login');

  const selectedArea = (searchParams?.area || 'all').toString();
  const selectedVacancy = (searchParams?.vacancy || 'all').toString();
  const selectedPipeline = parsePipelineFilter(searchParams);
  const rawCompany = (searchParams?.company || 'all').toString();

  // Busca candidatos/resultados DIRETAMENTE no banco — sem API, sem fetch
  let results = [];
  let areas = [];
  let companiesForFilter = [];
  let scopeCompanyFilter = null;
  let counts = [];
  let vacancies = [];
  let areaStats = null;
  let areaRubric = null;
  let rubricByAreaKey = {};
  let vacancyRubricByVacancyId = {};
  let analytics = null;
  let pagination = {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  };
  let compatMetrics = {
    pairs: [],
    tensions: [],
    synergies: [],
    typeCount: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => [t, 0])),
    total: 0,
  };
  let interactionPeople = [];
  let enneagram = 'all';

  try {
    const a = await queryRead(`SELECT key, label FROM areas ORDER BY label ASC`);
    areas = a.rows;

    /** Escopo de empresa: admin pode filtrar por ?company=ID; demais perfis usam sempre a empresa da sessão. */
    if (isAdmin) {
      const cos = await queryRead(`SELECT id, name FROM companies WHERE deleted = FALSE ORDER BY name ASC`);
      companiesForFilter = cos.rows;
      if (rawCompany !== 'all') {
        const cid = parseInt(rawCompany, 10);
        if (Number.isFinite(cid) && companiesForFilter.some((x) => Number(x.id) === cid)) {
          scopeCompanyFilter = cid;
        }
      }
    }

    const vWhereParts = ['v.deleted = FALSE', 'c.deleted = FALSE'];
    const vParams = [];
    if (!isAdmin) {
      vParams.push(companyId);
      vWhereParts.push(`v.company_id = $${vParams.length}`);
    } else if (scopeCompanyFilter != null) {
      vParams.push(scopeCompanyFilter);
      vWhereParts.push(`v.company_id = $${vParams.length}`);
    }
    const vWhere = `WHERE ${vWhereParts.join(' AND ')}`;
    const v = await queryRead(
      `SELECT v.id, v.company_id AS "companyId", v.title, v.status, v.created_at AS "createdAt"
       FROM vacancies v
       JOIN companies c ON c.id = v.company_id
       ${vWhere}
       ORDER BY v.created_at DESC`,
      vParams
    );
    vacancies = v.rows;

    const vacIdsForRubrics = vacancies.map((x) => x.id).filter((id) => id != null);
    if (vacIdsForRubrics.length > 0) {
      const vr = await queryRead(
        `SELECT vacancy_id AS "vacancyId", desired_type_weights AS weights
         FROM vacancy_rubrics WHERE vacancy_id = ANY($1::bigint[])`,
        [vacIdsForRubrics]
      );
      vacancyRubricByVacancyId = Object.fromEntries(
        vr.rows.map((row) => [String(row.vacancyId), row.weights && typeof row.weights === 'object' ? row.weights : {}])
      );
    }

    const countWhereParts = [];
    const cParams = [];
    if (!isAdmin) {
      cParams.push(companyId);
      countWhereParts.push(`ass.company_id = $${cParams.length}`);
    } else if (scopeCompanyFilter != null) {
      cParams.push(scopeCompanyFilter);
      countWhereParts.push(`ass.company_id = $${cParams.length}`);
    }
    const cWhere = countWhereParts.length ? `WHERE ${countWhereParts.join(' AND ')}` : '';
    const c = await queryRead(
      `SELECT ar.key, ar.label, COUNT(*)::int AS count
       FROM assessments ass
       JOIN areas ar ON ar.id = ass.area_id
       ${cWhere}
       GROUP BY ar.key, ar.label
       ORDER BY ar.label ASC`,
      cParams
    );
    counts = c.rows;

    const { page, pageSize, enneagram: enneParsed } = parseDashboardPagination(searchParams);
    enneagram = enneParsed;
    pagination = { ...pagination, page, pageSize };

    const teamSortState = parseTeamSort(searchParams);
    const teamOrderSql = sqlTeamOrderBy(teamSortState.sort, teamSortState.dir);

    if (selectedArea !== 'all') {
      const areaRow = await queryRead(`SELECT id FROM areas WHERE key = $1 LIMIT 1`, [selectedArea]);
      const areaId = areaRow.rows?.[0]?.id;
      if (areaId) {
        if (isAdmin && scopeCompanyFilter != null) {
          const raw = await queryRead(
            `SELECT scores FROM assessments WHERE company_id = $1 AND area_id = $2`,
            [scopeCompanyFilter, areaId]
          );
          areaStats = computeStatsFromScores(raw.rows);
        } else {
          const statsRow = await queryRead(`SELECT type_means AS "means", type_stds AS "stds", n FROM area_stats WHERE area_id = $1 LIMIT 1`, [areaId]);
          if (statsRow.rowCount > 0) {
            areaStats = { means: statsRow.rows[0].means, stds: statsRow.rows[0].stds, n: statsRow.rows[0].n };
          } else {
            const rawWhere = isAdmin ? `WHERE area_id = $1` : `WHERE company_id = $1 AND area_id = $2`;
            const rawParams = isAdmin ? [areaId] : [companyId, areaId];
            const raw = await queryRead(`SELECT scores FROM assessments ${rawWhere}`, rawParams);
            areaStats = computeStatsFromScores(raw.rows);
            await query(
              `INSERT INTO area_stats (area_id, type_means, type_stds, n, computed_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT (area_id)
               DO UPDATE SET type_means = EXCLUDED.type_means, type_stds = EXCLUDED.type_stds, n = EXCLUDED.n, computed_at = NOW()`,
              [areaId, JSON.stringify(areaStats.means), JSON.stringify(areaStats.stds), areaStats.n]
            );
          }
        }

        const rub = await queryRead(`SELECT desired_type_weights AS weights FROM area_rubrics WHERE area_id = $1 LIMIT 1`, [areaId]);
        if (rub.rowCount > 0) {
          areaRubric = rub.rows[0].weights || {};
        } else {
          await query(`INSERT INTO area_rubrics (area_id, desired_type_weights) VALUES ($1, '{}'::jsonb) ON CONFLICT (area_id) DO NOTHING`, [areaId]);
          areaRubric = {};
        }
      }
    }

    const rubAll = await queryRead(
      `SELECT a.key AS "areaKey", r.desired_type_weights AS weights
       FROM area_rubrics r
       JOIN areas a ON a.id = r.area_id`
    );
    rubricByAreaKey = Object.fromEntries(rubAll.rows.map(x => [x.areaKey, x.weights || {}]));

    const BASE_JOIN_LIST = `
FROM assessments ass
JOIN candidates c ON c.id = ass.candidate_id
JOIN areas ar ON ar.id = ass.area_id
LEFT JOIN vacancies v ON v.id = ass.vacancy_id
`;

    /** Mesmo escopo de filtros (área, vaga, perfil) sem JOIN em candidates — para agregações de Liderança. */
    const ANALYTICS_ASSESSMENT_JOIN = `
FROM assessments ass
JOIN areas ar ON ar.id = ass.area_id
LEFT JOIN vacancies v ON v.id = ass.vacancy_id
`;

    const { whereParts, params } = assessmentListWhereParts({
      isAdmin,
      companyId,
      scopeCompanyFilter,
      selectedArea,
      selectedVacancy,
      enneagram,
      pipelineStage: selectedPipeline,
    });
    const assessmentWhere = sqlWhere(whereParts);

    const cntRes = await queryRead(
      `SELECT COUNT(*)::int AS n ${BASE_JOIN_LIST} ${assessmentWhere}`,
      params
    );
    const listTotal = cntRes.rows[0]?.n ?? 0;
    const totalPagesSafe = Math.max(1, Math.ceil(listTotal / pageSize));
    const effectivePage = listTotal === 0 ? 1 : Math.min(page, totalPagesSafe);
    pagination = {
      page: effectivePage,
      pageSize,
      total: listTotal,
      totalPages: totalPagesSafe,
    };

    const typeCountAgg = {};
    for (let t = 1; t <= 9; t++) typeCountAgg[t] = 0;
    const histRes = await queryRead(
      `SELECT ass.top_type AS "topType", COUNT(*)::int AS n
       ${BASE_JOIN_LIST}
       ${assessmentWhere}
       GROUP BY ass.top_type`,
      params
    );
    for (const row of histRes.rows) {
      const tt = row.topType;
      if (typeof tt === 'number' && tt >= 1 && tt <= 9) typeCountAgg[tt] = row.n;
    }

    const lightRes = await queryRead(
      `SELECT ass.id AS "assessmentId",
              c.id AS "candidateId",
              c.full_name AS name,
              ass.top_type AS "topType",
              ar.label AS "areaLabel"
       ${BASE_JOIN_LIST}
       ${assessmentWhere}
       ${teamOrderSql}`,
      params
    );
    const bundles = buildCompatBundles(lightRes.rows);
    compatMetrics = {
      pairs: bundles.pairs,
      tensions: bundles.tensions,
      synergies: bundles.synergies,
      typeCount: typeCountAgg,
      total: listTotal,
    };
    interactionPeople = bundles.people;

    const enrichCtx = { selectedArea, areaStats, areaRubric, rubricByAreaKey, vacancyRubricByVacancyId };
    const pageParams = [...params];
    pageParams.push(pageSize);
    const limIx = pageParams.length;
    pageParams.push(Math.max(0, (effectivePage - 1) * pageSize));
    const offIx = pageParams.length;
    const pageRes = await queryRead(
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
         ass.created_at AS "createdAt",
         ass.pipeline_stage AS "pipelineStage",
         ass.invite_id AS "inviteId"
       ${BASE_JOIN_LIST}
       ${assessmentWhere}
       ${teamOrderSql}
       LIMIT $${limIx} OFFSET $${offIx}`,
      pageParams
    );
    results = pageRes.rows.map((r) => enrichAssessmentDashboardRow(r, enrichCtx));

    const distAgg = await queryRead(
      `SELECT ar.key AS "areaKey", ar.label AS "areaLabel", ass.top_type AS "topType", COUNT(*)::int AS cnt
       ${ANALYTICS_ASSESSMENT_JOIN}
       ${assessmentWhere}
       GROUP BY ar.key, ar.label, ass.top_type
       ORDER BY ar.label, ass.top_type`,
      params
    );
    const monthlyAgg = await queryRead(
      `SELECT to_char(date_trunc('month', ass.created_at), 'YYYY-MM') AS period, COUNT(*)::int AS cnt
       ${ANALYTICS_ASSESSMENT_JOIN}
       ${assessmentWhere}
       GROUP BY 1
       ORDER BY 1`,
      params
    );
    const totalsAgg = await queryRead(
      `SELECT
         COUNT(*)::int AS assessments,
         COUNT(DISTINCT ass.candidate_id)::int AS candidates,
         COUNT(DISTINCT ass.area_id)::int AS areas_active
       ${ANALYTICS_ASSESSMENT_JOIN}
       ${assessmentWhere}`,
      params
    );
    const scoresAll = await queryRead(
      `SELECT ar.key AS "areaKey", ass.scores
       ${ANALYTICS_ASSESSMENT_JOIN}
       ${assessmentWhere}`,
      params
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

    let leadershipPotentials = [];
    try {
      const latestCand = await queryRead(
        `SELECT DISTINCT ON (ass.candidate_id, ass.company_id)
           ass.company_id AS "companyId",
           co.name AS "companyName",
           ass.candidate_id AS "candidateId",
           cand.full_name AS name,
           ass.scores,
           ass.top_type AS "topType"
         FROM assessments ass
         JOIN candidates cand ON cand.id = ass.candidate_id
         JOIN companies co ON co.id = ass.company_id AND co.deleted = FALSE
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         ${assessmentWhere}
         ORDER BY ass.candidate_id, ass.company_id, ass.created_at DESC`,
        params
      );
      leadershipPotentials = buildLeadershipPotentialsByCompany(latestCand.rows, { topPerCompany: 6 });
    } catch (le) {
      console.error('Erro ao montar potenciais de liderança por empresa:', le);
    }

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
      leadershipPotentials,
    };

  } catch (e) {
    console.error('Erro ao buscar resultados:', e);
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Georgia, serif',
            color: 'rgba(26,22,37,0.55)',
          }}
        >
          {t(locale, 'dashboard.loadingPanel')}
        </div>
      }
    >
      <DashboardClient
        results={results}
        pagination={pagination}
        compatMetrics={compatMetrics}
        interactionPeople={interactionPeople}
        selectedEnneagram={enneagram}
        areas={areas}
        companies={companiesForFilter}
        counts={counts}
        vacancies={vacancies}
        selectedArea={selectedArea}
        selectedVacancy={selectedVacancy}
        selectedPipeline={selectedPipeline}
        selectedCompany={scopeCompanyFilter != null ? String(scopeCompanyFilter) : 'all'}
        areaStats={areaStats}
        areaRubric={areaRubric}
        analytics={analytics}
        auth={{ role: payload?.role || null, companyId: payload?.companyId ?? null, locale }}
        initialLocale={locale}
      />
    </Suspense>
  );
}

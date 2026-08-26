/**
 * Carrega cohort filtrado (Overview) ou grupo salvo para inteligência comportamental.
 * WHERE inline (evita puxar assessment-filters → permissions no Node puro).
 */

import { getTeamGroup, listTeamGroups } from './team-groups.js';
import {
  TEAM_INTEL_PEOPLE_CAP,
  buildTeamBehavioralIntel,
} from './team-behavioral-intel.js';

const BASE_JOIN = `
  FROM assessments ass
  JOIN candidates c ON c.id = ass.candidate_id
  LEFT JOIN areas ar ON ar.id = ass.area_id
  LEFT JOIN vacancies v ON v.id = ass.vacancy_id AND v.deleted = FALSE
`;

function buildCohortWhere(ctx = {}) {
  const {
    isAdmin,
    companyId,
    scopeCompanyFilter,
    selectedArea = 'all',
    selectedVacancy = 'all',
    dateFrom = null,
    dateTo = null,
    nameSearch = '',
    rosterScope = 'internal',
  } = ctx;

  const parts = [];
  const params = [];

  if (!isAdmin) {
    params.push(companyId);
    parts.push(`ass.company_id = $${params.length}`);
  } else if (scopeCompanyFilter != null) {
    params.push(scopeCompanyFilter);
    parts.push(`ass.company_id = $${params.length}`);
  }

  if (selectedArea !== 'all') {
    params.push(selectedArea);
    parts.push(`ar.key = $${params.length}`);
  }

  const vacRaw = String(selectedVacancy ?? 'all').trim();
  const vacancyPinned = vacRaw !== 'all';
  if (vacancyPinned) {
    const vid = parseInt(vacRaw, 10);
    if (Number.isFinite(vid)) {
      params.push(vid);
      parts.push(`ass.vacancy_id = $${params.length}`);
    }
  }

  const roster = ['internal', 'recruiting', 'all'].includes(rosterScope) ? rosterScope : 'internal';
  if (!vacancyPinned && roster === 'internal') {
    parts.push(`(
      ass.vacancy_id IS NULL
      OR EXISTS (
        SELECT 1 FROM candidates cx
        WHERE cx.id = ass.candidate_id
          AND cx.employment_status IN ('employee', 'alumni')
      )
    )`);
  } else if (!vacancyPinned && roster === 'recruiting') {
    parts.push(`ass.vacancy_id IS NOT NULL`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    parts.push(`ass.created_at >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    parts.push(`ass.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (nameSearch) {
    params.push(`%${nameSearch}%`);
    parts.push(`c.full_name ILIKE $${params.length}`);
  }

  const whereSql = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  return { whereSql, params };
}

function resolvePulseCompanyId(ctx = {}) {
  if (!ctx.isAdmin) return ctx.companyId;
  if (ctx.scopeCompanyFilter != null) return ctx.scopeCompanyFilter;
  return null;
}

/** team-groups helpers expect `.query`; Overview SSR often only has queryRead. */
function asWritableDb(db) {
  const q =
    typeof db.query === 'function'
      ? db.query.bind(db)
      : typeof db.queryRead === 'function'
        ? db.queryRead.bind(db)
        : null;
  if (!q) return db;
  return {
    query: q,
    queryRead: typeof db.queryRead === 'function' ? db.queryRead.bind(db) : q,
  };
}

async function loadPeopleByAssessmentIds(db, assessmentIds) {
  const ids = [...new Set((assessmentIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) return [];
  const lim = Math.min(ids.length, TEAM_INTEL_PEOPLE_CAP);
  const res = await db.queryRead(
    `SELECT DISTINCT ON (a.candidate_id)
       a.candidate_id AS "candidateId",
       a.top_type AS "topType",
       a.scores
     FROM assessments a
     WHERE a.id = ANY($1::bigint[])
     ORDER BY a.candidate_id, a.created_at DESC, a.id DESC
     LIMIT $2`,
    [ids.slice(0, lim), lim]
  );
  return res.rows.map((r) => ({
    candidateId: Number(r.candidateId),
    topType: r.topType != null ? Number(r.topType) : null,
    scores: r.scores && typeof r.scores === 'object' ? r.scores : null,
  }));
}

async function loadPeopleByFilters(db, ctx) {
  const { whereSql, params } = buildCohortWhere(ctx);
  const p = [...params, TEAM_INTEL_PEOPLE_CAP];
  const limIx = p.length;
  const eneRes = await db.queryRead(
    `SELECT DISTINCT ON (ass.candidate_id)
       ass.candidate_id AS "candidateId",
       ass.top_type AS "topType",
       ass.scores
     ${BASE_JOIN}
     ${whereSql}
     ORDER BY ass.candidate_id, ass.created_at DESC, ass.id DESC
     LIMIT $${limIx}`,
    p
  );
  return eneRes.rows.map((r) => ({
    candidateId: Number(r.candidateId),
    topType: r.topType != null ? Number(r.topType) : null,
    scores: r.scores && typeof r.scores === 'object' ? r.scores : null,
  }));
}

/**
 * @param {{ queryRead: Function }} db
 * @param {object} ctx — filters + locale + optional teamGroupId
 */
export async function loadTeamBehavioralIntel(db, ctx = {}) {
  const locale = ctx.locale || 'pt-BR';
  const rawGroupId = ctx.teamGroupId != null ? Number(ctx.teamGroupId) : NaN;
  const wantGroup = Number.isFinite(rawGroupId) && rawGroupId > 0;
  const pulseCompanyId = resolvePulseCompanyId(ctx);

  let cohort = { kind: 'filters', teamGroupId: null, teamGroupName: null };
  let eneagramPeople = [];

  if (wantGroup && pulseCompanyId != null) {
    const group = await getTeamGroup(asWritableDb(db), {
      id: rawGroupId,
      companyId: pulseCompanyId,
      isAdmin: Boolean(ctx.isAdmin),
    });
    if (group) {
      const assessmentIds = [
        group.baseAssessmentId,
        ...(Array.isArray(group.memberAssessmentIds) ? group.memberAssessmentIds : []),
      ];
      eneagramPeople = await loadPeopleByAssessmentIds(db, assessmentIds);
      cohort = {
        kind: 'team_group',
        teamGroupId: Number(group.id),
        teamGroupName: group.name || null,
      };
    } else {
      eneagramPeople = await loadPeopleByFilters(db, ctx);
    }
  } else {
    eneagramPeople = await loadPeopleByFilters(db, ctx);
  }

  const candidateIds = eneagramPeople.map((x) => x.candidateId).filter((id) => Number.isFinite(id));

  let motivatorAttempts = [];
  if (candidateIds.length) {
    const mRes = await db.queryRead(
      `SELECT DISTINCT ON (a.candidate_id)
         a.candidate_id AS "candidateId",
         a.dimension_scores AS "dimensionScores",
         a.ranking
       FROM ae_attempts a
       WHERE a.status = 'completed'
         AND a.candidate_id = ANY($1::bigint[])
         AND a.dimension_scores IS NOT NULL
       ORDER BY a.candidate_id, a.completed_at DESC NULLS LAST, a.id DESC
       LIMIT $2`,
      [candidateIds, TEAM_INTEL_PEOPLE_CAP]
    );
    motivatorAttempts = mRes.rows.map((r) => ({
      candidateId: Number(r.candidateId),
      dimensionScores:
        r.dimensionScores && typeof r.dimensionScores === 'object' ? r.dimensionScores : null,
      ranking: Array.isArray(r.ranking) ? r.ranking : null,
    }));
  }

  const intel = buildTeamBehavioralIntel({
    eneagramPeople,
    motivatorAttempts,
    locale,
    cohort,
  });

  let teamGroups = [];
  if (pulseCompanyId != null && Number(pulseCompanyId) > 0) {
    try {
      const items = await listTeamGroups(asWritableDb(db), { companyId: pulseCompanyId, limit: 50 });
      teamGroups = items.map((g) => ({ id: Number(g.id), name: g.name }));
    } catch {
      teamGroups = [];
    }
  }

  return {
    ...intel,
    teamGroups,
    selectedTeamGroupId: cohort.kind === 'team_group' ? cohort.teamGroupId : null,
  };
}

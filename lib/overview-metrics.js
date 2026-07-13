/**
 * Recruiter Overview metrics.
 * Funnel ignores the pipeline filter (full picture); company/area/vacancy/dates/search apply.
 */

import { queryRead } from './db';
import { assessmentListWhereParts, sqlWhere } from './assessment-filters';
import { OVERVIEW_FUNNEL_STAGES } from './overview-constants';

function companyParts(isAdmin, companyId, scopeCompanyFilter, alias) {
  const parts = [];
  const params = [];
  if (!isAdmin) {
    params.push(companyId);
    parts.push(`${alias}.company_id = $${params.length}`);
  } else if (scopeCompanyFilter != null) {
    params.push(scopeCompanyFilter);
    parts.push(`${alias}.company_id = $${params.length}`);
  }
  return { parts, params };
}

function daysAgo(dateLike) {
  if (!dateLike) return null;
  const a = new Date(dateLike);
  if (Number.isNaN(a.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - a.getTime()) / 86400000));
}

function andWhere(baseWhere, extraSql) {
  if (!baseWhere) return `WHERE ${extraSql}`;
  return `${baseWhere} AND ${extraSql}`;
}

function dominantFromTypeCount(typeCount) {
  let best = null;
  let bestN = 0;
  for (const [k, v] of Object.entries(typeCount || {})) {
    const n = Number(v) || 0;
    if (n > bestN) {
      bestN = n;
      best = parseInt(k, 10);
    }
  }
  return bestN > 0 && best >= 1 && best <= 9 ? best : null;
}

function emptyMetrics(typeCount = {}) {
  const typeMixTotal = Object.values(typeCount || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  return {
    funnel: Object.fromEntries(OVERVIEW_FUNNEL_STAGES.map((s) => [s, 0])),
    funnelTotal: 0,
    hiredLast7d: 0,
    rejectedLast7d: 0,
    rejectionReasons: [],
    attention: [],
    vacancies: { openCount: 0, positionsOpen: 0, staleCount: 0, items: [] },
    typeMix: {
      typeCount: typeCount || {},
      total: typeMixTotal,
      dominantType: dominantFromTypeCount(typeCount),
    },
    error: false,
  };
}

/**
 * @param {object} ctx
 * @returns {Promise<object>}
 */
export async function buildOverviewMetrics(ctx) {
  const {
    isAdmin,
    companyId,
    scopeCompanyFilter,
    selectedArea = 'all',
    selectedVacancy = 'all',
    enneagram = 'all',
    dateFrom = null,
    dateTo = null,
    nameSearch = '',
    typeCount = {},
    rosterScope = 'internal',
  } = ctx;

  const base = emptyMetrics(typeCount);

  try {
    const { whereParts, params } = assessmentListWhereParts({
      isAdmin,
      companyId,
      scopeCompanyFilter,
      selectedArea,
      selectedVacancy,
      enneagram,
      pipelineStage: 'all',
      dateFrom,
      dateTo,
      rosterScope,
    });
    const funnelParts = nameSearch
      ? [...whereParts, `c.full_name ILIKE $${params.length + 1}`]
      : whereParts;
    const funnelParams = nameSearch ? [...params, `%${nameSearch}%`] : params;
    const funnelWhere = sqlWhere(funnelParts);

    const vacRaw = String(selectedVacancy ?? 'all').trim();
    const vcScope = companyParts(isAdmin, companyId, scopeCompanyFilter, 'vc');
    const vcParts = [...vcScope.parts, 'v.deleted = FALSE', 'co.deleted = FALSE'];
    const vcParams = [...vcScope.params];
    if (vacRaw !== 'all') {
      const vid = parseInt(vacRaw, 10);
      if (Number.isFinite(vid)) {
        vcParams.push(vid);
        vcParts.push(`vc.vacancy_id = $${vcParams.length}`);
      }
    }
    if (nameSearch) {
      vcParams.push(`%${nameSearch}%`);
      vcParts.push(`c.full_name ILIKE $${vcParams.length}`);
    }

    const vacScope = companyParts(isAdmin, companyId, scopeCompanyFilter, 'v');
    const invScope = companyParts(isAdmin, companyId, scopeCompanyFilter, 'i');
    const invParts = [...invScope.parts, `i.status IN ('sent', 'opened')`, 'v.deleted = FALSE'];
    const invParams = [...invScope.params];
    if (vacRaw !== 'all') {
      const vid = parseInt(vacRaw, 10);
      if (Number.isFinite(vid)) {
        invParams.push(vid);
        invParts.push(`i.vacancy_id = $${invParams.length}`);
      }
    }

    const [
      funnelRes,
      pendingVc,
      hired7,
      rejected7,
      reasonsRes,
      staleInvites,
      nearVac,
      noNotes,
      stuck,
      waiting,
      openCountRes,
      vacList,
    ] = await Promise.all([
      queryRead(
        `SELECT COALESCE(ass.pipeline_stage, 'test_completed') AS stage, COUNT(*)::int AS n
         FROM assessments ass
         JOIN candidates c ON c.id = ass.candidate_id
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         ${funnelWhere}
         GROUP BY 1`,
        funnelParams
      ),
      queryRead(
        `SELECT COUNT(*)::int AS n
         FROM vacancy_candidates vc
         JOIN candidates c ON c.id = vc.candidate_id
         JOIN vacancies v ON v.id = vc.vacancy_id
         JOIN companies co ON co.id = vc.company_id
         LEFT JOIN assessments ass
           ON ass.candidate_id = vc.candidate_id AND ass.vacancy_id = vc.vacancy_id
         WHERE ${vcParts.join(' AND ')} AND ass.id IS NULL`,
        vcParams
      ),
      queryRead(
        `SELECT COUNT(*)::int AS n
         FROM assessments ass
         JOIN candidates c ON c.id = ass.candidate_id
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         ${andWhere(funnelWhere, `ass.pipeline_stage = 'hired' AND ass.hired_at >= NOW() - INTERVAL '7 days'`)}`,
        funnelParams
      ),
      queryRead(
        `SELECT COUNT(*)::int AS n
         FROM assessment_pipeline_history h
         JOIN assessments ass ON ass.id = h.assessment_id
         JOIN candidates c ON c.id = ass.candidate_id
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         ${andWhere(funnelWhere, `h.to_stage = 'rejected' AND h.changed_at >= NOW() - INTERVAL '7 days'`)}`,
        funnelParams
      ),
      queryRead(
        `SELECT COALESCE(NULLIF(TRIM(h.reason), ''), 'other') AS reason, COUNT(*)::int AS n
         FROM assessment_pipeline_history h
         JOIN assessments ass ON ass.id = h.assessment_id
         JOIN candidates c ON c.id = ass.candidate_id
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         ${andWhere(funnelWhere, `h.to_stage = 'rejected' AND h.changed_at >= NOW() - INTERVAL '7 days'`)}
         GROUP BY 1
         ORDER BY n DESC
         LIMIT 6`,
        funnelParams
      ),
      queryRead(
        `SELECT i.id, i.vacancy_id AS "vacancyId", i.candidate_name AS name,
                v.title AS "vacancyTitle", i.sent_at AS "sentAt"
         FROM candidate_invites i
         JOIN vacancies v ON v.id = i.vacancy_id
         WHERE ${invParts.join(' AND ')}
           AND i.sent_at < NOW() - INTERVAL '2 days'
         ORDER BY i.sent_at ASC
         LIMIT 3`,
        invParams
      ),
      queryRead(
        `SELECT v.id, v.title, v.target_date AS "targetDate", v.positions_count AS "positionsCount"
         FROM vacancies v
         JOIN companies co ON co.id = v.company_id
         WHERE ${[
           ...vacScope.parts,
           'v.deleted = FALSE',
           'co.deleted = FALSE',
           "v.status = 'open'",
           'v.target_date IS NOT NULL',
           "v.target_date <= (CURRENT_DATE + INTERVAL '7 days')",
         ].join(' AND ')}
         ORDER BY v.target_date ASC
         LIMIT 3`,
        vacScope.params
      ),
      queryRead(
        `SELECT vc.id, c.full_name AS name, v.id AS "vacancyId", v.title AS "vacancyTitle",
                vc.updated_at AS "updatedAt"
         FROM vacancy_candidates vc
         JOIN candidates c ON c.id = vc.candidate_id
         JOIN vacancies v ON v.id = vc.vacancy_id
         JOIN companies co ON co.id = vc.company_id
         WHERE ${vcParts.join(' AND ')}
           AND (
             vc.interview_notes IS NULL
             OR TRIM(regexp_replace(vc.interview_notes, '<[^>]*>', '', 'g')) = ''
           )
         ORDER BY vc.updated_at DESC
         LIMIT 2`,
        vcParams
      ),
      queryRead(
        `SELECT ass.id AS "assessmentId", c.full_name AS name, v.title AS "vacancyTitle",
                COALESCE(stage_enter.entered_at, ass.created_at) AS "since"
         FROM assessments ass
         JOIN candidates c ON c.id = ass.candidate_id
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         LEFT JOIN LATERAL (
           SELECT MAX(h.changed_at) AS entered_at
           FROM assessment_pipeline_history h
           WHERE h.assessment_id = ass.id AND h.to_stage = 'interview'
         ) stage_enter ON TRUE
         ${andWhere(
           funnelWhere,
           `ass.pipeline_stage = 'interview'
            AND COALESCE(stage_enter.entered_at, ass.created_at) < NOW() - INTERVAL '7 days'`
         )}
         ORDER BY "since" ASC
         LIMIT 2`,
        funnelParams
      ),
      queryRead(
        `SELECT ass.id AS "assessmentId", c.full_name AS name, v.title AS "vacancyTitle",
                ass.created_at AS "createdAt"
         FROM assessments ass
         JOIN candidates c ON c.id = ass.candidate_id
         JOIN areas ar ON ar.id = ass.area_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         ${andWhere(funnelWhere, `ass.pipeline_stage = 'test_completed'`)}
         ORDER BY ass.created_at ASC
         LIMIT 2`,
        funnelParams
      ),
      queryRead(
        `SELECT COUNT(*)::int AS n
         FROM vacancies v
         JOIN companies co ON co.id = v.company_id
         WHERE ${[...vacScope.parts, 'v.deleted = FALSE', 'co.deleted = FALSE', "v.status = 'open'"].join(' AND ')}`,
        vacScope.params
      ),
      queryRead(
        `SELECT
           v.id,
           v.title,
           v.positions_count AS "positionsCount",
           v.target_date AS "targetDate",
           COALESCE(a.hired, 0)::int AS hired,
           COALESCE(a.in_funnel, 0)::int AS "inFunnel",
           GREATEST(a.last_ass, vc.last_vc) AS "lastActivity"
         FROM vacancies v
         JOIN companies co ON co.id = v.company_id
         LEFT JOIN (
           SELECT vacancy_id,
                  COUNT(*) FILTER (WHERE pipeline_stage = 'hired') AS hired,
                  COUNT(*) FILTER (WHERE pipeline_stage NOT IN ('rejected', 'archived')) AS in_funnel,
                  MAX(created_at) AS last_ass
           FROM assessments
           WHERE vacancy_id IS NOT NULL
           GROUP BY vacancy_id
         ) a ON a.vacancy_id = v.id
         LEFT JOIN (
           SELECT vacancy_id, MAX(updated_at) AS last_vc
           FROM vacancy_candidates
           GROUP BY vacancy_id
         ) vc ON vc.vacancy_id = v.id
         WHERE ${[...vacScope.parts, 'v.deleted = FALSE', 'co.deleted = FALSE', "v.status = 'open'"].join(' AND ')}
         ORDER BY v.target_date ASC NULLS LAST, v.created_at DESC
         LIMIT 6`,
        vacScope.params
      ),
    ]);

    const funnel = { ...base.funnel };
    let funnelTotal = 0;
    for (const row of funnelRes.rows) {
      if (!OVERVIEW_FUNNEL_STAGES.includes(row.stage)) continue;
      funnel[row.stage] = row.n;
      funnelTotal += row.n;
    }
    const pendingN = pendingVc.rows[0]?.n ?? 0;
    if (pendingN > 0) {
      funnel.new += pendingN;
      funnelTotal += pendingN;
    }

    const attention = [];
    for (const row of staleInvites.rows) {
      attention.push({
        id: `invite-${row.id}`,
        priority: 'high',
        kind: 'invite_pending',
        titleKey: 'panel.overview.attnInvitePending',
        context: [row.name, row.vacancyTitle].filter(Boolean).join(' · '),
        days: daysAgo(row.sentAt) ?? 2,
        nav: { tab: 'vacancies', vacancyDetail: String(row.vacancyId) },
      });
    }
    for (const row of nearVac.rows) {
      const daysLeft = row.targetDate
        ? Math.ceil((new Date(`${String(row.targetDate).slice(0, 10)}T12:00:00`).getTime() - Date.now()) / 86400000)
        : 0;
      attention.push({
        id: `target-${row.id}`,
        priority: 'high',
        kind: 'vacancy_target',
        titleKey: daysLeft < 0 ? 'panel.overview.attnTargetOverdue' : 'panel.overview.attnTargetSoon',
        context: row.title,
        days: Math.abs(daysLeft),
        nav: { tab: 'vacancies', vacancyDetail: String(row.id) },
      });
    }
    for (const row of noNotes.rows) {
      attention.push({
        id: `notes-${row.id}`,
        priority: 'medium',
        kind: 'missing_notes',
        titleKey: 'panel.overview.attnMissingNotes',
        context: [row.name, row.vacancyTitle].filter(Boolean).join(' · '),
        days: daysAgo(row.updatedAt) ?? 0,
        nav: { tab: 'vacancies', vacancyDetail: String(row.vacancyId) },
      });
    }
    for (const row of stuck.rows) {
      attention.push({
        id: `stuck-${row.assessmentId}`,
        priority: 'medium',
        kind: 'stuck_interview',
        titleKey: 'panel.overview.attnStuckInterview',
        context: [row.name, row.vacancyTitle].filter(Boolean).join(' · '),
        days: daysAgo(row.since) ?? 7,
        nav: { tab: 'team', pipeline: 'interview', search: row.name },
      });
    }
    for (const row of waiting.rows) {
      attention.push({
        id: `wait-${row.assessmentId}`,
        priority: 'low',
        kind: 'awaiting_screening',
        titleKey: 'panel.overview.attnAwaitingScreening',
        context: [row.name, row.vacancyTitle].filter(Boolean).join(' · '),
        days: daysAgo(row.createdAt) ?? 0,
        nav: { tab: 'team', pipeline: 'test_completed', search: row.name },
      });
    }

    const priorityRank = { high: 0, medium: 1, low: 2 };
    attention.sort(
      (a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) || (b.days || 0) - (a.days || 0)
    );

    let positionsOpen = 0;
    let staleCount = 0;
    const items = vacList.rows.map((row) => {
      const need = Math.max(1, Number(row.positionsCount) || 1);
      const hired = Number(row.hired) || 0;
      const remaining = Math.max(0, need - hired);
      positionsOpen += remaining;
      const staleDays = daysAgo(row.lastActivity);
      const isStale = staleDays == null || staleDays >= 7;
      if (isStale) staleCount += 1;
      return {
        id: row.id,
        title: row.title,
        positionsCount: need,
        hired,
        remaining,
        inFunnel: Number(row.inFunnel) || 0,
        targetDate: row.targetDate ? String(row.targetDate).slice(0, 10) : null,
        lastActivityDays: staleDays,
        stale: isStale,
      };
    });

    return {
      funnel,
      funnelTotal,
      hiredLast7d: hired7.rows[0]?.n ?? 0,
      rejectedLast7d: rejected7.rows[0]?.n ?? 0,
      rejectionReasons: reasonsRes.rows.map((r) => ({ reason: r.reason, n: r.n })),
      attention: attention.slice(0, 8),
      vacancies: {
        openCount: openCountRes.rows[0]?.n ?? 0,
        positionsOpen,
        staleCount,
        items,
      },
      typeMix: base.typeMix,
      error: false,
    };
  } catch (err) {
    console.error('[overview-metrics]', err?.message || err);
    return { ...base, error: true };
  }
}

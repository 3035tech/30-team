/**
 * Vacancy client reports — strong public token + immutable snapshot.
 */

import crypto from 'node:crypto';
import { query, queryRead } from './db';
import { computeAreaScore010 } from './area-fit';

export const REPORT_EXPIRY_DAYS = [7, 14, 30];
export const DEFAULT_REPORT_EXPIRY_DAYS = 14;

function normalizeScores(scores) {
  if (!scores || typeof scores !== 'object') return {};
  const out = {};
  for (let t = 1; t <= 9; t += 1) {
    const v = scores[t] ?? scores[String(t)];
    const n = typeof v === 'number' ? v : parseFloat(v);
    out[t] = Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
  }
  return out;
}

/**
 * Load vacancy + assessed candidates (with fit) for report building.
 * @returns {Promise<{ vacancy: object, people: object[] } | null>}
 */
export async function loadVacancyReportSource(vacancyId, { isAdmin, companyId }) {
  const own = await queryRead(
    `SELECT v.id, v.title, v.positions_count AS "positionsCount", v.status,
            v.company_id AS "companyId", co.name AS "companyName"
     FROM vacancies v
     JOIN companies co ON co.id = v.company_id AND co.deleted = FALSE
     WHERE v.id = $1 AND v.deleted = FALSE ${!isAdmin ? 'AND v.company_id = $2' : ''}
     LIMIT 1`,
    !isAdmin ? [vacancyId, companyId] : [vacancyId]
  );
  if (own.rowCount === 0) return null;
  const vacancy = own.rows[0];

  const rub = await queryRead(
    `SELECT desired_type_weights AS weights FROM vacancy_rubrics WHERE vacancy_id = $1 LIMIT 1`,
    [vacancyId]
  );
  const weights =
    rub.rows?.[0]?.weights && Object.keys(rub.rows[0].weights).length ? rub.rows[0].weights : {};

  const rows = await queryRead(
    `SELECT
       c.id AS "candidateId",
       c.full_name AS name,
       ass.top_type AS "topType",
       ass.scores,
       ass.pipeline_stage AS "pipelineStage",
       ar.label AS "areaLabel",
       ass.created_at AS "createdAt"
     FROM assessments ass
     JOIN candidates c ON c.id = ass.candidate_id
     JOIN areas ar ON ar.id = ass.area_id
     WHERE ass.vacancy_id = $1
       ${!isAdmin ? 'AND ass.company_id = $2' : ''}
     ORDER BY ass.created_at DESC
     LIMIT 500`,
    !isAdmin ? [vacancyId, companyId] : [vacancyId]
  );

  const people = rows.rows.map((r) => {
    const fit = computeAreaScore010(r.scores, weights);
    return {
      candidateId: Number(r.candidateId),
      name: r.name,
      topType: r.topType,
      scores: normalizeScores(r.scores),
      pipelineStage: r.pipelineStage,
      areaLabel: r.areaLabel || '',
      vacancyFitScore010: fit.score010,
      vacancyFitLabel: fit.label,
      createdAt: r.createdAt,
    };
  });

  people.sort((a, b) => {
    const av = a.vacancyFitScore010;
    const bv = b.vacancyFitScore010;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });

  return { vacancy, people };
}

/**
 * @param {object} vacancy
 * @param {object[]} selectedPeople
 * @param {{ executiveNote?: string }} opts
 */
export function buildReportSnapshot(vacancy, selectedPeople, opts = {}) {
  const note = String(opts.executiveNote || '').trim().slice(0, 2000);
  return {
    generatedAt: new Date().toISOString(),
    vacancy: {
      id: Number(vacancy.id),
      title: vacancy.title,
      companyName: vacancy.companyName,
      positionsCount: Number(vacancy.positionsCount) || 1,
      status: vacancy.status,
    },
    executiveNote: note || null,
    candidates: selectedPeople.map((p) => ({
      name: p.name,
      topType: p.topType,
      scores: p.scores,
      pipelineStage: p.pipelineStage,
      areaLabel: p.areaLabel || '',
      vacancyFitScore010: p.vacancyFitScore010,
      vacancyFitLabel: p.vacancyFitLabel,
    })),
  };
}

/**
 * @returns {Promise<{ id: number, token: string, expiresAt: Date, snapshot: object }>}
 */
export async function createReportShare({
  vacancyId,
  companyId,
  userId,
  candidateIds,
  expiresInDays = DEFAULT_REPORT_EXPIRY_DAYS,
  executiveNote = '',
  title = null,
  isAdmin,
  sessionCompanyId,
}) {
  const days = REPORT_EXPIRY_DAYS.includes(Number(expiresInDays))
    ? Number(expiresInDays)
    : DEFAULT_REPORT_EXPIRY_DAYS;

  const ids = [...new Set((candidateIds || []).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n)))];
  if (!ids.length) {
    const err = new Error('NO_CANDIDATES');
    err.code = 'NO_CANDIDATES';
    throw err;
  }

  const source = await loadVacancyReportSource(vacancyId, {
    isAdmin,
    companyId: sessionCompanyId,
  });
  if (!source) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const idSet = new Set(ids);
  const selected = source.people.filter((p) => idSet.has(p.candidateId));
  if (!selected.length) {
    const err = new Error('NO_CANDIDATES');
    err.code = 'NO_CANDIDATES';
    throw err;
  }

  const snapshot = buildReportSnapshot(source.vacancy, selected, { executiveNote });
  const token = crypto.randomBytes(32).toString('hex');
  const reportTitle = String(title || source.vacancy.title || '').trim().slice(0, 200) || source.vacancy.title;

  const ins = await query(
    `INSERT INTO vacancy_report_shares (
       vacancy_id, company_id, token, title, executive_note, snapshot,
       active, expires_at, created_by_user_id
     ) VALUES (
       $1, $2, $3, $4, $5, $6::jsonb,
       TRUE, NOW() + ($7::text || ' days')::interval, $8
     )
     RETURNING id, token, expires_at AS "expiresAt", snapshot`,
    [
      vacancyId,
      companyId ?? source.vacancy.companyId,
      token,
      reportTitle,
      snapshot.executiveNote,
      JSON.stringify(snapshot),
      String(days),
      userId || null,
    ]
  );

  return ins.rows[0];
}

export async function listReportShares(vacancyId, { isAdmin, companyId }) {
  const r = await queryRead(
    `SELECT
       s.id,
       s.title,
       s.token,
       s.active,
       s.expires_at AS "expiresAt",
       s.created_at AS "createdAt",
       s.executive_note AS "executiveNote",
       jsonb_array_length(COALESCE(s.snapshot->'candidates', '[]'::jsonb)) AS "candidateCount",
       (s.active AND s.expires_at > NOW()) AS "isLive"
     FROM vacancy_report_shares s
     JOIN vacancies v ON v.id = s.vacancy_id AND v.deleted = FALSE
     WHERE s.vacancy_id = $1
       ${!isAdmin ? 'AND s.company_id = $2 AND v.company_id = $2' : ''}
     ORDER BY s.created_at DESC
     LIMIT 50`,
    !isAdmin ? [vacancyId, companyId] : [vacancyId]
  );
  return r.rows;
}

export async function revokeReportShare(vacancyId, reportId, { isAdmin, companyId }) {
  const r = await query(
    `UPDATE vacancy_report_shares s
     SET active = FALSE, updated_at = NOW()
     FROM vacancies v
     WHERE s.id = $1
       AND s.vacancy_id = $2
       AND v.id = s.vacancy_id
       AND v.deleted = FALSE
       ${!isAdmin ? 'AND s.company_id = $3 AND v.company_id = $3' : ''}
     RETURNING s.id`,
    !isAdmin ? [reportId, vacancyId, companyId] : [reportId, vacancyId]
  );
  return r.rowCount > 0;
}

/**
 * Public fetch — active + not expired.
 */
export async function getReportByToken(token) {
  const raw = String(token || '').trim();
  if (!raw || raw.length < 32) return null;

  const r = await queryRead(
    `SELECT
       s.id,
       s.title,
       s.snapshot,
       s.expires_at AS "expiresAt",
       s.created_at AS "createdAt",
       s.executive_note AS "executiveNote"
     FROM vacancy_report_shares s
     JOIN vacancies v ON v.id = s.vacancy_id AND v.deleted = FALSE
     JOIN companies c ON c.id = s.company_id AND c.deleted = FALSE
     WHERE s.token = $1
       AND s.active = TRUE
       AND s.expires_at > NOW()
     LIMIT 1`,
    [raw]
  );
  if (r.rowCount === 0) return null;
  return r.rows[0];
}

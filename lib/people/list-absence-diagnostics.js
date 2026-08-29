/**
 * B-2601 — Diagnóstico “por que não vejo X?” (Equipe).
 * Read-only, tenant-scoped, capped. No LLM / no generated SQL.
 */

import { queryRead } from '../db.js';
import {
  EMPLOYMENT_STATUS,
  ROSTER_SCOPE,
  ROSTER_SCOPE_SET,
} from '../domain-status.js';

export const ABSENCE_DIAG_CAP = 12;
export const ABSENCE_DIAG_Q_MIN = 1;
export const ABSENCE_DIAG_Q_MAX = 80;

export const ABSENCE_REASON = Object.freeze({
  NO_MATCH: 'no_match',
  HOMONYMS: 'homonyms',
  WRONG_ROSTER: 'wrong_roster',
  ALUMNI: 'alumni',
  SOFT_FILTERS: 'soft_filters',
  NO_ASSESSMENT: 'no_assessment',
});

export const ABSENCE_SUGGESTION = Object.freeze({
  CLEAR_SEARCH: 'clear_search',
  SWITCH_ROSTER: 'switch_roster',
  CLEAR_FILTERS: 'clear_filters',
  OPEN_PERSON: 'open_person',
});

/**
 * Classify whether a candidate row would appear under a roster scope
 * (mirrors assessmentListWhereParts roster rules for a single person).
 *
 * @param {{ employmentStatus: string, hasCompanyAssessment: boolean, hasVacancyAssessment: boolean }} row
 * @param {string} rosterScope
 */
export function classifyRosterVisibility(row, rosterScope) {
  const roster = ROSTER_SCOPE_SET.has(rosterScope) ? rosterScope : ROSTER_SCOPE.INTERNAL;
  const isInternalPerson =
    row.employmentStatus === EMPLOYMENT_STATUS.EMPLOYEE
    || row.employmentStatus === EMPLOYMENT_STATUS.ALUMNI;
  const inInternal =
    Boolean(row.hasCompanyAssessment) || (Boolean(row.hasVacancyAssessment) && isInternalPerson);
  const inRecruiting = Boolean(row.hasVacancyAssessment);

  if (roster === ROSTER_SCOPE.ALL) {
    return { visible: inInternal || inRecruiting, inInternal, inRecruiting };
  }
  if (roster === ROSTER_SCOPE.RECRUITING) {
    return { visible: inRecruiting, inInternal, inRecruiting };
  }
  return { visible: inInternal, inInternal, inRecruiting };
}

/**
 * Build structured reasons + suggestions from DB rows (pure; unit-testable).
 *
 * @param {object} opts
 * @param {string} opts.q
 * @param {string} [opts.rosterScope]
 * @param {string|null} [opts.listFilter]
 * @param {string|null} [opts.pipelineStage]
 * @param {Array<object>} opts.rows
 */
export function buildAbsenceDiagnostics({
  q,
  rosterScope = ROSTER_SCOPE.INTERNAL,
  listFilter = null,
  pipelineStage = null,
  rows = [],
}) {
  const needle = String(q || '').trim();
  const roster = ROSTER_SCOPE_SET.has(rosterScope) ? rosterScope : ROSTER_SCOPE.INTERNAL;
  const softActive = Boolean(listFilter) || (pipelineStage && pipelineStage !== 'all');

  /** @type {Array<{ code: string, meta?: object }>} */
  const reasons = [];
  /** @type {Array<{ action: string, roster?: string, candidateId?: number }>} */
  const suggestions = [];
  /** @type {Array<object>} */
  const candidates = [];

  if (!rows.length) {
    reasons.push({ code: ABSENCE_REASON.NO_MATCH });
    suggestions.push({ action: ABSENCE_SUGGESTION.CLEAR_SEARCH });
    if (softActive) {
      reasons.push({ code: ABSENCE_REASON.SOFT_FILTERS, meta: { listFilter, pipelineStage } });
      suggestions.push({ action: ABSENCE_SUGGESTION.CLEAR_FILTERS });
    }
    return { reasons, suggestions, candidates };
  }

  if (rows.length > 1) {
    reasons.push({ code: ABSENCE_REASON.HOMONYMS, meta: { count: rows.length } });
  }

  let anyVisibleUnderRoster = false;
  let anyWrongRoster = false;
  let anyAlumni = false;
  let anyNoAssessment = false;
  let suggestedOtherRoster = null;

  for (const row of rows) {
    const vis = classifyRosterVisibility(row, roster);
    const hasAnyAssessment = row.hasCompanyAssessment || row.hasVacancyAssessment;
    if (!hasAnyAssessment) anyNoAssessment = true;
    if (vis.visible && hasAnyAssessment) anyVisibleUnderRoster = true;
    if (!vis.visible && hasAnyAssessment) {
      anyWrongRoster = true;
      if (roster === ROSTER_SCOPE.INTERNAL && vis.inRecruiting) {
        suggestedOtherRoster = ROSTER_SCOPE.RECRUITING;
      } else if (roster === ROSTER_SCOPE.RECRUITING && vis.inInternal) {
        suggestedOtherRoster = ROSTER_SCOPE.INTERNAL;
      } else if (roster !== ROSTER_SCOPE.ALL) {
        suggestedOtherRoster = ROSTER_SCOPE.ALL;
      }
    }
    if (row.employmentStatus === EMPLOYMENT_STATUS.ALUMNI) anyAlumni = true;

    candidates.push({
      id: row.id,
      name: row.fullName,
      email: row.email || null,
      employmentStatus: row.employmentStatus,
      assessmentId: row.latestAssessmentId || null,
      visibleInRoster: vis.visible && hasAnyAssessment,
      inInternal: vis.inInternal,
      inRecruiting: vis.inRecruiting,
      hasAssessment: hasAnyAssessment,
    });
  }

  if (anyNoAssessment) {
    reasons.push({ code: ABSENCE_REASON.NO_ASSESSMENT });
  }
  if (anyWrongRoster) {
    reasons.push({
      code: ABSENCE_REASON.WRONG_ROSTER,
      meta: { currentRoster: roster, suggestedRoster: suggestedOtherRoster },
    });
  }
  if (anyAlumni) {
    reasons.push({ code: ABSENCE_REASON.ALUMNI });
  }
  if (softActive && (anyVisibleUnderRoster || anyWrongRoster)) {
    reasons.push({
      code: ABSENCE_REASON.SOFT_FILTERS,
      meta: { listFilter, pipelineStage },
    });
  }

  // If people match but none visible under roster → switch roster / clear filters
  if (anyWrongRoster && suggestedOtherRoster) {
    suggestions.push({
      action: ABSENCE_SUGGESTION.SWITCH_ROSTER,
      roster: suggestedOtherRoster,
    });
  }
  if (softActive) {
    suggestions.push({ action: ABSENCE_SUGGESTION.CLEAR_FILTERS });
  }
  suggestions.push({ action: ABSENCE_SUGGESTION.CLEAR_SEARCH });

  const openable = candidates.find((c) => c.id && (c.visibleInRoster || c.hasAssessment || c.inInternal || c.inRecruiting));
  if (openable) {
    suggestions.push({
      action: ABSENCE_SUGGESTION.OPEN_PERSON,
      candidateId: openable.id,
    });
  }

  // Deduplicate suggestion actions (keep first)
  const seen = new Set();
  const deduped = [];
  for (const s of suggestions) {
    const key = `${s.action}:${s.roster || ''}:${s.candidateId || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
  }

  return {
    reasons,
    suggestions: deduped,
    candidates: candidates.slice(0, ABSENCE_DIAG_CAP),
    query: needle,
    roster,
  };
}

/**
 * @param {object} opts
 * @param {number} opts.companyId
 * @param {string} opts.q
 * @param {string} [opts.rosterScope]
 * @param {string|null} [opts.listFilter]
 * @param {string|null} [opts.pipelineStage]
 * @param {number} [opts.limit]
 */
export async function diagnoseListAbsence({
  companyId,
  q,
  rosterScope = ROSTER_SCOPE.INTERNAL,
  listFilter = null,
  pipelineStage = null,
  limit = ABSENCE_DIAG_CAP,
}) {
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return buildAbsenceDiagnostics({ q, rosterScope, listFilter, pipelineStage, rows: [] });
  }

  const needle = String(q || '').trim().slice(0, ABSENCE_DIAG_Q_MAX);
  if (needle.length < ABSENCE_DIAG_Q_MIN) {
    return buildAbsenceDiagnostics({ q: needle, rosterScope, listFilter, pipelineStage, rows: [] });
  }

  const cap = Math.min(Math.max(1, Number(limit) || ABSENCE_DIAG_CAP), ABSENCE_DIAG_CAP);
  const like = `%${needle}%`;

  const res = await queryRead(
    `SELECT c.id,
            c.full_name AS "fullName",
            c.email,
            c.employment_status AS "employmentStatus",
            EXISTS (
              SELECT 1 FROM assessments a
              WHERE a.candidate_id = c.id
                AND a.company_id = c.company_id
                AND a.vacancy_id IS NULL
            ) AS "hasCompanyAssessment",
            EXISTS (
              SELECT 1 FROM assessments a
              WHERE a.candidate_id = c.id
                AND a.company_id = c.company_id
                AND a.vacancy_id IS NOT NULL
            ) AS "hasVacancyAssessment",
            (
              SELECT a.id FROM assessments a
              WHERE a.candidate_id = c.id AND a.company_id = c.company_id
              ORDER BY a.created_at DESC NULLS LAST, a.id DESC
              LIMIT 1
            ) AS "latestAssessmentId"
     FROM candidates c
     WHERE c.company_id = $1
       AND (c.full_name ILIKE $2 OR (c.email IS NOT NULL AND c.email ILIKE $2))
     ORDER BY c.full_name ASC NULLS LAST, c.id ASC
     LIMIT $3`,
    [cid, like, cap]
  );

  const rows = (res.rows || []).map((r) => ({
    id: Number(r.id),
    fullName: r.fullName,
    email: r.email || null,
    employmentStatus: r.employmentStatus,
    hasCompanyAssessment: Boolean(r.hasCompanyAssessment),
    hasVacancyAssessment: Boolean(r.hasVacancyAssessment),
    latestAssessmentId: r.latestAssessmentId != null ? Number(r.latestAssessmentId) : null,
  }));

  return buildAbsenceDiagnostics({
    q: needle,
    rosterScope,
    listFilter,
    pipelineStage,
    rows,
  });
}

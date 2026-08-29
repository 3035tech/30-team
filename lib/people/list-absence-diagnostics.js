/**
 * B-2601 — Diagnóstico “por que não vejo X?” (Equipe).
 * Read-only, tenant-scoped, capped. No LLM / no generated SQL.
 *
 * Pure helpers: list-absence-diagnostics-core.js (client-safe).
 * This file adds the Postgres lookup (server / API only).
 */

import { queryRead } from '../db.js';
import { ROSTER_SCOPE } from '../domain-status.js';
import {
  ABSENCE_DIAG_CAP,
  ABSENCE_DIAG_Q_MAX,
  ABSENCE_DIAG_Q_MIN,
  buildAbsenceDiagnostics,
} from './list-absence-diagnostics-core.js';

export {
  ABSENCE_DIAG_CAP,
  ABSENCE_DIAG_Q_MIN,
  ABSENCE_DIAG_Q_MAX,
  ABSENCE_REASON,
  ABSENCE_SUGGESTION,
  buildAbsenceDiagnostics,
  classifyRosterVisibility,
} from './list-absence-diagnostics-core.js';

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

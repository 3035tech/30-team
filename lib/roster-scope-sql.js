/**
 * Roster scope → SQL predicate. Pure (constants only) so Node-only loaders can import it
 * without pulling permissions via assessment-filters.
 */
import { EMPLOYMENT_STATUS, ROSTER_SCOPE, ROSTER_SCOPE_SET } from './domain-status.js';

/**
 * Roster scope as one SQL predicate over `ass` (assessments alias); null = no restriction.
 * Internal = company-link assessments or current employees, never alumni.
 * Shared by the dashboard list and behavioral intel so both agree on who is "the team".
 * @param {string} rosterScope
 * @returns {string | null}
 */
export function rosterScopeSqlPart(rosterScope) {
  const roster = ROSTER_SCOPE_SET.has(rosterScope) ? rosterScope : ROSTER_SCOPE.INTERNAL;
  if (roster === ROSTER_SCOPE.RECRUITING) return `ass.vacancy_id IS NOT NULL`;
  if (roster === ROSTER_SCOPE.ALUMNI) {
    return `EXISTS (
      SELECT 1 FROM candidates cx
      WHERE cx.id = ass.candidate_id
        AND cx.employment_status = '${EMPLOYMENT_STATUS.ALUMNI}'
    )`;
  }
  if (roster === ROSTER_SCOPE.INTERNAL) {
    return `(
      (
        ass.vacancy_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM candidates cx
          WHERE cx.id = ass.candidate_id
            AND cx.employment_status = '${EMPLOYMENT_STATUS.ALUMNI}'
        )
      )
      OR EXISTS (
        SELECT 1 FROM candidates cx
        WHERE cx.id = ass.candidate_id
          AND cx.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
      )
    )`;
  }
  return null;
}

/**
 * Shared domain status / scope string constants (not TypeScript enums).
 * Prefer these over ad-hoc 'employee' / 'open' / 'internal' literals.
 *
 * Agents: AGENTS.md § "Constantes de domínio" + `.cursor/rules/domain-constants.mdc`.
 * Extend this file when adding a new closed status set; do not invent parallel maps in routes/tabs.
 */

export const EMPLOYMENT_STATUS = Object.freeze({
  CANDIDATE: 'candidate',
  EMPLOYEE: 'employee',
  ALUMNI: 'alumni',
});

export const EMPLOYMENT_STATUS_INTERNAL = Object.freeze([
  EMPLOYMENT_STATUS.EMPLOYEE,
  EMPLOYMENT_STATUS.ALUMNI,
]);

export const VACANCY_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
});

export const CLIMATE_SURVEY_STATUS = Object.freeze({
  DRAFT: 'draft',
  OPEN: 'open',
  CLOSED: 'closed',
});

export const PERFORMANCE_CYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
});

export const PERFORMANCE_REVIEW_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
});

export const ROSTER_SCOPE = Object.freeze({
  INTERNAL: 'internal',
  RECRUITING: 'recruiting',
  ALL: 'all',
});

export const ROSTER_SCOPE_SET = new Set(Object.values(ROSTER_SCOPE));

export const DEVELOPMENT_PLAN_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

export const DEVELOPMENT_PLAN_ITEM_STATUS = Object.freeze({
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
});

export const TEAM_PULSE_STATUS = Object.freeze({
  DRAFT: 'draft',
  OPEN: 'open',
  CLOSED: 'closed',
});

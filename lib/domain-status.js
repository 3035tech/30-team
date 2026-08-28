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

/** Internal RH compensation event (not payroll). */
export const COMPENSATION_EVENT_TYPE = Object.freeze({
  HIRE: 'hire',
  RAISE: 'raise',
  ADJUSTMENT: 'adjustment',
  BONUS: 'bonus',
  OTHER: 'other',
});

export const COMPENSATION_EVENT_TYPES = Object.freeze(Object.values(COMPENSATION_EVENT_TYPE));

/** Exit analysis — type of departure (universal; keep small) */
export const EXIT_TYPE = Object.freeze({
  VOLUNTARY: 'voluntary',
  INVOLUNTARY: 'involuntary',
  MUTUAL: 'mutual',
});

export const EXIT_TYPES = Object.freeze(Object.values(EXIT_TYPE));

/**
 * Exit analysis — primary reason codes (closed taxonomy for insights).
 * Covers tech, serviços, indústria, varejo, saúde e contexto BR sem cadastro livre.
 */
export const EXIT_REASON = Object.freeze({
  BETTER_OFFER: 'better_offer',
  CAREER_GROWTH: 'career_growth',
  COMPENSATION: 'compensation',
  BENEFITS: 'benefits',
  WORK_LIFE_BALANCE: 'work_life_balance',
  BURNOUT: 'burnout',
  WORKLOAD: 'workload',
  RELOCATION: 'relocation',
  COMMUTE: 'commute',
  SCHEDULE: 'schedule',
  PERSONAL: 'personal',
  FAMILY_CARE: 'family_care',
  HEALTH: 'health',
  STUDY: 'study',
  PUBLIC_EXAM: 'public_exam',
  ENTREPRENEURSHIP: 'entrepreneurship',
  PERFORMANCE: 'performance',
  CONDUCT: 'conduct',
  HARASSMENT: 'harassment',
  RESTRUCTURING: 'restructuring',
  LAYOFF: 'layoff',
  POSITION_ELIMINATED: 'position_eliminated',
  CONTRACT_END: 'contract_end',
  SEASONAL_END: 'seasonal_end',
  RETIREMENT: 'retirement',
  CULTURE_FIT: 'culture_fit',
  MANAGER_RELATIONSHIP: 'manager_relationship',
  RECOGNITION: 'recognition',
  LACK_OF_CHALLENGE: 'lack_of_challenge',
  TARGETS_PRESSURE: 'targets_pressure',
  CLIENT_PRESSURE: 'client_pressure',
  TOOLS_PROCESS: 'tools_process',
  OTHER: 'other',
});

export const EXIT_REASONS = Object.freeze(Object.values(EXIT_REASON));

/**
 * Company benefits — indicative type codes (closed; categories stay company-cadastral).
 * Broad enough for tech, indústria, varejo, saúde e serviços.
 */
export const BENEFIT_TYPE = Object.freeze({
  HEALTH: 'health',
  DENTAL: 'dental',
  VISION: 'vision',
  MENTAL_HEALTH: 'mental_health',
  LIFE_INSURANCE: 'life_insurance',
  RETIREMENT: 'retirement',
  PROFIT_SHARING: 'profit_sharing',
  EQUITY: 'equity',
  VACATION: 'vacation',
  PARENTAL_LEAVE: 'parental_leave',
  SABBATICAL: 'sabbatical',
  FLEXIBLE_HOURS: 'flexible_hours',
  REMOTE_WORK: 'remote_work',
  HOME_OFFICE_ALLOWANCE: 'home_office_allowance',
  GYM: 'gym',
  WELLNESS: 'wellness',
  MEAL_VOUCHER: 'meal_voucher',
  FOOD_BASKET: 'food_basket',
  TRANSPORT_VOUCHER: 'transport_voucher',
  PARKING: 'parking',
  MOBILITY: 'mobility',
  PHONE: 'phone',
  EDUCATION: 'education',
  LANGUAGE: 'language',
  DAYCARE: 'daycare',
  LEGAL_AID: 'legal_aid',
  UNIFORM: 'uniform',
  PET: 'pet',
  OTHER: 'other',
});

export const BENEFIT_TYPES = Object.freeze(Object.values(BENEFIT_TYPE));

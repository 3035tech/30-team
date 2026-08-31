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

/** B-2704: self/peer side review via token. */
export const SIDE_REVIEW_ROLE = Object.freeze({
  SELF: 'self',
  PEER: 'peer',
});

export const SIDE_REVIEW_STATUS = Object.freeze({
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  EXPIRED: 'expired',
});

/** B-2705: light + formal experience outcomes on onboarding check-ins. */
export const ONBOARDING_CHECKIN_OUTCOME = Object.freeze({
  CONTINUE: 'continue',
  DEVELOP: 'develop',
  CONCERN: 'concern',
  PASS: 'pass',
  FAIL: 'fail',
  EXTEND: 'extend',
  TERMINATE: 'terminate',
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

/** B-3003: variable pay / bonus workflow (not payroll). */
export const COMPENSATION_APPROVAL_STATUS = Object.freeze({
  PROPOSED: 'proposed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const COMPENSATION_APPROVAL_STATUSES = Object.freeze(
  Object.values(COMPENSATION_APPROVAL_STATUS)
);

/** B-3004 light OKR objective levels. */
export const OKR_OBJECTIVE_LEVEL = Object.freeze({
  COMPANY: 'company',
  TEAM: 'team',
  PERSON: 'person',
});

export const OKR_OBJECTIVE_LEVELS = Object.freeze(Object.values(OKR_OBJECTIVE_LEVEL));

/** OKR phase 1: cycle status. */
export const OKR_CYCLE_STATUS = Object.freeze({
  ACTIVE: 'active',
  CLOSED: 'closed',
});

export const OKR_CYCLE_STATUSES = Object.freeze(Object.values(OKR_CYCLE_STATUS));

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

/** Manager → product team feedback kinds. */
export const PRODUCT_FEEDBACK_KIND = Object.freeze({
  IDEA: 'idea',
  BUG: 'bug',
  UX: 'ux',
});

export const PRODUCT_FEEDBACK_KINDS = Object.freeze(Object.values(PRODUCT_FEEDBACK_KIND));

/** Super-admin inbox status for product_feedback. */
export const PRODUCT_FEEDBACK_STATUS = Object.freeze({
  NEW: 'new',
  REVIEWING: 'reviewing',
  DONE: 'done',
  DISMISSED: 'dismissed',
});

export const PRODUCT_FEEDBACK_STATUSES = Object.freeze(Object.values(PRODUCT_FEEDBACK_STATUS));

/** DP leve: checklist documental (não eSocial / GED jurídico). */
export const DP_DOCUMENT_KEY = Object.freeze({
  ID_DOCUMENT: 'id_document',
  CONTRACT: 'contract',
  ASO: 'aso',
  ADDRESS_PROOF: 'address_proof',
  BANK_DATA: 'bank_data',
  DEPENDENTS: 'dependents',
  OTHER: 'other',
});

export const DP_DOCUMENT_KEYS = Object.freeze(Object.values(DP_DOCUMENT_KEY));

export const DP_DOCUMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  RECEIVED: 'received',
  WAIVED: 'waived',
});

export const DP_DOCUMENT_STATUSES = Object.freeze(Object.values(DP_DOCUMENT_STATUS));

/** B-2724: internal admission acknowledgment (not ICP / partner e-sign). */
export const DP_DOCUMENT_SIGNATURE_STATUS = Object.freeze({
  NONE: 'none',
  REQUESTED: 'requested',
  SIGNED: 'signed',
  WAIVED: 'waived',
});

export const DP_DOCUMENT_SIGNATURE_STATUSES = Object.freeze(
  Object.values(DP_DOCUMENT_SIGNATURE_STATUS)
);

/** DP leve: férias / afastamentos. */
export const DP_LEAVE_TYPE = Object.freeze({
  VACATION: 'vacation',
  SICK: 'sick',
  PARENTAL: 'parental',
  BEREAVEMENT: 'bereavement',
  MARRIAGE: 'marriage',
  MEDICAL_APPOINTMENT: 'medical_appointment',
  COMPENSATORY: 'compensatory',
  UNPAID: 'unpaid',
  OTHER: 'other',
});

export const DP_LEAVE_TYPES = Object.freeze(Object.values(DP_LEAVE_TYPE));

export const DP_LEAVE_STATUS = Object.freeze({
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  TAKEN: 'taken',
});

export const DP_LEAVE_STATUSES = Object.freeze(Object.values(DP_LEAVE_STATUS));

/** B-2721: time punch kind (in/out only in MVP). */
export const TIME_PUNCH_KIND = Object.freeze({
  IN: 'in',
  OUT: 'out',
});

export const TIME_PUNCH_KINDS = Object.freeze(Object.values(TIME_PUNCH_KIND));

export const TIME_PUNCH_SOURCE = Object.freeze({
  WEB: 'web',
  MANAGER: 'manager',
});

export const TIME_PUNCH_SOURCES = Object.freeze(Object.values(TIME_PUNCH_SOURCE));

export const TIME_PUNCH_FLAG = Object.freeze({
  LATE: 'late',
  EARLY_OUT: 'early_out',
  ODD_PAIR: 'odd_pair',
  MANUAL: 'manual',
});

export const TIME_PUNCH_FLAGS = Object.freeze(Object.values(TIME_PUNCH_FLAG));

export const TIME_PUNCH_REVIEW = Object.freeze({
  NONE: 'none',
  OK: 'ok',
  FLAGGED: 'flagged',
  ADJUSTED: 'adjusted',
});

export const TIME_PUNCH_REVIEWS = Object.freeze(Object.values(TIME_PUNCH_REVIEW));

/** B-2722: hour bank ledger. */
export const HOUR_BANK_ENTRY_KIND = Object.freeze({
  CREDIT: 'credit',
  DEBIT: 'debit',
});

export const HOUR_BANK_ENTRY_KINDS = Object.freeze(Object.values(HOUR_BANK_ENTRY_KIND));

export const HOUR_BANK_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const HOUR_BANK_STATUSES = Object.freeze(Object.values(HOUR_BANK_STATUS));

export const HOUR_BANK_SOURCE = Object.freeze({
  MANUAL: 'manual',
  TIME_CLOCK: 'time_clock',
  EMPLOYEE: 'employee',
});

export const HOUR_BANK_SOURCES = Object.freeze(Object.values(HOUR_BANK_SOURCE));

/** B-3005: whistleblowing / ouvidoria categories (closed set). */
export const WHISTLEBLOWING_CATEGORY = Object.freeze({
  HARASSMENT: 'harassment',
  ETHICS: 'ethics',
  SAFETY: 'safety',
  DISCRIMINATION: 'discrimination',
  FRAUD: 'fraud',
  OTHER: 'other',
});

export const WHISTLEBLOWING_CATEGORIES = Object.freeze(Object.values(WHISTLEBLOWING_CATEGORY));

export const WHISTLEBLOWING_REPORT_STATUS = Object.freeze({
  NEW: 'new',
  TRIAGING: 'triaging',
  RESPONDED: 'responded',
  CLOSED: 'closed',
});

export const WHISTLEBLOWING_REPORT_STATUSES = Object.freeze(
  Object.values(WHISTLEBLOWING_REPORT_STATUS)
);

/** B-3010: continuous feedback request lifecycle. */
export const FEEDBACK_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  ANSWERED: 'answered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

export const FEEDBACK_REQUEST_STATUSES = Object.freeze(Object.values(FEEDBACK_REQUEST_STATUS));

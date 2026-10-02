/**
 * Field-level change list for audit_log.metadata.changes (LGPD: minimization).
 * Only operational/security fields carry from/to; personal data is recorded as "changed" only.
 */

/**
 * Candidate fields whose previous/new values are kept in the audit trail.
 * Corporate e-mail is left out: candidate.email_change already records it (security trail).
 */
export const CANDIDATE_AUDIT_VALUE_FIELDS = Object.freeze([
  'employeeNumber', 'workFormat', 'timeClockOverride',
]);

/** Candidate personal data: audited as "changed" without values. */
export const CANDIDATE_AUDIT_PRESENCE_FIELDS = Object.freeze([
  'fullName', 'personalEmail', 'maritalStatus', 'workHistory', 'hrNotes', 'phone', 'linkedinUrl',
  'city', 'state', 'salaryExpectation', 'availability', 'source', 'birthDate', 'startDate',
]);

/** DP profile (candidate_dp_profiles): all personal data, presence only. */
export const DP_AUDIT_PRESENCE_FIELDS = Object.freeze([
  'emergencyName', 'emergencyPhone', 'emergencyRelation', 'cpf', 'rg', 'dependents',
  'addressLine', 'addressNumber', 'addressCity', 'addressState', 'addressPostal', 'internalNotes',
]);

/** Compared by digits only, so storage reformatting (01310-100 → 01310100) is not a change. */
const DIGIT_FIELDS = new Set(['cpf', 'addressPostal', 'emergencyPhone', 'phone']);

export const USER_AUDIT_VALUE_FIELDS = Object.freeze(['email', 'role', 'active', 'companyId', 'modules']);

function comparable(field, value) {
  const v = normalize(value);
  if (v !== null && DIGIT_FIELDS.has(field)) return String(v).replace(/\D/g, '') || null;
  return v;
}

function normalize(value) {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : null;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  return value;
}

function display(value) {
  if (Array.isArray(value)) return value.length ? value.slice(0, 50).map((item) => String(item).slice(0, 60)) : null;
  const v = normalize(value);
  if (v === null || typeof v === 'boolean' || typeof v === 'number') return v;
  return String(v).slice(0, 200);
}

/**
 * @param {object|null|undefined} before
 * @param {object|null|undefined} after
 * @param {{ valueFields?: readonly string[], presenceFields?: readonly string[] }} spec
 * @returns {Array<{ field: string, from?: unknown, to?: unknown }>}
 */
export function diffAuditFields(before, after, { valueFields = [], presenceFields = [] } = {}) {
  const prev = before || {};
  const next = after || {};
  const changes = [];
  for (const field of valueFields) {
    if (String(comparable(field, prev[field])) !== String(comparable(field, next[field]))) {
      changes.push({ field, from: display(prev[field]), to: display(next[field]) });
    }
  }
  for (const field of presenceFields) {
    if (String(comparable(field, prev[field])) !== String(comparable(field, next[field]))) changes.push({ field });
  }
  return changes;
}

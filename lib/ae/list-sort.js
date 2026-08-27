/**
 * Safe ORDER BY fragments for AE admin listagens (whitelist only).
 */

const DIR = new Set(['asc', 'desc']);

function normalizeDir(raw, fallback = 'desc') {
  const d = String(raw || '').toLowerCase();
  return DIR.has(d) ? d : fallback;
}

const INVITE_SORT = Object.freeze({
  candidateName: 'i.candidate_name',
  status: 'i.status',
  sentAt: 'i.sent_at',
  expiresAt: 'i.expires_at',
  createdAt: 'i.created_at',
});

const ATTEMPT_SORT = Object.freeze({
  candidateName: 'c.full_name',
  completedAt: 'a.completed_at',
  startedAt: 'a.started_at',
  companyName: 'co.name',
});

/**
 * @param {string|null|undefined} sort
 * @param {string|null|undefined} sortDir
 * @returns {string} SQL ORDER BY clause (without ORDER BY keyword)
 */
export function sqlAeInvitesOrderBy(sort, sortDir) {
  const col = INVITE_SORT[String(sort || '')] || INVITE_SORT.createdAt;
  const dir = normalizeDir(sortDir, col === INVITE_SORT.candidateName || col === INVITE_SORT.status ? 'asc' : 'desc');
  if (col === INVITE_SORT.createdAt) return `${col} ${dir.toUpperCase()}`;
  return `${col} ${dir.toUpperCase()} NULLS LAST, i.created_at DESC`;
}

/**
 * @param {string|null|undefined} sort
 * @param {string|null|undefined} sortDir
 */
export function sqlAeAttemptsOrderBy(sort, sortDir) {
  const col = ATTEMPT_SORT[String(sort || '')] || ATTEMPT_SORT.completedAt;
  const dir = normalizeDir(sortDir, col === ATTEMPT_SORT.candidateName || col === ATTEMPT_SORT.companyName ? 'asc' : 'desc');
  if (col === ATTEMPT_SORT.completedAt) {
    return `${col} ${dir.toUpperCase()} NULLS LAST, a.started_at DESC`;
  }
  return `${col} ${dir.toUpperCase()} NULLS LAST, a.completed_at DESC NULLS LAST`;
}

export const AE_INVITE_SORT_KEYS = Object.freeze(Object.keys(INVITE_SORT));
export const AE_ATTEMPT_SORT_KEYS = Object.freeze(Object.keys(ATTEMPT_SORT));

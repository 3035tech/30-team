/**
 * Batch Motivators invites for internal team (B-411).
 * Reuses createAndQueueMotivatorsInvite; caps + email dedupe + skip open/completed.
 */

import { createAndQueueMotivatorsInvite, isValidInviteEmail } from './create-motivators-invite.js';
import { ERR } from '../api-error-codes.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';

export const BATCH_INVITE_CAP = 25;
export const ROSTER_LIST_CAP = 100;

/**
 * Internal roster: employee/alumni OR company-link assessment (no vacancy).
 * @returns {Promise<{
 *   items: Array<{
 *     candidateId: number,
 *     name: string,
 *     email: string,
 *     eligible: boolean,
 *     skipReason: null|'no_email'|'open_invite'|'completed',
 *   }>,
 *   eligibleCount: number,
 *   total: number,
 * }>}
 */
export async function listInternalMotivatorsInviteRoster(dbQuery, { companyId }) {
  const cid = Number(companyId);
  if (!Number.isFinite(cid)) {
    return { items: [], eligibleCount: 0, total: 0 };
  }

  const people = await dbQuery(
    `SELECT c.id AS "candidateId",
            c.full_name AS name,
            LOWER(BTRIM(c.email)) AS email
     FROM candidates c
     WHERE c.company_id = $1
       AND (
         c.employment_status IN ('${EMPLOYMENT_STATUS.EMPLOYEE}', '${EMPLOYMENT_STATUS.ALUMNI}')
         OR EXISTS (
           SELECT 1 FROM assessments a
           WHERE a.candidate_id = c.id
             AND a.company_id = c.company_id
             AND a.vacancy_id IS NULL
         )
       )
     ORDER BY c.full_name ASC NULLS LAST, c.id ASC
     LIMIT $2`,
    [cid, ROSTER_LIST_CAP]
  );

  if (!people.rowCount) {
    return { items: [], eligibleCount: 0, total: 0 };
  }

  const emails = people.rows
    .map((r) => r.email)
    .filter((e) => e && isValidInviteEmail(e));

  const openByEmail = new Set();
  const completedByCandidate = new Set();
  const completedByEmail = new Set();

  if (emails.length > 0) {
    const open = await dbQuery(
      `SELECT LOWER(BTRIM(i.candidate_email)) AS email
       FROM ae_invites i
       JOIN ae_definitions d ON d.id = i.definition_id AND LOWER(d.slug) = 'motivators'
       WHERE i.company_id = $1
         AND i.status IN ('sent', 'opened')
         AND (i.expires_at IS NULL OR i.expires_at > NOW())
         AND LOWER(BTRIM(i.candidate_email)) = ANY($2::text[])`,
      [cid, emails]
    );
    for (const row of open.rows) {
      if (row.email) openByEmail.add(row.email);
    }
  }

  const ids = people.rows.map((r) => r.candidateId);
  const done = await dbQuery(
    `SELECT a.candidate_id AS "candidateId",
            LOWER(BTRIM(c.email)) AS email
     FROM ae_attempts a
     JOIN ae_definitions d ON d.id = a.definition_id AND LOWER(d.slug) = 'motivators'
     JOIN candidates c ON c.id = a.candidate_id
     WHERE a.company_id = $1
       AND a.status = 'completed'
       AND a.candidate_id = ANY($2::bigint[])`,
    [cid, ids]
  );
  for (const row of done.rows) {
    if (row.candidateId != null) completedByCandidate.add(Number(row.candidateId));
    if (row.email) completedByEmail.add(row.email);
  }

  const seenEmail = new Set();
  const items = [];
  let eligibleCount = 0;

  for (const row of people.rows) {
    const email = row.email || '';
    let skipReason = null;
    if (!email || !isValidInviteEmail(email)) {
      skipReason = 'no_email';
    } else if (seenEmail.has(email)) {
      skipReason = 'open_invite'; // treat duplicate email in roster as non-selectable
    } else if (openByEmail.has(email)) {
      skipReason = 'open_invite';
    } else if (
      completedByCandidate.has(Number(row.candidateId)) || completedByEmail.has(email)
    ) {
      skipReason = 'completed';
    }

    if (!skipReason && email) seenEmail.add(email);
    const eligible = !skipReason;
    if (eligible) eligibleCount += 1;

    items.push({
      candidateId: Number(row.candidateId),
      name: row.name || '',
      email,
      eligible,
      skipReason,
    });
  }

  return { items, eligibleCount, total: items.length };
}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   errorCode?: string,
 *   status?: number,
 *   sent: Array<{ candidateId: number, inviteId: number, email: string }>,
 *   skipped: Array<{ candidateId: number, reason: string }>,
 *   failed: Array<{ candidateId: number, errorCode: string }>,
 * }>}
 */
export async function batchCreateMotivatorsInvites(dbQuery, {
  companyId,
  candidateIds,
  createdByUserId = null,
  locale = 'pt-BR',
  appBaseUrl,
  definitionSlug = 'motivators',
  cap = BATCH_INVITE_CAP,
}) {
  const cid = Number(companyId);
  if (!Number.isFinite(cid)) {
    return { ok: false, errorCode: ERR.INVALID_COMPANY, status: 400, sent: [], skipped: [], failed: [] };
  }
  if (!appBaseUrl) {
    return { ok: false, errorCode: ERR.APP_URL_MISSING, status: 500, sent: [], skipped: [], failed: [] };
  }

  const rawIds = Array.isArray(candidateIds) ? candidateIds : [];
  const ids = [
    ...new Set(
      rawIds
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].slice(0, Math.min(BATCH_INVITE_CAP, Math.max(1, Number(cap) || BATCH_INVITE_CAP)));

  if (ids.length === 0) {
    return { ok: false, errorCode: ERR.NO_CANDIDATES, status: 400, sent: [], skipped: [], failed: [] };
  }

  const roster = await listInternalMotivatorsInviteRoster(dbQuery, { companyId: cid });
  const byId = new Map(roster.items.map((r) => [r.candidateId, r]));

  const sent = [];
  const skipped = [];
  const failed = [];
  const usedEmails = new Set();

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      skipped.push({ candidateId: id, reason: 'not_internal' });
      continue;
    }
    if (!row.eligible) {
      skipped.push({ candidateId: id, reason: row.skipReason || 'ineligible' });
      continue;
    }
    if (usedEmails.has(row.email)) {
      skipped.push({ candidateId: id, reason: 'duplicate_email' });
      continue;
    }
    usedEmails.add(row.email);

    const result = await createAndQueueMotivatorsInvite(dbQuery, {
      companyId: cid,
      candidateName: row.name || row.email,
      candidateEmail: row.email,
      candidateId: row.candidateId,
      createdByUserId,
      definitionSlug,
      locale,
      appBaseUrl,
    });

    if (!result.ok) {
      failed.push({ candidateId: id, errorCode: result.errorCode || 'INTERNAL' });
      continue;
    }
    sent.push({
      candidateId: id,
      inviteId: result.inviteId,
      email: result.sentTo,
    });
  }

  return { ok: true, sent, skipped, failed };
}

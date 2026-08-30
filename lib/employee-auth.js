/**
 * Employee (collaborator) passwordless auth — magic link → JWT cookie.
 * Separate from manager team30_session. Identity = candidates (employee).
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { asDb } from './ae/as-db.js';
import { query } from './db.js';
import { ERR } from './api-error-codes.js';
import { EMPLOYMENT_STATUS } from './domain-status.js';
import { getJwtSecret } from './jwt-secret.js';
import { sessionCookieOptions, sessionCookieSecure } from './auth.js';
import { enqueueTransactionalMail, isMailConfigured } from './mail.js';
import { EMPLOYEE_COOKIE_NAME, EMPLOYEE_KIND, EMPLOYEE_SESSION_MAX_AGE } from './employee-auth-constants.js';
import {
  generatePasswordSetupToken,
  passwordSetupExpiresAt,
  PASSWORD_SETUP_TTL_MS,
  maskEmail,
} from './user-password-invite.js';
import { buildUserPasswordInviteMail } from './user-access-mail.js';

export { EMPLOYEE_COOKIE_NAME, EMPLOYEE_KIND, PASSWORD_SETUP_TTL_MS, EMPLOYEE_SESSION_MAX_AGE };
export const EMPLOYEE_MAGIC_TTL_MS = 30 * 60 * 1000; // 30 min

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

export function isValidEmployeeEmail(email) {
  return Boolean(email && EMAIL_RE.test(String(email).trim()));
}

export function generateEmployeeMagicToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function employeeSessionCookieOptions({ maxAge = EMPLOYEE_SESSION_MAX_AGE } = {}) {
  return {
    ...sessionCookieOptions({ maxAge }),
    secure: sessionCookieSecure(),
  };
}

export function signEmployeeToken({ candidateId, companyId, email, locale = 'pt-BR', sv = 1 }) {
  const cid = Number(candidateId);
  const company = Number(companyId);
  const sessionVersion = Number(sv);
  if (!Number.isFinite(cid) || !Number.isFinite(company)) {
    throw new Error('signEmployeeToken requires candidateId and companyId');
  }
  if (!Number.isFinite(sessionVersion) || sessionVersion < 1) {
    throw new Error('signEmployeeToken requires sv >= 1');
  }
  return jwt.sign(
    {
      kind: EMPLOYEE_KIND,
      candidateId: cid,
      companyId: company,
      email: String(email || '').trim().toLowerCase().slice(0, 320) || null,
      locale,
      sv: sessionVersion,
    },
    getJwtSecret(),
    { expiresIn: EMPLOYEE_SESSION_MAX_AGE }
  );
}

/** @returns {{ kind, candidateId, companyId, email, locale, sv } | null} */
export function verifyEmployeeToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload?.kind !== EMPLOYEE_KIND) return null;
    const candidateId = Number(payload.candidateId);
    const companyId = Number(payload.companyId);
    const sv = Number(payload.sv);
    if (!Number.isFinite(candidateId) || !Number.isFinite(companyId)) return null;
    if (!Number.isFinite(sv) || sv < 1) return null;
    return {
      kind: EMPLOYEE_KIND,
      candidateId,
      companyId,
      email: payload.email || null,
      locale: payload.locale === 'en' ? 'en' : 'pt-BR',
      sv,
    };
  } catch {
    return null;
  }
}

export function isEmployeeSessionPayload(payload) {
  return Boolean(payload && payload.kind === EMPLOYEE_KIND && payload.candidateId && payload.companyId);
}

/**
 * Find active employees by email (optional company scope).
 */
export async function findEmployeesByEmail(dbOrQuery, { email, companyId = null }) {
  const db = asDb(dbOrQuery || query);
  const em = String(email || '').trim().toLowerCase();
  if (!isValidEmployeeEmail(em)) return [];
  const params = [em];
  let companyClause = '';
  if (companyId != null && Number.isFinite(Number(companyId))) {
    params.push(Number(companyId));
    companyClause = ` AND c.company_id = $${params.length}`;
  }
  const r = await db.query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.full_name AS "fullName",
            c.email, co.name AS "companyName", co.slug AS "companySlug"
     FROM candidates c
     JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
     WHERE LOWER(TRIM(c.email)) = $1
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       ${companyClause}
     ORDER BY LOWER(co.name) ASC, c.id ASC
     LIMIT 10`,
    params
  );
  return r.rows || [];
}

/**
 * Resolve company scope from id or opaque slug (never returns a company list to clients).
 * @returns {Promise<number|null>}
 */
export async function resolveEmployeeCompanyId(dbOrQuery, { companyId = null, companySlug = null } = {}) {
  const db = asDb(dbOrQuery || query);
  if (companyId != null && Number.isFinite(Number(companyId))) {
    return Number(companyId);
  }
  const slug = String(companySlug || '')
    .trim()
    .toLowerCase();
  if (!slug || slug.length > 80) return null;
  const r = await db.query(
    `SELECT id FROM companies
     WHERE LOWER(TRIM(slug)) = $1 AND deleted = FALSE
     LIMIT 1`,
    [slug]
  );
  return r.rowCount > 0 ? Number(r.rows[0].id) : null;
}

function buildEmployeeMagicMail({ locale, personName, companyName, loginUrl, expiresMinutes }) {
  const pt = locale !== 'en';
  const subject = pt
    ? `Acesso 30Team: ${companyName || 'sua empresa'}`
    : `30Team access: ${companyName || 'your company'}`;
  const greeting = pt ? `Olá${personName ? `, ${personName}` : ''}` : `Hi${personName ? `, ${personName}` : ''}`;
  const text = pt
    ? `${greeting},\n\nUse o link abaixo para entrar no seu espaço de colaborador (válido por ~${expiresMinutes} min):\n${loginUrl}\n\nSe você não pediu este acesso, ignore este e-mail.\n`
    : `${greeting},\n\nUse the link below to open your collaborator space (valid ~${expiresMinutes} min):\n${loginUrl}\n\nIf you did not request this, ignore this email.\n`;
  const html = pt
    ? `<p>${greeting},</p><p>Use o link abaixo para entrar no seu espaço de colaborador (válido por ~${expiresMinutes} min):</p><p><a href="${loginUrl}">${loginUrl}</a></p><p>Se você não pediu este acesso, ignore este e-mail.</p>`
    : `<p>${greeting},</p><p>Use the link below to open your collaborator space (valid ~${expiresMinutes} min):</p><p><a href="${loginUrl}">${loginUrl}</a></p><p>If you did not request this, ignore this email.</p>`;
  return { subject, text, html };
}

/**
 * Create magic-link token and queue email. Always returns ok for unknown emails (no enumeration)
 * unless opts.strict = true (manager-issued).
 */
export async function requestEmployeeMagicLink(dbOrQuery, opts = {}) {
  const db = asDb(dbOrQuery || query);
  const email = String(opts.email || '').trim().toLowerCase();
  const locale = opts.locale === 'en' ? 'en' : 'pt-BR';
  let companyId =
    opts.companyId != null && Number.isFinite(Number(opts.companyId)) ? Number(opts.companyId) : null;
  if (companyId == null && opts.companySlug) {
    companyId = await resolveEmployeeCompanyId(db, { companySlug: opts.companySlug });
    // Slug inválido: resposta uniforme (sem enum de slugs).
    if (companyId == null) {
      return opts.strict === true
        ? { ok: false, errorCode: ERR.NOT_FOUND }
        : { ok: true, sent: false, ambiguous: false };
    }
  }
  const candidateId =
    opts.candidateId != null && Number.isFinite(Number(opts.candidateId))
      ? Number(opts.candidateId)
      : null;
  const strict = opts.strict === true;
  const base = appBaseUrl();

  if (!isValidEmployeeEmail(email) && !candidateId) {
    return { ok: false, errorCode: ERR.INVALID_EMAIL };
  }
  if (!base) return { ok: false, errorCode: ERR.APP_URL_MISSING };
  if (!isMailConfigured() && opts.requireMail !== false) {
    return { ok: false, errorCode: ERR.MAIL_NOT_CONFIGURED };
  }

  let matches = [];
  if (candidateId) {
    const r = await db.query(
      `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.full_name AS "fullName",
              c.email, co.name AS "companyName", co.slug AS "companySlug"
       FROM candidates c
       JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
       WHERE c.id = $1
         AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
         ${companyId ? 'AND c.company_id = $2' : ''}
       LIMIT 1`,
      companyId ? [candidateId, companyId] : [candidateId]
    );
    matches = r.rows || [];
  } else {
    matches = await findEmployeesByEmail(db, { email, companyId });
  }

  if (matches.length === 0) {
    if (strict) return { ok: false, errorCode: ERR.NOT_FOUND };
    return { ok: true, sent: false, ambiguous: false };
  }

  // Multi-empresa: envia um link por vínculo (mesmo e-mail); sem pedir slug nem listar empresas.
  const people = matches.slice(0, 10);
  let sentCount = 0;
  let lastPerson = null;
  for (const person of people) {
    const toEmail = String(person.email || email).trim().toLowerCase();
    if (!isValidEmployeeEmail(toEmail)) continue;

    const token = generateEmployeeMagicToken();
    const expiresAt = new Date(Date.now() + EMPLOYEE_MAGIC_TTL_MS);
    // eslint-disable-next-line no-await-in-loop -- one token + mail per company (≤10)
    await db.query(
      `INSERT INTO employee_login_tokens (
         company_id, candidate_id, token, expires_at, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5)`,
      [person.companyId, person.candidateId, token, expiresAt, opts.createdByUserId || null]
    );

    const loginUrl = `${base}/employee/enter?token=${encodeURIComponent(token)}`;
    const mail = buildEmployeeMagicMail({
      locale,
      personName: person.fullName,
      companyName: person.companyName,
      loginUrl,
      expiresMinutes: Math.round(EMPLOYEE_MAGIC_TTL_MS / 60000),
    });
    enqueueTransactionalMail({ to: toEmail, ...mail });
    sentCount += 1;
    lastPerson = person;
    if (opts.returnUrl === true && people.length === 1) {
      return {
        ok: true,
        sent: true,
        ambiguous: false,
        candidateId: person.candidateId,
        companyId: person.companyId,
        loginUrl,
      };
    }
  }

  if (sentCount === 0) {
    return { ok: false, errorCode: ERR.INVALID_EMAIL };
  }

  return {
    ok: true,
    sent: true,
    ambiguous: people.length > 1,
    candidateId: lastPerson?.candidateId,
    companyId: lastPerson?.companyId,
  };
}

/** Consume magic token → session claims (does not set cookie). Atomic UPDATE avoids TOCTOU. */
export async function consumeEmployeeMagicToken(dbOrQuery, { token }) {
  const db = asDb(dbOrQuery || query);
  const raw = String(token || '').trim();
  if (raw.length < 20) return { ok: false, errorCode: ERR.NOT_FOUND };

  const r = await db.query(
    `UPDATE employee_login_tokens t
     SET used_at = NOW()
     FROM candidates c
     WHERE t.token = $1
       AND t.used_at IS NULL
       AND t.expires_at > NOW()
       AND c.id = t.candidate_id
       AND c.company_id = t.company_id
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     RETURNING t.company_id AS "companyId", t.candidate_id AS "candidateId",
               c.full_name AS "fullName", c.email`,
    [raw]
  );
  if (r.rowCount === 0) {
    const peek = await db.query(
      `SELECT t.used_at AS "usedAt", t.expires_at AS "expiresAt",
              c.employment_status AS "employmentStatus"
       FROM employee_login_tokens t
       LEFT JOIN candidates c ON c.id = t.candidate_id AND c.company_id = t.company_id
       WHERE t.token = $1
       LIMIT 1`,
      [raw]
    );
    if (peek.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
    const row = peek.rows[0];
    if (row.employmentStatus && row.employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) {
      return { ok: false, errorCode: ERR.UNAUTHORIZED };
    }
    if (row.usedAt || (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now())) {
      return { ok: false, errorCode: ERR.EXPIRED };
    }
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }

  const row = r.rows[0];
  return {
    ok: true,
    candidateId: row.candidateId,
    companyId: row.companyId,
    email: row.email,
    fullName: row.fullName,
  };
}

/**
 * Manager invite (or re-invite): email link to set password on candidates.
 * Same UX as users /a/set-password — does not create a users row.
 */
export async function issueEmployeePasswordInvite(dbOrQuery, opts = {}) {
  const db = asDb(dbOrQuery || query);
  const locale = opts.locale === 'en' ? 'en' : 'pt-BR';
  const companyId = Number(opts.companyId);
  const candidateId = Number(opts.candidateId);
  const base = appBaseUrl();
  const purpose = opts.purpose === 'reset' ? 'reset' : 'invite';

  if (!Number.isFinite(candidateId) || !Number.isFinite(companyId)) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }
  if (!base) return { ok: false, errorCode: ERR.APP_URL_MISSING };
  if (!isMailConfigured() && opts.requireMail !== false) {
    return { ok: false, errorCode: ERR.MAIL_NOT_CONFIGURED };
  }

  const r = await db.query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.full_name AS "fullName",
            c.email, co.name AS "companyName"
     FROM candidates c
     JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
     WHERE c.id = $1 AND c.company_id = $2
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     LIMIT 1`,
    [candidateId, companyId]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const person = r.rows[0];
  const toEmail = String(person.email || '').trim().toLowerCase();
  if (!isValidEmployeeEmail(toEmail)) return { ok: false, errorCode: ERR.INVALID_EMAIL };

  const token = generatePasswordSetupToken();
  const expiresAt = passwordSetupExpiresAt();
  await db.query(
    `UPDATE candidates
     SET password_setup_token = $3,
         password_setup_expires_at = $4,
         access_invited_at = COALESCE(access_invited_at, NOW())
     WHERE id = $1 AND company_id = $2
       AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'`,
    [candidateId, companyId, token, expiresAt.toISOString()]
  );

  const setupUrl = `${base}/employee/set-password?token=${encodeURIComponent(token)}`;
  const mail = buildUserPasswordInviteMail({
    email: toEmail,
    setupUrl,
    locale,
    displayName: person.fullName,
    purpose,
  });
  // Prefer employee-specific subject when keys exist — mail helper uses userAccess; override subject/body lightly.
  const pt = locale !== 'en';
  const companyLabel = person.companyName || (pt ? 'sua empresa' : 'your company');
  if (purpose === 'invite') {
    mail.subject = pt
      ? `Cadastre sua senha — ${companyLabel} · 30Team`
      : `Set your password — ${companyLabel} · 30Team`;
  } else {
    mail.subject = pt
      ? `Redefinir senha — ${companyLabel} · 30Team`
      : `Reset password — ${companyLabel} · 30Team`;
  }
  enqueueTransactionalMail({ to: toEmail, ...mail });

  return {
    ok: true,
    sent: true,
    candidateId,
    companyId,
    expiresAt,
    setupUrl: opts.returnUrl === true ? setupUrl : undefined,
  };
}

/**
 * Self-serve forgot password (no email enumeration).
 */
export async function requestEmployeePasswordReset(dbOrQuery, { email, companyId = null, companySlug = null, locale = 'pt-BR' } = {}) {
  const db = asDb(dbOrQuery || query);
  const em = String(email || '').trim().toLowerCase();
  if (!isValidEmployeeEmail(em)) return { ok: false, errorCode: ERR.INVALID_EMAIL };
  if (!appBaseUrl()) return { ok: false, errorCode: ERR.APP_URL_MISSING };
  if (!isMailConfigured()) return { ok: false, errorCode: ERR.MAIL_NOT_CONFIGURED };

  let scopedCompanyId = companyId;
  if (scopedCompanyId == null && companySlug) {
    scopedCompanyId = await resolveEmployeeCompanyId(db, { companySlug });
    if (scopedCompanyId == null) return { ok: true };
  }

  const matches = await findEmployeesByEmail(db, { email: em, companyId: scopedCompanyId });
  if (matches.length === 0) return { ok: true };

  // Multi-empresa: um reset por vínculo (mesmo e-mail); sem pedir slug.
  for (const person of matches.slice(0, 10)) {
    const has = await db.query(
      `SELECT password_hash IS NOT NULL AS "hasPassword",
              access_invited_at IS NOT NULL AS "wasInvited"
       FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [person.candidateId, person.companyId]
    );
    if (!has.rows[0]?.hasPassword && !has.rows[0]?.wasInvited) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop -- invite per company (≤10)
    await issueEmployeePasswordInvite(db, {
      candidateId: person.candidateId,
      companyId: person.companyId,
      locale,
      purpose: 'reset',
      requireMail: true,
    });
  }
  return { ok: true };
}

export async function peekEmployeePasswordSetupToken(dbOrQuery, rawToken) {
  const db = asDb(dbOrQuery || query);
  const token = String(rawToken || '').trim();
  if (!token || token.length < 16) return { ok: false, errorCode: ERR.INVALID_TOKEN };

  const r = await db.query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.email,
            c.password_setup_expires_at AS "expiresAt",
            c.employment_status AS "employmentStatus"
     FROM candidates c
     JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
     WHERE c.password_setup_token = $1
     LIMIT 1`,
    [token]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.INVALID_TOKEN };
  const row = r.rows[0];
  if (row.employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) {
    return { ok: false, errorCode: ERR.INVALID_TOKEN };
  }
  if (!row.expiresAt || new Date(row.expiresAt).getTime() <= Date.now()) {
    return { ok: false, errorCode: ERR.EXPIRED };
  }
  return {
    ok: true,
    candidateId: row.candidateId,
    companyId: row.companyId,
    email: row.email,
    maskedEmail: maskEmail(row.email),
  };
}

export async function completeEmployeePasswordSetup(dbOrQuery, { token, password }) {
  const db = asDb(dbOrQuery || query);
  const pwd = String(password || '');
  if (pwd.length < 8) return { ok: false, errorCode: ERR.PASSWORD_TOO_SHORT };

  const peek = await peekEmployeePasswordSetupToken(db, token);
  if (!peek.ok) return peek;

  const { hashPassword } = await import('./auth.js');
  const { bumpEmployeeSessionVersion } = await import('./employee-session-revocation.js');
  const passwordHash = await hashPassword(pwd);
  const up = await db.query(
    `UPDATE candidates
     SET password_hash = $3,
         password_setup_token = NULL,
         password_setup_expires_at = NULL
     WHERE id = $1 AND company_id = $2
       AND password_setup_token = $4
       AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     RETURNING id, email, full_name AS "fullName"`,
    [peek.candidateId, peek.companyId, passwordHash, String(token || '').trim()]
  );
  if (up.rowCount === 0) return { ok: false, errorCode: ERR.INVALID_TOKEN };

  const sessionVersion = await bumpEmployeeSessionVersion(db, peek.candidateId, peek.companyId);

  return {
    ok: true,
    candidateId: peek.candidateId,
    companyId: peek.companyId,
    email: up.rows[0].email,
    fullName: up.rows[0].fullName,
    sessionVersion: sessionVersion || 1,
  };
}

/**
 * Email + password login for collaborators.
 * Multi-company: verify password against each row first; if 2+ match, return
 * a pick challenge with company *names* (never ask for slug before auth).
 */
export async function loginEmployeeWithPassword(dbOrQuery, { email, password, companyId = null, companySlug = null }) {
  const db = asDb(dbOrQuery || query);
  const em = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!isValidEmployeeEmail(em) || !pwd) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED };
  }

  let scopedCompanyId = companyId;
  if (scopedCompanyId == null && companySlug) {
    scopedCompanyId = await resolveEmployeeCompanyId(db, { companySlug });
    if (scopedCompanyId == null) return { ok: false, errorCode: ERR.UNAUTHORIZED };
  }

  const matches = await findEmployeesByEmail(db, { email: em, companyId: scopedCompanyId });
  if (matches.length === 0) return { ok: false, errorCode: ERR.UNAUTHORIZED };

  const ids = matches.map((m) => Number(m.candidateId)).filter((id) => Number.isFinite(id));
  const hashR = await db.query(
    `SELECT id AS "candidateId", company_id AS "companyId",
            password_hash AS "passwordHash",
            totp_secret AS "totpSecret",
            totp_enabled_at AS "totpEnabledAt"
     FROM candidates
     WHERE id = ANY($1::int[])
       AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'`,
    [ids]
  );
  const byId = new Map((hashR.rows || []).map((r) => [Number(r.candidateId), r]));

  const { verifyPassword } = await import('./auth.js');
  const verified = [];
  for (const person of matches) {
    const row = byId.get(Number(person.candidateId));
    if (!row?.passwordHash) continue;
    if (Number(row.companyId) !== Number(person.companyId)) continue;
    // eslint-disable-next-line no-await-in-loop -- bcrypt; small N (≤10)
    const okPwd = await verifyPassword(pwd, row.passwordHash);
    if (!okPwd) continue;
    verified.push({
      candidateId: person.candidateId,
      companyId: person.companyId,
      email: person.email,
      fullName: person.fullName,
      companyName: person.companyName || '',
      requires2fa: Boolean(row.totpEnabledAt && row.totpSecret),
    });
  }

  if (verified.length === 0) return { ok: false, errorCode: ERR.UNAUTHORIZED };

  if (verified.length > 1 && scopedCompanyId == null) {
    const { signEmployeeCompanyPickChallenge } = await import('./employee-company-pick.js');
    const pickToken = signEmployeeCompanyPickChallenge({
      email: em,
      choices: verified.map((v) => ({
        candidateId: v.candidateId,
        companyId: v.companyId,
      })),
    });
    return {
      ok: true,
      needsCompanyPick: true,
      pickToken,
      companies: verified.map((v) => ({
        candidateId: v.candidateId,
        companyId: v.companyId,
        companyName: v.companyName,
      })),
    };
  }

  const person = verified[0];
  return {
    ok: true,
    requires2fa: person.requires2fa,
    candidateId: person.candidateId,
    companyId: person.companyId,
    email: person.email,
    fullName: person.fullName,
  };
}

/**
 * Finish login after company pick (password already proven via pickToken).
 */
export async function completeEmployeeCompanyPick(dbOrQuery, { pickToken, candidateId }) {
  const db = asDb(dbOrQuery || query);
  const { verifyEmployeeCompanyPickChallenge } = await import('./employee-company-pick.js');
  const challenge = verifyEmployeeCompanyPickChallenge(pickToken);
  if (!challenge) return { ok: false, errorCode: ERR.UNAUTHORIZED };

  const cid = Number(candidateId);
  if (!Number.isFinite(cid)) return { ok: false, errorCode: ERR.UNAUTHORIZED };
  const choice = challenge.choices.find((c) => c.candidateId === cid);
  if (!choice) return { ok: false, errorCode: ERR.UNAUTHORIZED };

  const r = await db.query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.full_name AS "fullName",
            c.email, co.name AS "companyName",
            c.totp_secret AS "totpSecret", c.totp_enabled_at AS "totpEnabledAt"
     FROM candidates c
     JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
     WHERE c.id = $1 AND c.company_id = $2
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       AND LOWER(TRIM(c.email)) = $3
     LIMIT 1`,
    [choice.candidateId, choice.companyId, challenge.email]
  );
  const row = r.rows[0];
  if (!row) return { ok: false, errorCode: ERR.UNAUTHORIZED };

  return {
    ok: true,
    requires2fa: Boolean(row.totpEnabledAt && row.totpSecret),
    candidateId: row.candidateId,
    companyId: row.companyId,
    email: row.email,
    fullName: row.fullName,
  };
}

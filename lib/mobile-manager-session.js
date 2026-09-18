import jwt from 'jsonwebtoken';
import { verifyPassword } from './auth.js';
import { query } from './db.js';
import { getJwtSecret } from './jwt-secret.js';
import { loadUserCapabilityOverrides } from './user-capabilities.js';
import { resolveCapabilities } from './permissions.js';
import {
  createMobileRefreshSession,
  mobileRefreshFamilyIsActive,
  rotateMobileRefreshSession,
} from './mobile-refresh-session.js';

export const MOBILE_AUTH_OUTCOME = Object.freeze({
  AUTHENTICATED: 'authenticated',
  REQUIRES_COMPANY_SELECTION: 'requires_company_selection',
  REQUIRES_SECOND_FACTOR: 'requires_second_factor',
});

export const MOBILE_TOKEN_PURPOSE = Object.freeze({
  ACCESS: 'mobile_access',
  COMPANY_SELECTION: 'mobile_company_selection',
  SECOND_FACTOR: 'mobile_second_factor',
});

export const MOBILE_SESSION_FAILURE = Object.freeze({
  INVALID_TOKEN: 'invalid_token',
  MEMBERSHIP_UNAVAILABLE: 'membership_unavailable',
});

export const MOBILE_ACCESS_TTL_SEC = 15 * 60;
export const MOBILE_SELECTION_TTL_SEC = 5 * 60;
const MOBILE_TOKEN_AUDIENCE = '30team-mobile';
const MOBILE_TOKEN_ISSUER = '30team';
const MOBILE_MEMBERSHIP_CAP = 100;

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'pt-BR';
}

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function tokenExpiresAt(ttlSec) {
  return new Date(Date.now() + ttlSec * 1000).toISOString();
}

function signMobileToken(payload, ttlSec) {
  return jwt.sign(payload, getJwtSecret(), {
    audience: MOBILE_TOKEN_AUDIENCE,
    expiresIn: ttlSec,
    issuer: MOBILE_TOKEN_ISSUER,
  });
}

function verifyMobileToken(token, purpose) {
  try {
    const payload = jwt.verify(String(token || ''), getJwtSecret(), {
      audience: MOBILE_TOKEN_AUDIENCE,
      issuer: MOBILE_TOKEN_ISSUER,
    });
    if (payload?.purpose !== purpose) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerTokenFromRequest(request) {
  const authorization = String(request?.headers?.get?.('authorization') || '').trim();
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] || null;
}

export async function loadMobileLoginUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@') || normalizedEmail.length > 254) return null;
  const result = await query(
    `SELECT
       id,
       email,
       password_hash AS "passwordHash",
       locale,
       active,
       deleted,
       password_setup_token AS "passwordSetupToken",
       COALESCE(session_version, 1) AS "sessionVersion",
       totp_enabled_at AS "totpEnabledAt"
     FROM users
     WHERE LOWER(TRIM(email)) = $1
     LIMIT 1`,
    [normalizedEmail]
  );
  return result.rows[0] || null;
}

export async function loadMobileLoginUserById(userId) {
  const id = positiveId(userId);
  if (!id) return null;
  const result = await query(
    `SELECT
       id,
       email,
       locale,
       active,
       deleted,
       password_setup_token AS "passwordSetupToken",
       COALESCE(session_version, 1) AS "sessionVersion",
       totp_enabled_at AS "totpEnabledAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export function mobileLoginUserIsEligible(user) {
  return Boolean(user && user.active && !user.deleted && !user.passwordSetupToken);
}

export async function verifyMobilePassword(user, password) {
  if (!mobileLoginUserIsEligible(user) || !user.passwordHash) return false;
  return verifyPassword(String(password || ''), user.passwordHash);
}

async function loadMobileIdentity(userId) {
  const result = await query(
    `SELECT
       id,
       email,
       locale,
       active,
       deleted,
       COALESCE(session_version, 1) AS "sessionVersion",
       NULLIF(TRIM(signup_metadata->>'fullName'), '') AS "displayName"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  if (!row.active || row.deleted) return null;
  return {
    id: Number(row.id),
    displayName: row.displayName || String(row.email).split('@')[0],
    email: row.email,
    locale: normalizeLocale(row.locale),
    sessionVersion: Number(row.sessionVersion),
  };
}

async function loadMobileMembershipRows(userId) {
  const result = await query(
    `SELECT
       m.id,
       m.company_id AS "companyId",
       m.role,
       c.name AS "companyName",
       c.logo_url AS "companyLogoUrl",
       c.enabled_modules AS "companyModules"
     FROM user_company_memberships m
     JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = $1
       AND m.active = TRUE
       AND m.deleted = FALSE
       AND c.active = TRUE
       AND c.deleted = FALSE
     ORDER BY LOWER(c.name) ASC, m.id ASC
     LIMIT $2`,
    [userId, MOBILE_MEMBERSHIP_CAP]
  );
  return result.rows;
}

async function loadMobilePrincipal(userId) {
  const identity = await loadMobileIdentity(userId);
  if (!identity) return null;
  const [rows, capabilityOverrides] = await Promise.all([
    loadMobileMembershipRows(identity.id),
    loadUserCapabilityOverrides(identity.id),
  ]);
  const customized = capabilityOverrides.length > 0;
  const memberships = rows.map((row) => {
    const payload = {
      role: row.role,
      companyId: Number(row.companyId),
      companyModules: row.companyModules,
      capabilitiesCustomized: customized,
      capabilityOverrides,
    };
    return {
      id: Number(row.id),
      company: {
        id: Number(row.companyId),
        logoUrl: row.companyLogoUrl || null,
        name: row.companyName,
      },
      role: row.role,
      capabilities: [...resolveCapabilities(payload)].sort(),
    };
  });
  return {
    identity: {
      id: identity.id,
      displayName: identity.displayName,
      email: identity.email,
      locale: identity.locale,
    },
    memberships,
    sessionVersion: identity.sessionVersion,
  };
}

export function signMobileCompanySelectionToken(user) {
  return signMobileToken(
    {
      purpose: MOBILE_TOKEN_PURPOSE.COMPANY_SELECTION,
      userId: Number(user.id),
      sv: Number(user.sessionVersion),
    },
    MOBILE_SELECTION_TTL_SEC
  );
}

export function signMobileSecondFactorToken(user) {
  return signMobileToken(
    {
      purpose: MOBILE_TOKEN_PURPOSE.SECOND_FACTOR,
      userId: Number(user.id),
      sv: Number(user.sessionVersion),
    },
    MOBILE_SELECTION_TTL_SEC
  );
}

export function verifyMobileSecondFactorToken(token) {
  const payload = verifyMobileToken(token, MOBILE_TOKEN_PURPOSE.SECOND_FACTOR);
  const userId = positiveId(payload?.userId);
  const sessionVersion = positiveId(payload?.sv);
  if (!userId || !sessionVersion) return null;
  return { userId, sessionVersion };
}

function signMobileAccessToken({ userId, membershipId, sessionVersion, familyId }) {
  return signMobileToken(
    {
      purpose: MOBILE_TOKEN_PURPOSE.ACCESS,
      userId: Number(userId),
      membershipId: Number(membershipId),
      sv: Number(sessionVersion),
      ...(familyId ? { sid: familyId } : {}),
    },
    MOBILE_ACCESS_TTL_SEC
  );
}

async function buildAuthenticatedMobileSession(principal, membershipId, tokenContext = {}) {
  const targetId = positiveId(membershipId);
  const activeMembership = principal?.memberships.find((item) => item.id === targetId);
  if (!activeMembership) return null;
  const refresh = tokenContext.refresh || (tokenContext.issueRefresh === false
    ? null
    : await createMobileRefreshSession({
        userId: principal.identity.id,
        membershipId: activeMembership.id,
        sessionVersion: principal.sessionVersion,
      }));
  const accessToken = signMobileAccessToken({
    userId: principal.identity.id,
    membershipId: activeMembership.id,
    sessionVersion: principal.sessionVersion,
    familyId: refresh?.familyId || tokenContext.familyId,
  });
  return {
    identity: principal.identity,
    activeMembership,
    availableMemberships: principal.memberships,
    tokens: {
      accessToken,
      accessTokenExpiresAt: tokenExpiresAt(MOBILE_ACCESS_TTL_SEC),
      ...(refresh ? {
        refreshToken: refresh.refreshToken,
        refreshTokenExpiresAt: refresh.refreshTokenExpiresAt,
      } : {}),
    },
  };
}

export async function completeMobileAuthentication(user) {
  if (!mobileLoginUserIsEligible(user)) return { ok: false };
  const principal = await loadMobilePrincipal(Number(user.id));
  if (!principal || principal.sessionVersion !== Number(user.sessionVersion)) return { ok: false };
  if (principal.memberships.length === 0) return { ok: false };
  if (principal.memberships.length === 1) {
    const session = await buildAuthenticatedMobileSession(principal, principal.memberships[0].id);
    return { ok: true, outcome: MOBILE_AUTH_OUTCOME.AUTHENTICATED, session };
  }
  return {
    ok: true,
    outcome: MOBILE_AUTH_OUTCOME.REQUIRES_COMPANY_SELECTION,
    identity: principal.identity,
    memberships: principal.memberships,
    selectionToken: signMobileCompanySelectionToken(user),
  };
}

export async function selectMobileCompany(selectionToken, membershipId) {
  const payload = verifyMobileToken(selectionToken, MOBILE_TOKEN_PURPOSE.COMPANY_SELECTION);
  if (!payload) return { ok: false, reason: MOBILE_SESSION_FAILURE.INVALID_TOKEN };
  const principal = await loadMobilePrincipal(positiveId(payload.userId));
  if (!principal || principal.sessionVersion !== Number(payload.sv)) {
    return { ok: false, reason: MOBILE_SESSION_FAILURE.INVALID_TOKEN };
  }
  const session = await buildAuthenticatedMobileSession(principal, membershipId);
  if (!session) return { ok: false, reason: MOBILE_SESSION_FAILURE.MEMBERSHIP_UNAVAILABLE };
  return { ok: true, outcome: MOBILE_AUTH_OUTCOME.AUTHENTICATED, session };
}

export async function authenticateMobileAccessToken(accessToken) {
  const payload = verifyMobileToken(accessToken, MOBILE_TOKEN_PURPOSE.ACCESS);
  if (!payload) return null;
  const principal = await loadMobilePrincipal(positiveId(payload.userId));
  if (!principal || principal.sessionVersion !== Number(payload.sv)) return null;
  if (!(await mobileRefreshFamilyIsActive(payload.sid, principal.identity.id))) return null;
  const session = await buildAuthenticatedMobileSession(principal, payload.membershipId, {
    issueRefresh: false,
    familyId: payload.sid,
  });
  if (!session) return null;
  return { principal, session, tokenPayload: payload };
}

export async function switchMobileCompany(accessToken, refreshToken, membershipId) {
  const current = await authenticateMobileAccessToken(accessToken);
  if (!current) return { ok: false, reason: MOBILE_SESSION_FAILURE.INVALID_TOKEN };
  const rotated = await rotateMobileRefreshSession(refreshToken, membershipId);
  if (
    !rotated.ok ||
    rotated.userId !== current.principal.identity.id ||
    rotated.familyId !== current.tokenPayload.sid
  ) {
    return { ok: false, reason: MOBILE_SESSION_FAILURE.INVALID_TOKEN };
  }
  const session = await buildAuthenticatedMobileSession(current.principal, membershipId, {
    refresh: rotated,
  });
  if (!session) return { ok: false, reason: MOBILE_SESSION_FAILURE.MEMBERSHIP_UNAVAILABLE };
  return {
    ok: true,
    outcome: MOBILE_AUTH_OUTCOME.AUTHENTICATED,
    previousMembershipId: Number(current.session.activeMembership.id),
    session,
  };
}

export async function refreshMobileSession(refreshToken, membershipId = null) {
  const rotated = await rotateMobileRefreshSession(refreshToken, membershipId);
  if (!rotated.ok) return rotated;
  const principal = await loadMobilePrincipal(rotated.userId);
  if (!principal || principal.sessionVersion !== rotated.sessionVersion) {
    return { ok: false, reason: MOBILE_SESSION_FAILURE.INVALID_TOKEN };
  }
  const session = await buildAuthenticatedMobileSession(principal, rotated.membershipId, {
    refresh: rotated,
  });
  if (!session) return { ok: false, reason: MOBILE_SESSION_FAILURE.MEMBERSHIP_UNAVAILABLE };
  return { ok: true, outcome: MOBILE_AUTH_OUTCOME.AUTHENTICATED, session };
}

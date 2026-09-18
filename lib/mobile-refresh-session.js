import crypto from 'node:crypto';
import { query, withTransaction } from './db.js';

export const MOBILE_REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
export const MOBILE_REFRESH_FAILURE = Object.freeze({
  INVALID: 'invalid_refresh_token',
  REUSED: 'reused_refresh_token',
});

function opaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function expiresAt() {
  return new Date(Date.now() + MOBILE_REFRESH_TTL_SEC * 1000);
}

function publicToken(token, expiry) {
  return {
    refreshToken: token,
    refreshTokenExpiresAt: expiry.toISOString(),
  };
}

export async function createMobileRefreshSession({ userId, membershipId, sessionVersion }) {
  const token = opaqueToken();
  const expiry = expiresAt();
  const familyId = crypto.randomUUID();
  await query(
    `INSERT INTO mobile_refresh_sessions (
       family_id, user_id, membership_id, token_hash, session_version, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [familyId, userId, membershipId, tokenHash(token), sessionVersion, expiry]
  );
  return { familyId, ...publicToken(token, expiry) };
}

async function revokeFamily(client, familyId) {
  await client.query(
    `UPDATE mobile_refresh_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE family_id = $1 AND revoked_at IS NULL AND rotated_at IS NULL`,
    [familyId]
  );
}

export async function rotateMobileRefreshSession(refreshToken, membershipId = null) {
  const hash = tokenHash(refreshToken);
  if (!refreshToken || hash.length !== 64) return { ok: false, reason: MOBILE_REFRESH_FAILURE.INVALID };
  return withTransaction(async (client) => {
    const found = await client.query(
      `SELECT id, family_id AS "familyId", user_id AS "userId",
              membership_id AS "membershipId", session_version AS "sessionVersion",
              expires_at AS "expiresAt", rotated_at AS "rotatedAt", revoked_at AS "revokedAt"
       FROM mobile_refresh_sessions
       WHERE token_hash = $1
       FOR UPDATE`,
      [hash]
    );
    if (found.rowCount === 0) return { ok: false, reason: MOBILE_REFRESH_FAILURE.INVALID };
    const current = found.rows[0];
    if (current.rotatedAt) {
      await revokeFamily(client, current.familyId);
      return { ok: false, reason: MOBILE_REFRESH_FAILURE.REUSED };
    }
    if (current.revokedAt || new Date(current.expiresAt).getTime() <= Date.now()) {
      return { ok: false, reason: MOBILE_REFRESH_FAILURE.INVALID };
    }

    const targetMembershipId = membershipId == null ? Number(current.membershipId) : Number(membershipId);
    const eligible = await client.query(
      `SELECT 1
       FROM users u
       JOIN user_company_memberships m ON m.user_id = u.id
       JOIN companies c ON c.id = m.company_id
       WHERE u.id = $1
         AND COALESCE(u.session_version, 1) = $2
         AND u.active = TRUE AND u.deleted = FALSE
         AND m.id = $3 AND m.active = TRUE AND m.deleted = FALSE
         AND c.active = TRUE AND c.deleted = FALSE
       LIMIT 1`,
      [current.userId, current.sessionVersion, targetMembershipId]
    );
    if (eligible.rowCount === 0) {
      await revokeFamily(client, current.familyId);
      return { ok: false, reason: MOBILE_REFRESH_FAILURE.INVALID };
    }

    const nextToken = opaqueToken();
    const expiry = expiresAt();
    const inserted = await client.query(
      `INSERT INTO mobile_refresh_sessions (
         family_id, user_id, membership_id, token_hash, session_version, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [current.familyId, current.userId, targetMembershipId, tokenHash(nextToken), current.sessionVersion, expiry]
    );
    await client.query(
      `UPDATE mobile_refresh_sessions
       SET rotated_at = NOW(), last_used_at = NOW(), replaced_by_id = $2
       WHERE id = $1 AND rotated_at IS NULL AND revoked_at IS NULL`,
      [current.id, inserted.rows[0].id]
    );
    return {
      ok: true,
      familyId: current.familyId,
      userId: Number(current.userId),
      membershipId: targetMembershipId,
      sessionVersion: Number(current.sessionVersion),
      ...publicToken(nextToken, expiry),
    };
  });
}

export async function revokeMobileRefreshSession(refreshToken) {
  const hash = tokenHash(refreshToken);
  if (!refreshToken) return { ok: true };
  return withTransaction(async (client) => {
    const found = await client.query(
      `SELECT family_id AS "familyId"
       FROM mobile_refresh_sessions
       WHERE token_hash = $1
       FOR UPDATE`,
      [hash]
    );
    if (found.rowCount > 0) await revokeFamily(client, found.rows[0].familyId);
    return { ok: true };
  });
}

export async function mobileRefreshFamilyIsActive(familyId, userId) {
  if (!familyId) return true;
  const result = await query(
    `SELECT 1
     FROM mobile_refresh_sessions
     WHERE family_id = $1 AND user_id = $2
       AND revoked_at IS NULL AND rotated_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [familyId, userId]
  );
  return result.rowCount > 0;
}

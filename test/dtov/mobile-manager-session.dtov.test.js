/** DTOV proof — mobile context selection and switching remain tenant-scoped. */
import assert from 'node:assert/strict';
import { pool, query } from '../../lib/db.js';
import {
  authenticateMobileAccessToken,
  completeMobileAuthentication,
  loadMobileLoginUserByEmail,
  MOBILE_AUTH_OUTCOME,
  MOBILE_SESSION_FAILURE,
  refreshMobileSession,
  selectMobileCompany,
  switchMobileCompany,
  verifyMobilePassword,
} from '../../lib/mobile-manager-session.js';
import { closeRateLimitRedis } from '../../lib/rate-limit.js';
import { revokeMobileRefreshSession } from '../../lib/mobile-refresh-session.js';
import { createUser } from '../../lib/users-admin.js';

async function main() {
  process.env.JWT_SECRET ||= 'dtov-mobile-session-secret-2026-minimum-32-chars';
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `mobile-membership-${suffix}@dtov.test`;
  const password = 'MobileMembership!2026';
  const companyIds = [];
  const userIds = [];

  try {
    for (const marker of ['a', 'b', 'outside']) {
      const company = await query(
        `INSERT INTO companies (name, slug, active, deleted)
         VALUES ($1, $2, TRUE, FALSE)
         RETURNING id`,
        [`Mobile DTOV ${marker}`, `mobile-dtov-${marker}-${suffix}`]
      );
      companyIds.push(Number(company.rows[0].id));
    }

    const created = await createUser({
      email,
      password,
      role: 'hr',
      companyId: companyIds[0],
      actorUserId: null,
    });
    assert.equal(created.ok, true, created.errorCode);
    userIds.push(Number(created.user.id));
    const second = await query(
      `INSERT INTO user_company_memberships (user_id, company_id, role, active, deleted)
       VALUES ($1, $2, 'direction', TRUE, FALSE)
       RETURNING id`,
      [created.user.id, companyIds[1]]
    );

    const outsider = await createUser({
      email: `mobile-outsider-${suffix}@dtov.test`,
      password,
      role: 'hr',
      companyId: companyIds[2],
      actorUserId: null,
    });
    assert.equal(outsider.ok, true, outsider.errorCode);
    userIds.push(Number(outsider.user.id));
    const outsiderMembership = await query(
      `SELECT id FROM user_company_memberships WHERE user_id = $1 AND company_id = $2`,
      [outsider.user.id, companyIds[2]]
    );

    const loginUser = await loadMobileLoginUserByEmail(email);
    assert.equal(await verifyMobilePassword(loginUser, password), true);
    const authentication = await completeMobileAuthentication(loginUser);
    assert.equal(authentication.ok, true);
    assert.equal(authentication.outcome, MOBILE_AUTH_OUTCOME.REQUIRES_COMPANY_SELECTION);
    assert.equal(authentication.memberships.length, 2);

    const firstMembership = authentication.memberships.find(
      (membership) => membership.company.id === companyIds[0]
    );
    const secondMembership = authentication.memberships.find(
      (membership) => membership.company.id === companyIds[1]
    );
    assert.equal(firstMembership.role, 'hr');
    assert.equal(secondMembership.role, 'direction');
    assert.ok(firstMembership.capabilities.length > 0);

    const forbidden = await selectMobileCompany(
      authentication.selectionToken,
      outsiderMembership.rows[0].id
    );
    assert.deepEqual(forbidden, {
      ok: false,
      reason: MOBILE_SESSION_FAILURE.MEMBERSHIP_UNAVAILABLE,
    });

    const selected = await selectMobileCompany(
      authentication.selectionToken,
      firstMembership.id
    );
    assert.equal(selected.ok, true);
    assert.equal(selected.session.activeMembership.company.id, companyIds[0]);
    assert.ok(selected.session.tokens.refreshToken);
    assert.ok(selected.session.tokens.refreshTokenExpiresAt);

    const hydrated = await authenticateMobileAccessToken(selected.session.tokens.accessToken);
    assert.equal(hydrated.session.activeMembership.id, firstMembership.id);

    const switched = await switchMobileCompany(
      selected.session.tokens.accessToken,
      selected.session.tokens.refreshToken,
      second.rows[0].id
    );
    assert.equal(switched.ok, true);
    assert.equal(switched.previousMembershipId, firstMembership.id);
    assert.equal(switched.session.activeMembership.company.id, companyIds[1]);
    assert.equal(switched.session.activeMembership.role, 'direction');
    assert.notEqual(switched.session.tokens.refreshToken, selected.session.tokens.refreshToken);

    const replayed = await refreshMobileSession(selected.session.tokens.refreshToken);
    assert.equal(replayed.ok, false);
    assert.equal(
      await authenticateMobileAccessToken(switched.session.tokens.accessToken),
      null
    );

    const selectedAgain = await selectMobileCompany(
      authentication.selectionToken,
      firstMembership.id
    );
    const refreshed = await refreshMobileSession(selectedAgain.session.tokens.refreshToken);
    assert.equal(refreshed.ok, true);
    assert.notEqual(refreshed.session.tokens.refreshToken, selectedAgain.session.tokens.refreshToken);
    await revokeMobileRefreshSession(refreshed.session.tokens.refreshToken);
    assert.equal(
      await authenticateMobileAccessToken(refreshed.session.tokens.accessToken),
      null
    );

    const selectedForRevocation = await selectMobileCompany(
      authentication.selectionToken,
      secondMembership.id
    );

    await query(
      `UPDATE user_company_memberships
       SET active = FALSE, deleted = TRUE
       WHERE id = $1`,
      [second.rows[0].id]
    );
    assert.equal(
      await authenticateMobileAccessToken(selectedForRevocation.session.tokens.accessToken),
      null
    );
  } finally {
    for (const userId of userIds) {
      await query(`DELETE FROM user_capability_overrides WHERE user_id = $1`, [userId]).catch(() => {});
      await query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => {});
    }
    if (companyIds.length) {
      await query(`DELETE FROM companies WHERE id = ANY($1::bigint[])`, [companyIds]).catch(() => {});
    }
    await closeRateLimitRedis().catch(() => {});
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/** DTOV proof — signup and password activation preserve membership parity. */
import assert from 'node:assert/strict';
import { pool, query } from '../../lib/db.js';
import { closeRateLimitRedis } from '../../lib/rate-limit.js';
import {
  createSelfServiceSignupIdentity,
  SELF_SERVICE_COMPANY_ACTION,
} from '../../lib/self-service-signup.js';
import { completePasswordSetup, hashUnusablePassword, issuePasswordSetupInvite } from '../../lib/user-password-invite.js';

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `membership-signup-${suffix}@dtov.test`;
  let userId = null;
  let companyId = null;

  try {
    const created = await createSelfServiceSignupIdentity({
      companyAction: SELF_SERVICE_COMPANY_ACTION.CREATE,
      companyName: `DTOV Signup Membership ${suffix}`,
      companySlug: `dtov-signup-membership-${suffix}`,
      email,
      passwordHash: await hashUnusablePassword(),
      locale: 'pt-BR',
      signupMetadata: {
        companyName: `DTOV Signup Membership ${suffix}`,
        fullName: 'DTOV Membership Owner',
      },
    });
    userId = created.userId;
    companyId = created.companyId;
    const issued = await issuePasswordSetupInvite(userId, {
      appUrl: 'http://127.0.0.1:3210',
      locale: 'pt-BR',
      purpose: 'invite',
    });
    assert.equal(issued.ok, true);

    const pending = await query(
      `SELECT
         u.id AS "userId",
         u.company_id AS "companyId",
         u.role AS "userRole",
         u.active AS "userActive",
         u.password_setup_token AS "setupToken",
         m.role AS "membershipRole",
         m.active AS "membershipActive",
         m.deleted AS "membershipDeleted"
       FROM users u
       JOIN user_company_memberships m
         ON m.user_id = u.id AND m.company_id = u.company_id
       WHERE LOWER(u.email) = $1`,
      [email]
    );
    assert.equal(pending.rowCount, 1);
    const row = pending.rows[0];
    assert.equal(row.userRole, 'direction');
    assert.equal(row.membershipRole, row.userRole);
    assert.equal(row.userActive, false);
    assert.equal(row.membershipActive, false);
    assert.equal(row.membershipDeleted, false);
    assert.ok(String(row.setupToken).length >= 16);

    const activated = await completePasswordSetup(row.setupToken, 'MembershipSignup!2026');
    assert.deepEqual(activated, { ok: true, userId: Number(userId) });

    const active = await query(
      `SELECT u.active AS "userActive", u.signup_pending AS "signupPending",
              m.active AS "membershipActive", m.deleted AS "membershipDeleted"
       FROM users u
       JOIN user_company_memberships m
         ON m.user_id = u.id AND m.company_id = u.company_id
       WHERE u.id = $1`,
      [userId]
    );
    assert.equal(active.rowCount, 1);
    assert.deepEqual(active.rows[0], {
      userActive: true,
      signupPending: false,
      membershipActive: true,
      membershipDeleted: false,
    });
  } finally {
    if (userId) await query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => {});
    if (companyId) await query(`DELETE FROM companies WHERE id = $1`, [companyId]).catch(() => {});
    await closeRateLimitRedis().catch(() => {});
    await pool.end().catch(() => {});
  }

  console.log('user-company-membership-signup.dtov.test.js OK');
}

/**
 * DTOV: a manager changing a collaborator's corporate e-mail must not hand over the portal.
 * Old password + setup link are cleared, sessions are revoked, and the invite goes to the new address.
 * Run with SMTP_MOCK=1.
 */
import assert from 'node:assert/strict';
import { pool, query, withTransaction } from '../../lib/db.js';
import { __getMailMockLog, __resetMailMockLog } from '../../lib/mail.js';
import {
  finishEmployeeEmailChange,
  loginEmployeeWithPassword,
  revokeEmployeeAccessForEmailChange,
} from '../../lib/employee-auth.js';
import { isEmployeeSessionVersionCurrent } from '../../lib/employee-session-revocation.js';
import { closeRateLimitRedis } from '../../lib/rate-limit.js';

const DEMO_EMAIL = 'colaborador@todos-os-dados.demo';
const DEMO_PASSWORD = 'DemoTodosDados!2026';

async function main() {
  assert.equal(process.env.SMTP_MOCK, '1', 'run with SMTP_MOCK=1');
  const row = await query(
    `SELECT id, company_id AS "companyId", password_hash AS "passwordHash",
            COALESCE(session_version, 1) AS "sessionVersion"
     FROM candidates WHERE email = $1 LIMIT 1`,
    [DEMO_EMAIL]
  );
  assert.ok(row.rowCount, 'demo collaborator missing; run dtov:reset');
  const { id: candidateId, companyId, passwordHash } = row.rows[0];
  const oldSv = Number(row.rows[0].sessionVersion);
  assert.ok(passwordHash, 'demo collaborator should have a password');

  const before = await loginEmployeeWithPassword(query, { email: DEMO_EMAIL, password: DEMO_PASSWORD, companyId });
  assert.equal(before.ok, true, 'login works before the change');

  const newEmail = `dtov-emp-moved-${Date.now()}@example.com`;
  try {
    __resetMailMockLog();
    const revoked = await withTransaction(async (db) => {
      await db.query(`UPDATE candidates SET email = $2 WHERE id = $1`, [candidateId, newEmail]);
      return revokeEmployeeAccessForEmailChange(db, { candidateId, companyId });
    });
    assert.equal(revoked.hadPortalAccess, true);
    assert.equal(revoked.sessionVersion, oldSv + 1);

    const reset = await finishEmployeeEmailChange(query, { candidateId, companyId, revoked, locale: 'pt-BR' });
    assert.deepEqual({ ...reset }, { inviteSent: true });
    assert.ok(__getMailMockLog().some((m) => m.to === newEmail), 'invite goes to the new address');
    assert.ok(!__getMailMockLog().some((m) => m.to === DEMO_EMAIL), 'nothing sent to the old address');

    const after = await query(
      `SELECT password_hash IS NULL AS "noPassword", password_setup_token IS NOT NULL AS "pendingInvite"
       FROM candidates WHERE id = $1`,
      [candidateId]
    );
    assert.equal(after.rows[0].noPassword, true, 'old password cleared');
    assert.equal(after.rows[0].pendingInvite, true, 'fresh invite token for the new address');

    const oldLogin = await loginEmployeeWithPassword(query, { email: newEmail, password: DEMO_PASSWORD, companyId });
    assert.equal(oldLogin.ok, false, 'old password no longer works on the new e-mail');
    assert.equal(await isEmployeeSessionVersionCurrent(candidateId, companyId, oldSv), false, 'open sessions revoked');

    const noAccess = await withTransaction((db) => revokeEmployeeAccessForEmailChange(db, { candidateId, companyId }));
    await query(`UPDATE candidates SET password_setup_token = NULL WHERE id = $1`, [candidateId]);
    const again = await withTransaction((db) => revokeEmployeeAccessForEmailChange(db, { candidateId, companyId }));
    assert.equal(noAccess.hadPortalAccess, true, 'pending invite counts as access');
    assert.equal(again.hadPortalAccess, false);
    assert.equal(await finishEmployeeEmailChange(query, { candidateId, companyId, revoked: again }), null, 'no invite without prior access');
  } finally {
    await query(
      `UPDATE candidates SET email = $2, password_hash = $3, password_setup_token = NULL, password_setup_expires_at = NULL
       WHERE id = $1`,
      [candidateId, DEMO_EMAIL, passwordHash]
    );
  }

  console.log('employee-email-change-access.dtov.test.js OK');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRateLimitRedis().catch(() => {});
    await pool.end().catch(() => {});
  });

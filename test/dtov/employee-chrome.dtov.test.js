/**
 * DTOV — employee profile + notifications smoke.
 */
import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import { EMPLOYMENT_STATUS } from '../../lib/domain-status.js';
import {
  changeEmployeePassword,
  getEmployeeProfile,
  updateEmployeeProfile,
} from '../../lib/employee-profile.js';
import {
  EMPLOYEE_NOTIF,
  listCandidateNotifications,
  notifyCandidate,
} from '../../lib/employee-notifications.js';
import {
  completeEmployeePasswordSetup,
  issueEmployeePasswordInvite,
} from '../../lib/employee-auth.js';

async function main() {
  const emp = await query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.email
     FROM candidates c
     WHERE c.employment_status = $1 AND c.email IS NOT NULL AND TRIM(c.email) <> ''
     ORDER BY c.id ASC LIMIT 1`,
    [EMPLOYMENT_STATUS.EMPLOYEE]
  );
  assert.ok(emp.rowCount > 0);
  const person = emp.rows[0];

  await issueEmployeePasswordInvite(query, {
    candidateId: person.candidateId,
    companyId: person.companyId,
    requireMail: false,
  });
  const tok = await query(
    `SELECT password_setup_token AS token FROM candidates WHERE id = $1`,
    [person.candidateId]
  );
  await completeEmployeePasswordSetup(query, {
    token: tok.rows[0].token,
    password: 'ColabChrome!2026',
  });

  const profile = await getEmployeeProfile(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
  });
  assert.equal(profile.ok, true);

  const updated = await updateEmployeeProfile(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    patch: { phone: '11999990000', city: 'São Paulo', state: 'SP' },
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.person.city, 'São Paulo');

  const pwd = await changeEmployeePassword(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    currentPassword: 'ColabChrome!2026',
    newPassword: 'ColabChrome!2027',
  });
  assert.equal(pwd.ok, true);

  const n = await notifyCandidate(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    type: EMPLOYEE_NOTIF.LMS_ENROLLED,
    payload: { courseTitle: 'DTOV Course' },
    dedupeKey: `dtov-lms:${person.candidateId}`,
  });
  assert.ok(n.inserted >= 1);

  const list = await listCandidateNotifications(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
  });
  assert.equal(list.ok, true);
  assert.ok(list.unreadCount >= 1);

  console.log('employee-chrome.dtov.test.js OK');
  await pool.end().catch(() => {});
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

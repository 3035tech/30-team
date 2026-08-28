/**
 * DTOV proof — password invite + login + employee home (PDI/LMS).
 * Requires DTOV env (POSTGRES_* from dtov:reset).
 */
import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import { EMPLOYMENT_STATUS } from '../../lib/domain-status.js';
import {
  completeEmployeePasswordSetup,
  consumeEmployeeMagicToken,
  generateEmployeeMagicToken,
  issueEmployeePasswordInvite,
  loginEmployeeWithPassword,
  peekEmployeePasswordSetupToken,
  signEmployeeToken,
  verifyEmployeeToken,
} from '../../lib/employee-auth.js';
import { getEmployeeHome } from '../../lib/employee-home.js';
import { completeLmsLesson, createLmsCourse, createLmsLesson, enrollLmsCandidates } from '../../lib/lms.js';

async function main() {
  const emp = await query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId", c.email, c.full_name AS "fullName"
     FROM candidates c
     JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
     WHERE c.employment_status = $1
       AND c.email IS NOT NULL AND TRIM(c.email) <> ''
     ORDER BY c.id ASC
     LIMIT 1`,
    [EMPLOYMENT_STATUS.EMPLOYEE]
  );
  assert.ok(emp.rowCount > 0, 'need at least one employee in DTOV seed');
  const person = emp.rows[0];

  const invited = await issueEmployeePasswordInvite(query, {
    candidateId: person.candidateId,
    companyId: person.companyId,
    requireMail: false,
    returnUrl: true,
  });
  assert.equal(invited.ok, true, invited.errorCode);
  assert.ok(invited.setupUrl?.includes('/colaborador/cadastrar-senha'));

  const tokRow = await query(
    `SELECT password_setup_token AS token FROM candidates WHERE id = $1 AND company_id = $2`,
    [person.candidateId, person.companyId]
  );
  const setupToken = tokRow.rows[0].token;
  assert.ok(setupToken);

  const peek = await peekEmployeePasswordSetupToken(query, setupToken);
  assert.equal(peek.ok, true);

  const completed = await completeEmployeePasswordSetup(query, {
    token: setupToken,
    password: 'ColabTest!2026',
  });
  assert.equal(completed.ok, true, completed.errorCode);

  const login = await loginEmployeeWithPassword(query, {
    email: person.email,
    password: 'ColabTest!2026',
    companyId: person.companyId,
  });
  assert.equal(login.ok, true, login.errorCode);
  assert.equal(login.candidateId, person.candidateId);

  const bad = await loginEmployeeWithPassword(query, {
    email: person.email,
    password: 'wrong-password',
    companyId: person.companyId,
  });
  assert.equal(bad.ok, false);

  const magic = generateEmployeeMagicToken();
  await query(
    `INSERT INTO employee_login_tokens (company_id, candidate_id, token, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
    [person.companyId, person.candidateId, magic]
  );
  const consumed = await consumeEmployeeMagicToken(query, { token: magic });
  assert.equal(consumed.ok, true);

  const jwt = signEmployeeToken({
    candidateId: person.candidateId,
    companyId: person.companyId,
    email: person.email,
  });
  assert.ok(verifyEmployeeToken(jwt));

  const course = await createLmsCourse(query, {
    companyId: person.companyId,
    title: `DTOV Emp ${Date.now()}`,
    createdByUserId: null,
  });
  assert.equal(course.ok, true, course.errorCode);
  const lesson = await createLmsLesson(query, {
    companyId: person.companyId,
    courseId: course.course.id,
    title: 'Lesson 1',
    contentUrl: 'https://example.com/lesson',
  });
  assert.equal(lesson.ok, true, lesson.errorCode);
  const enrolled = await enrollLmsCandidates(query, {
    companyId: person.companyId,
    courseId: course.course.id,
    candidateIds: [person.candidateId],
    dueDate: '2099-01-15',
    mandatory: true,
  });
  assert.equal(enrolled.ok, true, enrolled.errorCode);

  const home = await getEmployeeHome(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    locale: 'pt-BR',
  });
  assert.equal(home.ok, true);
  assert.ok(Array.isArray(home.plans));
  assert.ok(Array.isArray(home.courses));
  assert.ok(home.company);
  assert.ok(home.courses.some((c) => c.courseId === course.course.id));

  const marked = await completeLmsLesson(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    lessonId: lesson.lesson.id,
  });
  assert.equal(marked.ok, true);

  console.log('employee-home.dtov.test.js OK');
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

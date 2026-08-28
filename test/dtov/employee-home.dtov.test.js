/**
 * DTOV proof — password invite + login + employee home (PDI/LMS).
 * Requires DTOV env (POSTGRES_* from dtov:reset).
 */
import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import { EMPLOYMENT_STATUS, DEVELOPMENT_PLAN_ITEM_STATUS, DEVELOPMENT_PLAN_STATUS } from '../../lib/domain-status.js';
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
import {
  employeeAckOnboardingItem,
  getEmployeeOnboardingJourney,
} from '../../lib/people/employee-onboarding-journey.js';
import { setPreOnboardingMeetUrl } from '../../lib/people/pre-onboarding.js';
import { updateEmployeePdiItemStatus } from '../../lib/employee-pdi.js';
import {
  EMPLOYEE_NOTIF,
  notifyCandidate,
  listCandidateNotifications,
} from '../../lib/employee-notifications.js';
import {
  addDevelopmentPlanItem,
  createDevelopmentPlan,
} from '../../lib/people/development-plans.js';
import {
  completeLmsLesson,
  createLmsCourse,
  createLmsLesson,
  enrollLmsCandidates,
  lmsEmbedUrl,
} from '../../lib/lms.js';

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
    contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    contentKind: 'youtube',
  });
  assert.equal(lesson.ok, true, lesson.errorCode);
  assert.ok(lmsEmbedUrl(lesson.lesson.contentUrl, 'youtube')?.includes('embed/'));

  const enrolled = await enrollLmsCandidates(query, {
    companyId: person.companyId,
    courseId: course.course.id,
    candidateIds: [person.candidateId],
    dueDate: '2099-01-15',
    mandatory: true,
  });
  assert.equal(enrolled.ok, true, enrolled.errorCode);

  const plan = await createDevelopmentPlan(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    title: `DTOV PDI ${Date.now()}`,
    status: DEVELOPMENT_PLAN_STATUS.ACTIVE,
  });
  assert.equal(plan.ok, true, plan.errorCode);
  const item = await addDevelopmentPlanItem(query, {
    companyId: person.companyId,
    planId: plan.plan.id,
    candidateId: person.candidateId,
    title: 'DTOV item',
    status: DEVELOPMENT_PLAN_ITEM_STATUS.TODO,
  });
  assert.equal(item.ok, true, item.errorCode);

  const pdiNotif = await notifyCandidate(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    type: EMPLOYEE_NOTIF.PDI_UPDATED,
    payload: { planTitle: plan.plan.title, planId: plan.plan.id },
    dedupeKey: `dtov-pdi:${plan.plan.id}`,
  });
  assert.ok(pdiNotif.inserted >= 1);

  const motNotif = await notifyCandidate(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    type: EMPLOYEE_NOTIF.MOTIVATORS_INVITE,
    payload: { assessmentUrl: 'https://example.com/assessment/motivators/x' },
    dedupeKey: `dtov-mot:${person.candidateId}`,
  });
  assert.ok(motNotif.inserted >= 1);

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
  const ytCourse = home.courses.find((c) => c.courseId === course.course.id);
  assert.ok(ytCourse.lessons?.some((l) => l.embedUrl && l.embedUrl.includes('youtube.com/embed')));
  assert.ok(home.plans.some((p) => p.id === plan.plan.id));

  const journey = await getEmployeeOnboardingJourney(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
  });
  assert.equal(journey.ok, true, journey.errorCode);
  assert.equal(journey.hasJourney, true);
  assert.ok(journey.preItems.length >= 3);
  assert.ok(journey.checkins.length >= 3);

  const kit = journey.preItems.find((i) => i.itemKey === 'welcome_kit');
  assert.ok(kit?.id);
  const ack = await employeeAckOnboardingItem(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    kind: 'pre',
    itemId: kit.id,
  });
  assert.equal(ack.ok, true);

  const rhCall = journey.preItems.find((i) => i.itemKey === 'rh_onboarding_call');
  assert.ok(rhCall?.id);
  const meet = await setPreOnboardingMeetUrl(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    itemId: rhCall.id,
    meetUrl: 'https://meet.google.com/dtov-test',
  });
  assert.equal(meet.ok, true);
  assert.equal(meet.item.meetUrl, 'https://meet.google.com/dtov-test');

  const home2 = await getEmployeeHome(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    locale: 'pt-BR',
  });
  assert.equal(home2.ok, true);
  assert.ok(home2.journey?.preItems?.some((i) => i.meetUrl?.includes('meet.google.com')));
  assert.ok(home2.tasks.some((t) => t.kind === 'onboarding_pre' || t.kind === 'onboarding_checkin'));

  const pdiDone = await updateEmployeePdiItemStatus(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    itemId: item.item.id,
    status: DEVELOPMENT_PLAN_ITEM_STATUS.DONE,
  });
  assert.equal(pdiDone.ok, true, pdiDone.errorCode);
  assert.equal(pdiDone.item.status, DEVELOPMENT_PLAN_ITEM_STATUS.DONE);

  const marked = await completeLmsLesson(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    lessonId: lesson.lesson.id,
  });
  assert.equal(marked.ok, true);

  const notifs = await listCandidateNotifications(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
  });
  assert.equal(notifs.ok, true);
  assert.ok(notifs.unreadCount >= 2);

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

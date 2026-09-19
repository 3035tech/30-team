import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import { createFeedbackRequest, answerFeedbackRequest, listFeedbackForSubject, listFeedbackInbox } from '../../lib/people/continuous-feedback.js';

async function main() {
  const people = await query(`SELECT id, company_id AS "companyId" FROM candidates WHERE employment_status = 'employee' ORDER BY company_id, id`);
  const first = people.rows.find((person) => people.rows.some((other) => other.companyId === person.companyId && other.id !== person.id));
  const second = people.rows.find((person) => person.companyId === first?.companyId && person.id !== first.id);
  assert.ok(first && second, 'two employees in one tenant required');
  const created = await createFeedbackRequest(null, { companyId: first.companyId, fromCandidateId: first.id, toCandidateId: second.id, subjectCandidateId: first.id, prompt: 'DTOV mobile feedback' });
  assert.equal(created.ok, true);
  const inbox = await listFeedbackInbox(null, { companyId: first.companyId, toCandidateId: second.id, status: 'pending' });
  assert.ok(inbox.items.some((item) => item.id === created.request.id));
  const denied = await answerFeedbackRequest(null, { token: created.request.token, responseText: 'Resposta indevida', answeredByCandidateId: first.id });
  assert.equal(denied.ok, false);
  const answered = await answerFeedbackRequest(null, { token: created.request.token, responseText: 'Resposta válida para o colega.', answeredByCandidateId: second.id });
  assert.equal(answered.ok, true);
  const own = await listFeedbackForSubject(null, { companyId: first.companyId, subjectCandidateId: first.id });
  assert.ok(own.items.some((item) => item.id === created.request.id && item.status === 'answered'));
  console.log('mobile-employee-feedback.dtov.test.js OK');
  await pool.end();
}

main().catch(async (error) => { console.error(error); await pool.end().catch(() => {}); process.exit(1); });

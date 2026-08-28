/**
 * DTOV — internal compensation timeline (employee_compensation_events).
 */
import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import { EMPLOYMENT_STATUS, COMPENSATION_EVENT_TYPE } from '../../lib/domain-status.js';
import {
  createCompensationEvent,
  deleteCompensationEvent,
  listCompensationEvents,
  updateCompensationEvent,
} from '../../lib/people/employee-compensation.js';

async function main() {
  const emp = await query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId"
     FROM candidates c
     WHERE c.employment_status = $1
     ORDER BY c.id ASC LIMIT 1`,
    [EMPLOYMENT_STATUS.EMPLOYEE]
  );
  assert.ok(emp.rowCount > 0, 'need employee in DTOV seed');
  const person = emp.rows[0];

  const hire = await createCompensationEvent(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    eventType: COMPENSATION_EVENT_TYPE.HIRE,
    amount: '5500.00',
    effectiveDate: '2024-01-15',
    notes: 'DTOV hire',
  });
  assert.equal(hire.ok, true, hire.errorCode);

  const raise = await createCompensationEvent(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    eventType: COMPENSATION_EVENT_TYPE.RAISE,
    amount: '6200.00',
    effectiveDate: '2025-06-01',
    notes: 'DTOV raise',
  });
  assert.equal(raise.ok, true, raise.errorCode);

  const list = await listCompensationEvents(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
  });
  assert.equal(list.ok, true);
  assert.equal(list.items.length, 2);
  assert.equal(list.current.amount, '6200.00');

  const upd = await updateCompensationEvent(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    eventId: raise.event.id,
    notes: 'DTOV raise updated',
  });
  assert.equal(upd.ok, true);
  assert.equal(upd.event.notes, 'DTOV raise updated');

  const del = await deleteCompensationEvent(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
    eventId: hire.event.id,
  });
  assert.equal(del.ok, true);

  const after = await listCompensationEvents(query, {
    companyId: person.companyId,
    candidateId: person.candidateId,
  });
  assert.equal(after.items.length, 1);
  assert.equal(after.current.amount, '6200.00');

  console.log('employee-compensation.dtov.test.js OK');
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

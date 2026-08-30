/**
 * DTOV proof — light DP profile, documents, leave, calendar pulse.
 */
import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import {
  DP_DOCUMENT_STATUS,
  DP_LEAVE_STATUS,
  DP_LEAVE_TYPE,
  EMPLOYMENT_STATUS,
} from '../../lib/domain-status.js';
import {
  createLeaveRequest,
  ensureDpDocuments,
  getDpAttentionPulse,
  getDpProfile,
  listLeaveCalendar,
  listLeaveRequests,
  parseLeaveListParams,
  updateDpDocument,
  updateLeaveRequest,
  upsertDpProfile,
} from '../../lib/people/employee-dp.js';

async function main() {
  const parsed = parseLeaveListParams({
    page: '2',
    pageSize: '10',
    status: 'requested',
    leaveType: 'vacation',
    q: 'ana',
  });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 10);
  assert.equal(parsed.status, 'requested');
  assert.equal(parsed.leaveType, 'vacation');
  assert.equal(parsed.q, 'ana');

  const emp = await query(
    `SELECT c.id AS "candidateId", c.company_id AS "companyId"
     FROM candidates c
     WHERE c.employment_status = $1
       AND c.email ILIKE '%@todos-os-dados.demo'
     ORDER BY c.id ASC
     LIMIT 1`,
    [EMPLOYMENT_STATUS.EMPLOYEE]
  );
  assert.ok(emp.rowCount > 0, 'need demo employee candidate');
  const { candidateId, companyId } = emp.rows[0];

  const hr = await query(
    `SELECT u.id AS "userId"
     FROM users u
     WHERE u.email = 'hr@todos-os-dados.demo' AND u.deleted = FALSE
     LIMIT 1`
  );
  assert.ok(hr.rowCount > 0, 'need demo HR user');
  const userId = hr.rows[0].userId;

  const ensured = await ensureDpDocuments({ query }, { companyId, candidateId });
  assert.equal(ensured.ok, true, ensured.errorCode);

  const profile = await upsertDpProfile({ query }, {
    companyId,
    candidateId,
    emergencyName: 'DTOV Contato',
    emergencyPhone: '11999990000',
    emergencyRelation: 'cônjuge',
    addressLine: 'Rua Teste 1',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressPostal: '01001000',
    internalNotes: 'nota dtov',
    userId,
  });
  assert.equal(profile.ok, true, profile.errorCode);

  const loaded = await getDpProfile({ query }, { companyId, candidateId });
  assert.equal(loaded.ok, true);
  assert.equal(loaded.profile.emergencyName, 'DTOV Contato');

  const doc = await updateDpDocument({ query }, {
    companyId,
    candidateId,
    docKey: 'id_document',
    status: DP_DOCUMENT_STATUS.RECEIVED,
    notes: 'ok dtov',
    userId,
  });
  assert.equal(doc.ok, true, doc.errorCode);
  assert.equal(doc.item.status, DP_DOCUMENT_STATUS.RECEIVED);

  const leave = await createLeaveRequest({ query }, {
    companyId,
    candidateId,
    leaveType: DP_LEAVE_TYPE.VACATION,
    startsOn: '2030-01-10',
    endsOn: '2030-01-20',
    reason: 'DTOV leave',
    requestedBy: 'employee',
  });
  assert.equal(leave.ok, true, leave.errorCode);
  assert.equal(leave.item.status, DP_LEAVE_STATUS.REQUESTED);

  const listed = await listLeaveRequests({ query }, {
    companyId,
    status: DP_LEAVE_STATUS.REQUESTED,
    page: 1,
    pageSize: 20,
  });
  assert.ok(listed.items.some((r) => r.id === leave.item.id));

  const decided = await updateLeaveRequest({ query }, {
    id: leave.item.id,
    companyId,
    status: DP_LEAVE_STATUS.APPROVED,
    managerNotes: 'ok',
    userId,
  });
  assert.equal(decided.ok, true, decided.errorCode);
  assert.equal(decided.item.status, DP_LEAVE_STATUS.APPROVED);

  const cal = await listLeaveCalendar({ query }, {
    companyId,
    from: '2030-01-01',
    to: '2030-01-31',
  });
  assert.ok(cal.items.some((r) => r.id === leave.item.id));

  const pulse = await getDpAttentionPulse({ query }, { companyId });
  assert.ok(Array.isArray(pulse.pendingDocs));
  assert.ok(Array.isArray(pulse.leaves));

  console.log('employee-dp.dtov.test.js OK');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {
      /* ignore */
    }
  });
